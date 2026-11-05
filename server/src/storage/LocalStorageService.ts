import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IStorageService, UploadResult } from './types';
import { logger } from '../utils/logger';

export class LocalStorageService implements IStorageService {
  private uploadDir: string;
  private baseUrl: string;

  constructor(uploadDir?: string, baseUrl?: string) {
    this.uploadDir = uploadDir || path.resolve(__dirname, '../../uploads');
    this.baseUrl = baseUrl || '/uploads';

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      logger.info(`Created local uploads directory at: ${this.uploadDir}`);
    }

    if (process.env.NODE_ENV === 'production') {
      logger.warn('LocalStorageService running in production mode. Local container disk is ephemeral; configure Supabase or S3 for persistent cloud media.');
    }
  }

  async upload(buffer: Buffer, _originalFilename: string, mimeType: string): Promise<UploadResult> {
    const ext = this.getExtensionFromMime(mimeType);
    const key = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
    const filePath = path.join(this.uploadDir, key);

    await fs.promises.writeFile(filePath, buffer);

    return {
      url: `${this.baseUrl}/${key}`,
      key,
      mimeType,
      size: buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      logger.debug(`Deleted local file: ${key}`);
    }
  }

  /**
   * Delete ephemeral media files older than maxAgeMs (default 2 hours).
   * Prevents local disk exhaustion on container runs.
   */
  async cleanOlderThan(maxAgeMs = 2 * 60 * 60 * 1000): Promise<number> {
    try {
      if (!fs.existsSync(this.uploadDir)) return 0;
      const files = await fs.promises.readdir(this.uploadDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        if (file === '.gitkeep') continue;
        const filePath = path.join(this.uploadDir, file);
        try {
          const stats = await fs.promises.stat(filePath);
          if (now - stats.mtimeMs > maxAgeMs) {
            await fs.promises.unlink(filePath);
            deletedCount++;
          }
        } catch {
          // File might have already been deleted
        }
      }

      if (deletedCount > 0) {
        logger.info(`LocalStorageService: Pruned ${deletedCount} ephemeral media files older than ${maxAgeMs / 3600000}h`);
      }
      return deletedCount;
    } catch (err) {
      logger.error('Error during LocalStorageService cleanOlderThan:', err);
      return 0;
    }
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  private getExtensionFromMime(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'audio/webm':
        return '.webm';
      case 'audio/ogg':
        return '.ogg';
      case 'audio/mp4':
      case 'audio/m4a':
        return '.m4a';
      case 'audio/wav':
        return '.wav';
      default:
        return '.bin';
    }
  }
}
