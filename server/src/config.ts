import dotenv from 'dotenv';
dotenv.config();

export const config = {
  siteName: process.env.SITE_NAME || 'Omii',
  fullTitle: process.env.FULL_TITLE || 'Omii: Stranger Chat',
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin',
  adminSecret: process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || 'admin',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'omii-super-secret-key-change-in-production',
  maxUploadBytes: 2 * 1024 * 1024, // 2 MB upload limit
  maxAudioBytes: 5 * 1024 * 1024, // 5 MB voice note limit (30 seconds)
} as const;

export function extractClientIp(headers: Record<string, string | string[] | undefined>, fallback = 'unknown'): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]).trim();
  }
  return fallback;
}


