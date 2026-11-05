import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return result;
}

/**
 * Generate or retrieve an existing 24-hour reconnect code for two chat partners.
 */
export async function createOrGetReconnectCode(params: {
  user1Sid: string;
  user1Nick: string;
  user2Sid: string;
  user2Nick: string;
}): Promise<{ code: string; expiresAt: Date }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  // Check if an unexpired code already exists between these two sessions
  const existing = await prisma.reconnectCode.findFirst({
    where: {
      OR: [
        { user1Sid: params.user1Sid, user2Sid: params.user2Sid },
        { user1Sid: params.user2Sid, user2Sid: params.user1Sid },
      ],
      expiresAt: { gt: now },
      isUsed: false,
    },
  });

  if (existing) {
    return { code: existing.code, expiresAt: existing.expiresAt };
  }

  // Generate unique code
  let code = generateCode();
  let attempts = 0;
  while (attempts < 5) {
    const collision = await prisma.reconnectCode.findUnique({ where: { code } });
    if (!collision) break;
    code = generateCode();
    attempts++;
  }

  const record = await prisma.reconnectCode.create({
    data: {
      code,
      user1Sid: params.user1Sid,
      user1Nick: params.user1Nick,
      user2Sid: params.user2Sid,
      user2Nick: params.user2Nick,
      expiresAt,
    },
  });

  logger.info(`Reconnect code generated: ${code} for [${params.user1Sid}] and [${params.user2Sid}]`);
  return { code: record.code, expiresAt: record.expiresAt };
}

/**
 * Verify and consume a reconnect code.
 */
export async function verifyReconnectCode(code: string, currentSid: string) {
  const cleanCode = code.trim().toUpperCase();
  const record = await prisma.reconnectCode.findUnique({
    where: { code: cleanCode },
  });

  if (!record) {
    throw new Error('Invalid reconnect code. Check code and try again.');
  }

  if (record.expiresAt < new Date()) {
    throw new Error('This reconnect code has expired (24 hours limit).');
  }

  // Ensure current user is one of the original participants
  const isParticipant = record.user1Sid === currentSid || record.user2Sid === currentSid;
  if (!isParticipant) {
    throw new Error('Unauthorized: you were not a participant in this conversation.');
  }

  // Determine partner details
  let partnerSid = record.user2Sid;
  let partnerNick = record.user2Nick;

  if (record.user2Sid === currentSid) {
    partnerSid = record.user1Sid;
    partnerNick = record.user1Nick;
  }

  return {
    code: record.code,
    user1Sid: record.user1Sid,
    user1Nick: record.user1Nick,
    user2Sid: record.user2Sid,
    user2Nick: record.user2Nick,
    partnerSid,
    partnerNick,
    expiresAt: record.expiresAt,
  };
}

/**
 * Periodically deletes expired reconnect codes from the database
 */
export async function cleanExpiredReconnectCodes(): Promise<number> {
  try {
    const result = await prisma.reconnectCode.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    if (result.count > 0) {
      logger.info(`reconnectService: Cleaned ${result.count} expired reconnect codes`);
    }
    return result.count;
  } catch (err) {
    logger.error('Failed to clean expired reconnect codes:', err);
    return 0;
  }
}
