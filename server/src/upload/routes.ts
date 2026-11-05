import { Router, Request, Response } from 'express';
import multer from 'multer';
import { CloudStorageService } from '../storage/CloudStorageService';
import { moderateImage } from '../storage/imageModeration';
import { logger } from '../utils/logger';

const router = Router();
const storage = new CloudStorageService();

// Maximum multer body size cap (5 MB for images)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB cap for images
const MAX_AUDIO_SIZE = 2 * 1024 * 1024; // 2 MB cap for voice notes

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

interface DetectedMedia {
  category: 'image' | 'audio';
  mimeType: string;
}

/**
 * Validates the actual magic bytes of the file buffer (first 12 bytes).
 * Never trusts req.file.mimetype or client-provided filename extensions alone.
 */
function detectMediaFromMagicBytes(buffer: Buffer): DetectedMedia | null {
  if (!buffer || buffer.length < 12) return null;

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { category: 'image', mimeType: 'image/jpeg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { category: 'image', mimeType: 'image/png' };
  }

  // 3. WebP: RIFF .... WEBP
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { category: 'image', mimeType: 'image/webp' };
  }

  // 4. OGG: OggS
  if (buffer.toString('ascii', 0, 4) === 'OggS') {
    return { category: 'audio', mimeType: 'audio/ogg' };
  }

  // 5. WebM (Matroska): 1A 45 DF A3
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { category: 'audio', mimeType: 'audio/webm' };
  }

  // 6. MP4 / M4A (ISO Base Media File Format: ....ftyp)
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    return { category: 'audio', mimeType: 'audio/mp4' };
  }

  // 7. MP3: ID3 header or sync frame (FF Ex)
  if (
    buffer.toString('ascii', 0, 3) === 'ID3' ||
    (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
  ) {
    return { category: 'audio', mimeType: 'audio/mpeg' };
  }

  // 8. WAV: RIFF .... WAVE
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return { category: 'audio', mimeType: 'audio/wav' };
  }

  return null;
}

/**
 * POST /api/upload
 * Hardened upload endpoint:
 * 1. Checks true file magic bytes (rejecting spoofed extensions, executables, HTML, SVG).
 * 2. Enforces 5 MB limit for images, 2 MB limit for voice notes.
 * 3. Runs image moderation pipeline on images before saving.
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const { buffer, originalname, size } = req.file;

    // 1. Inspect binary magic bytes
    const detected = detectMediaFromMagicBytes(buffer);
    if (!detected) {
      logger.warn(`Upload rejected: invalid or disallowed magic bytes for file ${originalname}`);
      res.status(400).json({
        error: 'Invalid file signature. Only verified JPEG, PNG, WebP, WebM, OGG, MP4/M4A, MP3, and WAV media are permitted.',
      });
      return;
    }

    const isImage = detected.category === 'image';
    const isAudio = detected.category === 'audio';

    // 2. Enforce strict category size caps
    if (isImage && size > MAX_IMAGE_SIZE) {
      res.status(400).json({
        error: `Image exceeds maximum allowed size of 5 MB (${(size / (1024 * 1024)).toFixed(2)} MB uploaded).`,
      });
      return;
    }

    if (isAudio && size > MAX_AUDIO_SIZE) {
      res.status(400).json({
        error: `Voice note exceeds maximum allowed size of 2 MB (${(size / (1024 * 1024)).toFixed(2)} MB uploaded).`,
      });
      return;
    }

    // 3. Image Moderation Pipeline
    let moderation = { approved: true, flagged: false, reason: undefined as string | undefined };
    if (isImage) {
      const modResult = await moderateImage(buffer, detected.mimeType, originalname);
      if (!modResult.approved) {
        res.status(422).json({
          error: modResult.reason || 'Image rejected by safety moderation.',
        });
        return;
      }
      moderation = {
        approved: modResult.approved,
        flagged: modResult.flagged,
        reason: modResult.reason,
      };
    }

    // 4. Store media through Cloud/Supabase storage provider
    const result = await storage.upload(buffer, originalname, detected.mimeType);
    logger.info(`Uploaded ${detected.category} (${detected.mimeType}) via ${storage.getActiveProvider()}: ${result.key} (${result.size} bytes)`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.json({
      success: true,
      url: result.url,
      key: result.key,
      type: detected.category,
      mimeType: detected.mimeType,
      size: result.size,
      provider: storage.getActiveProvider(),
      moderation,
    });
  } catch (err) {
    logger.error('Error during media upload:', err);
    res.status(500).json({ error: 'Failed to process media upload' });
  }
});

export { storage };
export default router;
