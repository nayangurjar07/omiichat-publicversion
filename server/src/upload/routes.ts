// server/src/upload/routes.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { CloudStorageService } from '../storage/CloudStorageService';

const router = Router();
export const storage = new CloudStorageService();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8 MB max
  },
});

function detectMimeFromMagicBytes(buf: Buffer): string | null {
  if (!buf || buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  // GIF: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
  // WEBP: RIFF....WEBP
  if (
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  // WEBM / OGG / WAV / MP3 / MP4 audio
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'audio/webm';
  if (buf.toString('ascii', 0, 4) === 'OggS') return 'audio/ogg';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') return 'audio/wav';
  if (buf.toString('ascii', 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  if (buf.toString('ascii', 4, 8) === 'ftyp') return 'audio/mp4';

  return null;
}

// Accept any field name ('file', 'image', 'audio') to prevent Multer field mismatch errors
const handleUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const file = req.file || (files && files[0]);

    if (!file || !file.buffer) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const detectedMime = detectMimeFromMagicBytes(file.buffer);
    if (!detectedMime) {
      res.status(400).json({ error: 'Unsupported or unsafe file format' });
      return;
    }

    let fileUrl: string | null = null;
    let fileKey: string | null = null;

    // Try primary cloud/disk storage first
    try {
      const stored = await storage.upload(file.buffer, file.originalname || 'upload.bin', detectedMime);
      if (stored?.url) {
        fileUrl = stored.url;
        fileKey = stored.key;
      }
    } catch (storageErr) {
      console.warn('[upload] Primary storage error, using base64 fallback:', storageErr);
    }

    // Convert to inline Data URL fallback if external storage failed or returned no URL
    if (!fileUrl) {
      const base64Data = file.buffer.toString('base64');
      fileUrl = `data:${detectedMime};base64,${base64Data}`;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.status(200).json({
      success: true,
      url: fileUrl,
      imageUrl: fileUrl,
      key: fileKey,
      mimeType: detectedMime,
      size: file.size,
    });
  } catch (err) {
    console.error('[upload] Error processing upload:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
};

router.post('/upload', upload.any(), handleUpload);
router.post('/', upload.any(), handleUpload);

export const uploadRoutes = router;
export default router;
