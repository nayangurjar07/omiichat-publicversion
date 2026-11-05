import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { IStorageService, UploadResult } from './types';
import { LocalStorageService } from './LocalStorageService';
import { logger } from '../utils/logger';

export class CloudStorageService implements IStorageService {
  private s3Client: S3Client | null = null;
  private s3Bucket: string | null = null;
  private s3Endpoint: string | null = null;
  private s3Region: string = 'us-east-1';

  private supabase: SupabaseClient | null = null;
  private supabaseBucket: string = 'uploads';

  private localFallback: LocalStorageService;
  private activeProvider: 's3' | 'supabase' | 'local' = 'local';

  constructor() {
    this.localFallback = new LocalStorageService();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // 1. Check for S3 / S3-Compatible platform environment variables
    const s3Bucket = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET;
    const s3AccessKey = process.env.AWS_ACCESS_KEY_ID;
    const s3SecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const s3Endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.AWS_ENDPOINT;
    const s3Region = process.env.AWS_REGION || 'us-east-1';

    if (s3Bucket && s3AccessKey && s3SecretKey) {
      try {
        this.s3Bucket = s3Bucket;
        this.s3Endpoint = s3Endpoint || null;
        this.s3Region = s3Region;

        this.s3Client = new S3Client({
          region: s3Region,
          endpoint: s3Endpoint || undefined,
          credentials: {
            accessKeyId: s3AccessKey,
            secretAccessKey: s3SecretKey,
          },
          forcePathStyle: !!s3Endpoint, // Required for custom S3-compatible endpoints / minio
        });

        this.activeProvider = 's3';
        logger.info(`CloudStorageService: Connected to S3 bucket "${s3Bucket}" (region: ${s3Region})`);
        return;
      } catch (err) {
        logger.error('Failed to initialize S3Client in CloudStorageService:', err);
      }
    }

    // 2. Check for Supabase Storage credentials
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('[YOUR-PROJECT-REF]')) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.supabaseBucket = process.env.SUPABASE_UPLOADS_BUCKET || 'uploads';
        this.activeProvider = 'supabase';
        logger.info(`CloudStorageService: Connected to Supabase Storage bucket "${this.supabaseBucket}"`);
        return;
      } catch (err) {
        logger.error('Failed to initialize Supabase storage client:', err);
      }
    }

    // 3. Fallback to local storage (ephemeral during dev)
    this.activeProvider = 'local';
    if (process.env.NODE_ENV === 'production') {
      logger.warn('CloudStorageService: Production environment detected without persistent S3 or Supabase cloud credentials. Set SUPABASE_URL or AWS_S3_BUCKET.');
    } else {
      logger.info('CloudStorageService: No S3 or Supabase cloud storage configured; using local storage fallback.');
    }
  }

  async upload(buffer: Buffer, originalFilename: string, mimeType: string): Promise<UploadResult> {
    const ext = this.getSafeExtension(mimeType);
    const key = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;

    // Priority 1: S3 Provider
    if (this.activeProvider === 's3' && this.s3Client && this.s3Bucket) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.s3Bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
          })
        );

        const url = this.formatS3Url(key);
        return {
          url,
          key,
          mimeType,
          size: buffer.length,
        };
      } catch (err) {
        logger.error('S3 upload error, falling back to local:', err);
      }
    }

    // Priority 2: Supabase Provider
    if (this.activeProvider === 'supabase' && this.supabase) {
      try {
        const { error } = await this.supabase.storage.from(this.supabaseBucket).upload(key, buffer, {
          contentType: mimeType,
          upsert: true,
        });

        if (!error) {
          const { data: pubData } = this.supabase.storage.from(this.supabaseBucket).getPublicUrl(key);
          return {
            url: pubData.publicUrl,
            key,
            mimeType,
            size: buffer.length,
          };
        }
        logger.error('Supabase upload error, falling back to local:', error.message);
      } catch (err) {
        logger.error('Supabase storage upload error:', err);
      }
    }

    // Priority 3: Local Storage Fallback
    return this.localFallback.upload(buffer, originalFilename, mimeType);
  }

  async delete(key: string): Promise<void> {
    if (this.activeProvider === 's3' && this.s3Client && this.s3Bucket) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.s3Bucket,
            Key: key,
          })
        );
        return;
      } catch (err) {
        logger.error('S3 delete error:', err);
      }
    }

    if (this.activeProvider === 'supabase' && this.supabase) {
      try {
        await this.supabase.storage.from(this.supabaseBucket).remove([key]);
        return;
      } catch (err) {
        logger.error('Supabase delete error:', err);
      }
    }

    return this.localFallback.delete(key);
  }

  /**
   * Periodically deletes ephemeral media older than maxAgeMs (default 2 hours)
   * across local storage and Supabase storage to prevent disk/quota overflow.
   */
  async cleanOlderThan(maxAgeMs = 2 * 60 * 60 * 1000): Promise<number> {
    let count = 0;
    count += await this.localFallback.cleanOlderThan(maxAgeMs);

    if (this.activeProvider === 'supabase' && this.supabase) {
      try {
        const { data: files } = await this.supabase.storage.from(this.supabaseBucket).list('', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'asc' },
        });
        if (files && files.length > 0) {
          const now = Date.now();
          const toDelete: string[] = [];
          for (const f of files) {
            if (f.created_at) {
              const fileAge = now - new Date(f.created_at).getTime();
              if (fileAge > maxAgeMs) {
                toDelete.push(f.name);
              }
            }
          }
          if (toDelete.length > 0) {
            await this.supabase.storage.from(this.supabaseBucket).remove(toDelete);
            count += toDelete.length;
            logger.info(`CloudStorageService: Pruned ${toDelete.length} expired media from Supabase bucket`);
          }
        }
      } catch (supaErr) {
        logger.error('Error during Supabase cleanOlderThan:', supaErr);
      }
    }

    return count;
  }

  getUrl(key: string): string {
    if (this.activeProvider === 's3' && this.s3Bucket) {
      return this.formatS3Url(key);
    }
    if (this.activeProvider === 'supabase' && this.supabase) {
      const { data } = this.supabase.storage.from(this.supabaseBucket).getPublicUrl(key);
      return data.publicUrl;
    }
    return this.localFallback.getUrl(key);
  }

  getUploadDir(): string {
    return this.localFallback.getUploadDir();
  }

  public getActiveProvider(): 's3' | 'supabase' | 'local' {
    return this.activeProvider;
  }

  private formatS3Url(key: string): string {
    if (this.s3Endpoint) {
      const endpoint = this.s3Endpoint.replace(/\/$/, '');
      return `${endpoint}/${this.s3Bucket}/${key}`;
    }
    return `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${key}`;
  }

  private getSafeExtension(mimeType: string): string {
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
      case 'audio/x-m4a':
      case 'audio/aac':
        return '.m4a';
      case 'audio/wav':
        return '.wav';
      default:
        return '.bin';
    }
  }
}
