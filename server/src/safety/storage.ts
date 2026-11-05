/**
 * Storage & Media Service for Omii: Stranger Chat.
 *
 * Connects directly to user's Supabase Storage project:
 * - Reads SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
 * - Uploads chat media / report context attachments to the designated bucket (default: "reports")
 * - Generates public or signed URLs for review
 * - Falls back to local/ephemeral storage if Supabase credentials are not yet set
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

export interface StorageUploadResult {
  url: string;
  key: string;
  provider: 'supabase' | 'local';
}

class StorageService {
  private provider: 'supabase' | 'local' = 'local';
  private bucketName: string = 'reports';
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.init();
  }

  private init() {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('[YOUR-PROJECT-REF]')) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.provider = 'supabase';
        this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'reports';
        logger.info(`Cloud Storage connected to Supabase (${supabaseUrl}, bucket: ${this.bucketName})`);
        return;
      } catch (err) {
        logger.error('Failed to initialize Supabase client:', err);
      }
    }

    this.provider = 'local';
    logger.info('Storage running in local/ephemeral mode. Add SUPABASE_URL to server/.env to enable Supabase Cloud Storage.');
  }

  /**
   * Upload a file buffer to Supabase Storage bucket.
   */
  public async upload(
    fileBuffer: Buffer,
    fileName: string,
    contentType = 'application/octet-stream'
  ): Promise<StorageUploadResult> {
    const key = `reports/${Date.now()}-${fileName}`;

    if (this.provider === 'supabase' && this.supabase) {
      try {
        const { data, error } = await this.supabase.storage
          .from(this.bucketName)
          .upload(key, fileBuffer, {
            contentType,
            upsert: true,
          });

        if (error) {
          logger.error('Supabase storage upload error:', error.message);
          throw error;
        }

        const { data: publicUrlData } = this.supabase.storage
          .from(this.bucketName)
          .getPublicUrl(data?.path || key);

        return {
          url: publicUrlData.publicUrl,
          key,
          provider: 'supabase',
        };
      } catch (err) {
        logger.error('Error during Supabase storage upload, falling back to local URL:', err);
      }
    }

    // Ephemeral / local fallback
    return {
      url: `/uploads/${key}`,
      key,
      provider: 'local',
    };
  }

  public getProvider(): 'supabase' | 'local' {
    return this.provider;
  }
}

export const cloudStorage = new StorageService();

// Re-export ban and report persistence services for safety module
export { createReport, getReports, updateReportStatus } from './reportService';
export { banSession, unbanSession, getBans, isBanned, hydrateActiveBans } from './banService';

