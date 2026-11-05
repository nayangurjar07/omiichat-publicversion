import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { IStorageService, UploadResult } from './types';
import { LocalStorageService } from './LocalStorageService';
import { logger } from '../utils/logger';

export class SupabaseStorageService implements IStorageService {
  private supabase: SupabaseClient | null = null;
  private bucket: string = 'uploads';
  private fallback: LocalStorageService;
  private isConfigured: boolean = false;

  constructor() {
    this.fallback = new LocalStorageService();

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('[YOUR-PROJECT-REF]')) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.bucket = process.env.SUPABASE_UPLOADS_BUCKET || 'uploads';
        this.isConfigured = true;
        logger.info(`SupabaseStorageService initialized with bucket "${this.bucket}" on ${supabaseUrl}`);
      } catch (err) {
        logger.error('Failed to initialize Supabase client in SupabaseStorageService:', err);
      }
    } else {
      logger.info('Supabase not configured; using LocalStorageService fallback.');
    }
  }

  async upload(buffer: Buffer, originalFilename: string, mimeType: string): Promise<UploadResult> {
    const ext = this.getSafeExtension(mimeType);
    const key = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;

    if (this.isConfigured && this.supabase) {
      try {
        const { error } = await this.supabase.storage.from(this.bucket).upload(key, buffer, {
          contentType: mimeType,
          upsert: true,
        });

        if (error) {
          logger.error('Supabase storage upload error, using local fallback:', error.message);
          return this.fallback.upload(buffer, originalFilename, mimeType);
        }

        const { data: publicData } = this.supabase.storage.from(this.bucket).getPublicUrl(key);

        return {
          url: publicData.publicUrl,
          key,
          mimeType,
          size: buffer.length,
        };
      } catch (err) {
        logger.error('Error uploading to Supabase Storage, using fallback:', err);
        return this.fallback.upload(buffer, originalFilename, mimeType);
      }
    }

    return this.fallback.upload(buffer, originalFilename, mimeType);
  }

  async delete(key: string): Promise<void> {
    if (this.isConfigured && this.supabase) {
      try {
        await this.supabase.storage.from(this.bucket).remove([key]);
        logger.debug(`Deleted file from Supabase storage: ${key}`);
        return;
      } catch (err) {
        logger.error('Error deleting file from Supabase:', err);
      }
    }
    return this.fallback.delete(key);
  }

  /**
   * Delete files older than maxAgeMs from Supabase storage and local fallback
   */
  async cleanOlderThan(maxAgeMs = 2 * 60 * 60 * 1000): Promise<number> {
    let count = await this.fallback.cleanOlderThan(maxAgeMs);
    if (this.isConfigured && this.supabase) {
      try {
        const { data: files } = await this.supabase.storage.from(this.bucket).list('', {
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
            await this.supabase.storage.from(this.bucket).remove(toDelete);
            count += toDelete.length;
            logger.info(`SupabaseStorageService: Pruned ${toDelete.length} expired media files`);
          }
        }
      } catch (err) {
        logger.error('Error during SupabaseStorageService cleanOlderThan:', err);
      }
    }
    return count;
  }

  getUrl(key: string): string {
    if (this.isConfigured && this.supabase) {
      const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(key);
      return data.publicUrl;
    }
    return this.fallback.getUrl(key);
  }

  getUploadDir(): string {
    return this.fallback.getUploadDir();
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
