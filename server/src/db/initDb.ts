import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { hydrateActiveBans } from '../safety/banService';

const prisma = new PrismaClient();

export async function initDatabase(): Promise<void> {
  try {
    const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgres');
    const timestampType = isPostgres ? 'TIMESTAMP(3)' : 'DATETIME';

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Report" (
        "id" TEXT NOT NULL PRIMARY KEY,
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
        "createdAt" ${timestampType} NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Ban" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionId" TEXT NOT NULL,
        "reason" TEXT NOT NULL,
        "createdAt" ${timestampType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" ${timestampType}
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT,
        "passwordHash" TEXT,
        "googleId" TEXT,
        "nickname" TEXT NOT NULL,
        "avatar" TEXT,
        "interests" TEXT,
        "bio" TEXT,
        "createdAt" ${timestampType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" ${timestampType} NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Friendship" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "friendId" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'accepted',
        "createdAt" ${timestampType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Friendship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Friendship_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ReconnectCode" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL,
        "user1Sid" TEXT NOT NULL,
        "user1Nick" TEXT NOT NULL,
        "user2Sid" TEXT,
        "user2Nick" TEXT,
        "isUsed" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" ${timestampType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" ${timestampType} NOT NULL
      );
    `);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Report_reportedSid_createdAt_idx" ON "Report"("reportedSid", "createdAt");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "Report"("status");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Report_roomId_idx" ON "Report"("roomId");`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Ban_sessionId_key" ON "Ban"("sessionId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Ban_sessionId_idx" ON "Ban"("sessionId");`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Friendship_userId_idx" ON "Friendship"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Friendship_friendId_idx" ON "Friendship"("friendId");`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Friendship_userId_friendId_key" ON "Friendship"("userId", "friendId");`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ReconnectCode_code_key" ON "ReconnectCode"("code");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ReconnectCode_code_idx" ON "ReconnectCode"("code");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ReconnectCode_user1Sid_idx" ON "ReconnectCode"("user1Sid");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ReconnectCode_user2Sid_idx" ON "ReconnectCode"("user2Sid");`);

    logger.info('Database schema verified and initialized successfully.');

    // Hydrate active bans into memory so bans survive sleep cycles and query fast
    await hydrateActiveBans();
  } catch (err) {
    logger.error('Failed to initialize database schema:', err);
  } finally {
    await prisma.$disconnect();
  }
}
