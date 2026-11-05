-- CreateTable
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Ban" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT,
    "interests" TEXT,
    "bio" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Friendship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Friendship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Friendship_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReconnectCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "user1Sid" TEXT NOT NULL,
    "user1Nick" TEXT NOT NULL,
    "user2Sid" TEXT,
    "user2Nick" TEXT,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Report_reportedSid_createdAt_idx" ON "Report"("reportedSid", "createdAt");
CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "Report"("status");
CREATE INDEX IF NOT EXISTS "Report_roomId_idx" ON "Report"("roomId");
CREATE UNIQUE INDEX IF NOT EXISTS "Ban_sessionId_key" ON "Ban"("sessionId");
CREATE INDEX IF NOT EXISTS "Ban_sessionId_idx" ON "Ban"("sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");
CREATE INDEX IF NOT EXISTS "Friendship_userId_idx" ON "Friendship"("userId");
CREATE INDEX IF NOT EXISTS "Friendship_friendId_idx" ON "Friendship"("friendId");
CREATE UNIQUE INDEX IF NOT EXISTS "Friendship_userId_friendId_key" ON "Friendship"("userId", "friendId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReconnectCode_code_key" ON "ReconnectCode"("code");
CREATE INDEX IF NOT EXISTS "ReconnectCode_code_idx" ON "ReconnectCode"("code");
CREATE INDEX IF NOT EXISTS "ReconnectCode_user1Sid_idx" ON "ReconnectCode"("user1Sid");
CREATE INDEX IF NOT EXISTS "ReconnectCode_user2Sid_idx" ON "ReconnectCode"("user2Sid");
