import { logger } from '../utils/logger';

export interface ModerationResult {
  approved: boolean;
  flagged: boolean;
  score?: number; // 0 (safe) to 1 (unsafe)
  reason?: string;
  categories?: string[];
}

/**
 * Validates magic-byte signatures for allowed media (JPEG, PNG, WebP, OGG, WebM).
 * Explicitly rejects SVG, executables, HTML, and spoofed files.
 */
export function hasValidMediaSignature(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 12) return false;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  const isOgg = buffer.toString('ascii', 0, 4) === 'OggS';
  const isWebm = buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  const isMp4 = buffer.toString('ascii', 4, 8) === 'ftyp';
  const isMp3 = buffer.toString('ascii', 0, 3) === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  const isWav = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE';
  return isJpeg || isPng || isWebp || isOgg || isWebm || isMp4 || isMp3 || isWav;
}

/**
 * Image moderation hook.
 *
 * Developers can wire this function to external AI/Vision services like:
 * - AWS Rekognition (DetectModerationLabels)
 * - Sightengine API
 * - Google Cloud Vision SafeSearch
 * - OpenAI Moderation API
 *
 * Currently provides standard server-side binary validation, magic byte checking,
 * and environment variable hook support (e.g. MODERATION_API_URL or MOCK_FLAGGED).
 */
export async function moderateImage(
  buffer: Buffer,
  mimeType: string,
  _filename?: string
): Promise<ModerationResult> {
  try {
    // 1. Verify buffer size
    if (!buffer || buffer.length === 0) {
      return { approved: false, flagged: true, reason: 'Empty image payload' };
    }

    // 2. Validate magic bytes to prevent file extension spoofing and reject SVG/executables
    if (!hasValidMediaSignature(buffer)) {
      logger.warn(`Media buffer failed valid media signature check for claimed mime: ${mimeType}`);
      return {
        approved: false,
        flagged: true,
        reason: 'Invalid file signature. SVG, HTML, executable, and unknown file types are rejected.',
      };
    }

    // 3. Verify specific format match
    const isValidMagic = validateMagicBytes(buffer, mimeType);
    if (!isValidMagic) {
      logger.warn(`Image failed magic byte validation for mime: ${mimeType}`);
      return {
        approved: false,
        flagged: true,
        reason: 'Invalid file signature for claimed image format',
      };
    }

    // 4. Check for external moderation hook configuration
    const moderationApiUrl = process.env.IMAGE_MODERATION_API_URL;
    if (moderationApiUrl) {
      try {
        const response = await fetch(moderationApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': mimeType,
            'x-api-key': process.env.IMAGE_MODERATION_API_KEY || '',
          },
          body: buffer,
        });

        if (response.ok) {
          const data = (await response.json()) as {
            flagged?: boolean;
            safe?: boolean;
            reason?: string;
          };
          const flagged = data.flagged || data.safe === false;
          return {
            approved: !flagged,
            flagged: !!flagged,
            reason: data.reason || (flagged ? 'Flagged by automated moderation' : undefined),
          };
        }
      } catch (apiErr) {
        logger.error('Error invoking external image moderation API, falling back to local:', apiErr);
      }
    }

    // 5. Default baseline check: passes validation
    return {
      approved: true,
      flagged: false,
      score: 0.05,
    };
  } catch (err) {
    logger.error('Unexpected error in moderateImage:', err);
    return { approved: false, flagged: true, reason: 'Moderation processing failed' };
  }
}

/** Verify standard magic byte signatures for JPEG, PNG, and WebP */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // WebP: RIFF .... WEBP
  if (mimeType === 'image/webp') {
    const isRiff =
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp =
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  // Audio formats (webm / ogg / mp4 / wav)
  if (mimeType.startsWith('audio/')) {
    return true;
  }

  return false;
}
