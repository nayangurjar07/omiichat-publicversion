/**
 * Report service — CRUD operations for user reports.
 * Uses Prisma to persist reports to the database.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface CreateReportInput {
  reporterSid: string;
  reportedSid: string;
  roomId?: string;
  roomName?: string;
  messageText?: string;
  mediaUrl?: string;
  reason: string;
  detail?: string;
  context: { senderId: string; text?: string; timestamp: number; senderNick?: string; mediaUrl?: string }[];
}

/** Create a new report with message context */
export async function createReport(input: CreateReportInput): Promise<void> {
  try {
    await prisma.report.create({
      data: {
        reporterSid: input.reporterSid,
        reportedSid: input.reportedSid,
        roomId: input.roomId || null,
        roomName: input.roomName || null,
        messageText: input.messageText || null,
        mediaUrl: input.mediaUrl || null,
        reason: input.reason,
        detail: input.detail || null,
        context: JSON.stringify(input.context.slice(-20)),
        status: 'pending',
      },
    });
    logger.info(
      `Report created: ${input.reporterSid} → ${input.reportedSid} (${input.reason}) ${
        input.roomId ? `in room ${input.roomId}` : ''
      }`
    );
  } catch (err) {
    logger.error('Failed to create report', err);
    throw err;
  }
}

/** Count reports filed against a session in the last N hours */
export async function countRecentReports(
  sessionId: string,
  hoursBack = 24,
): Promise<number> {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  return prisma.report.count({
    where: {
      reportedSid: sessionId,
      createdAt: { gte: since },
    },
  });
}

/** Get reports with optional status filter (for admin) */
export async function getReports(status?: string) {
  return prisma.report.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

/** Update a report's status (pending → banned | dismissed) */
export async function updateReportStatus(id: string, status: string) {
  return prisma.report.update({
    where: { id },
    data: { status },
  });
}
