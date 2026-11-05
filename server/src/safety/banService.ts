/**
 * Ban service — check, create, and auto-enforce session & IP bans.
 * Auto-bans sessions that accumulate 3+ reports within 24 hours.
 * Hydrates active bans in-memory so bans survive server sleep cycles and query instantly.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { countRecentReports } from './reportService';

const prisma = new PrismaClient();

const AUTO_BAN_THRESHOLD = 3;

// In-memory active bans storage (identifier -> expiresAt | null)
export const activeBansMemory = new Map<string, Date | null>();

/**
 * Hydrate active bans into memory from PostgreSQL via Prisma
 * Called during server bootstrap to ensure bans survive server sleep cycles.
 */
export async function hydrateActiveBans(): Promise<number> {
  try {
    const now = new Date();
    const bans = await prisma.ban.findMany({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
    });

    activeBansMemory.clear();
    for (const ban of bans) {
      activeBansMemory.set(ban.sessionId, ban.expiresAt);
    }
    logger.info(`Hydrated ${bans.length} active bans into memory from database.`);
    return bans.length;
  } catch (err) {
    logger.error('Failed to hydrate active bans from database:', err);
    return 0;
  }
}

/** Check if a session or IP is currently banned */
export async function isBanned(sessionId: string, clientIp?: string): Promise<boolean> {
  try {
    const now = new Date();

    // 1. Fast in-memory check
    if (sessionId && activeBansMemory.has(sessionId)) {
      const expires = activeBansMemory.get(sessionId);
      if (!expires || expires > now) return true;
      activeBansMemory.delete(sessionId);
    }

    if (clientIp && clientIp !== 'unknown' && activeBansMemory.has(clientIp)) {
      const expires = activeBansMemory.get(clientIp);
      if (!expires || expires > now) return true;
      activeBansMemory.delete(clientIp);
    }

    // 2. Database lookup
    const identifiers = [sessionId].filter(Boolean);
    if (clientIp && clientIp !== 'unknown' && !identifiers.includes(clientIp)) {
      identifiers.push(clientIp);
    }

    if (identifiers.length === 0) return false;

    const ban = await prisma.ban.findFirst({
      where: {
        sessionId: { in: identifiers },
      },
    });

    if (!ban) return false;

    // If the ban has an expiry and it's passed, remove it
    if (ban.expiresAt && ban.expiresAt < now) {
      await prisma.ban.delete({ where: { id: ban.id } }).catch(() => {});
      activeBansMemory.delete(ban.sessionId);
      return false;
    }

    // Cache in memory
    activeBansMemory.set(ban.sessionId, ban.expiresAt);
    return true;
  } catch (err) {
    logger.error('Error checking ban status:', err);
    return false;
  }
}

/** Ban a session or IP (upsert to handle re-banning) */
export async function banSession(
  sessionId: string,
  reason: string,
  expiresAt?: Date,
): Promise<void> {
  try {
    await prisma.ban.upsert({
      where: { sessionId },
      update: { reason, expiresAt: expiresAt || null },
      create: { sessionId, reason, expiresAt: expiresAt || null },
    });
    activeBansMemory.set(sessionId, expiresAt || null);
    logger.info(`Session banned: ${sessionId} (${reason})`);
  } catch (err) {
    logger.error('Failed to ban session', err);
    throw err;
  }
}

/** Remove a ban */
export async function unbanSession(sessionId: string): Promise<void> {
  try {
    await prisma.ban.delete({ where: { sessionId } });
    activeBansMemory.delete(sessionId);
    logger.info(`Session unbanned: ${sessionId}`);
  } catch (err) {
    // If ban doesn't exist in DB, still clear memory
    activeBansMemory.delete(sessionId);
    logger.warn(`Unban failed (may not exist): ${sessionId}`);
  }
}

/**
 * Check if a session should be auto-banned.
 * @returns true if a ban was applied
 */
export async function checkAutoBan(sessionId: string): Promise<boolean> {
  const recentCount = await countRecentReports(sessionId, 24);
  if (recentCount >= AUTO_BAN_THRESHOLD) {
    await banSession(sessionId, `Auto-banned: ${recentCount} reports in 24h`);
    return true;
  }
  return false;
}

/** Get all active bans (for admin panel) */
export async function getBans() {
  return prisma.ban.findMany({
    orderBy: { createdAt: 'desc' },
  });
}
