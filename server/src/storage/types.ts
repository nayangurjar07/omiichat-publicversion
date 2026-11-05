/**
 * Storage service abstraction for media uploads (images and voice notes).
 * Default implementation stores locally on disk; swappable with S3 or Cloudflare R2.
 */

export interface UploadResult {
  url: string;
  key: string;
  mimeType: string;
  size: number;
}

export interface IStorageService {
  upload(buffer: Buffer, originalFilename: string, mimeType: string): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
  cleanOlderThan?(maxAgeMs: number): Promise<number>;
}
