-- ============================================================================
-- OMII: SUPABASE DATABASE INITIALIZATION SCRIPT
-- Paste this script into your Supabase Dashboard -> SQL Editor and click "Run"
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create User Table
CREATE TABLE IF NOT EXISTS public."User" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email" TEXT UNIQUE,
  "passwordHash" TEXT,
  "googleId" TEXT UNIQUE,
  "nickname" TEXT NOT NULL,
  "avatar" TEXT,
  "interests" TEXT,
  "bio" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Friendship Table
CREATE TABLE IF NOT EXISTS public."Friendship" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "friendId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'accepted',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Friendship_userId_friendId_key" UNIQUE ("userId", "friendId")
);

CREATE INDEX IF NOT EXISTS "Friendship_userId_idx" ON public."Friendship"("userId");
CREATE INDEX IF NOT EXISTS "Friendship_friendId_idx" ON public."Friendship"("friendId");

-- 4. Create Report Table (Moderation)
CREATE TABLE IF NOT EXISTS public."Report" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "reporterSid" TEXT NOT NULL,
  "reportedSid" TEXT NOT NULL,
  "roomId" TEXT,
  "roomName" TEXT,
  "messageText" TEXT,
  "mediaUrl" TEXT,
  "reason" TEXT NOT NULL,
  "detail" TEXT,
  "context" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Report_reportedSid_createdAt_idx" ON public."Report"("reportedSid", "createdAt");
CREATE INDEX IF NOT EXISTS "Report_status_idx" ON public."Report"("status");
CREATE INDEX IF NOT EXISTS "Report_roomId_idx" ON public."Report"("roomId");

-- 5. Create Ban Table
CREATE TABLE IF NOT EXISTS public."Ban" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sessionId" TEXT NOT NULL UNIQUE,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "Ban_sessionId_idx" ON public."Ban"("sessionId");

-- 6. Create ReconnectCode Table (24-Hour Code Pairing)
CREATE TABLE IF NOT EXISTS public."ReconnectCode" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "code" TEXT NOT NULL UNIQUE,
  "user1Sid" TEXT NOT NULL,
  "user1Nick" TEXT NOT NULL,
  "user2Sid" TEXT,
  "user2Nick" TEXT,
  "isUsed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "ReconnectCode_code_idx" ON public."ReconnectCode"("code");
CREATE INDEX IF NOT EXISTS "ReconnectCode_user1Sid_idx" ON public."ReconnectCode"("user1Sid");
CREATE INDEX IF NOT EXISTS "ReconnectCode_user2Sid_idx" ON public."ReconnectCode"("user2Sid");

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Protects tables against direct browser access with the public anon key.
-- Full access is granted to service_role (the backend server).
-- ============================================================================

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Friendship" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Ban" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReconnectCode" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow service_role full access to User" ON public."User";
DROP POLICY IF EXISTS "Allow service_role full access to Friendship" ON public."Friendship";
DROP POLICY IF EXISTS "Allow service_role full access to Report" ON public."Report";
DROP POLICY IF EXISTS "Allow service_role full access to Ban" ON public."Ban";
DROP POLICY IF EXISTS "Allow service_role full access to ReconnectCode" ON public."ReconnectCode";

-- Create Service Role Access Policies
CREATE POLICY "Allow service_role full access to User" ON public."User"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access to Friendship" ON public."Friendship"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access to Report" ON public."Report"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access to Ban" ON public."Ban"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access to ReconnectCode" ON public."ReconnectCode"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- STORAGE BUCKETS CONFIGURATION (uploads & reports)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('uploads', 'uploads', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/aac']),
  ('reports', 'reports', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/aac'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- Storage Read Policy (Public can view media in chat)
DROP POLICY IF EXISTS "Public read for uploads bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public read for reports bucket" ON storage.objects;

CREATE POLICY "Public read for uploads bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');

CREATE POLICY "Public read for reports bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'reports');

-- Storage Upload Policy (Only backend service_role can upload)
DROP POLICY IF EXISTS "Service role upload to uploads" ON storage.objects;
DROP POLICY IF EXISTS "Service role upload to reports" ON storage.objects;

CREATE POLICY "Service role upload to uploads" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'uploads') WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Service role upload to reports" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'reports') WITH CHECK (bucket_id = 'reports');
