import { IMatchingQueue, MatchResult, QueueUser } from './types';
import { logger } from '../utils/logger';

export interface ActiveBotUser {
  socketId: string;
  sessionId: string;
  user: QueueUser;
  roomId: string;
  dropBot: () => void;
}

/**
 * Periodically runs the matching algorithm and fires a callback
 * for each successful match. Also manages priority hot-swapping:
 * when a real human joins the queue or skips, users currently chatting
 * with bots are instantly dropped from the bot and paired with real humans.
 */
export class Matcher {
  private interval: NodeJS.Timeout | null = null;
  private activeBotUsers = new Map<string, ActiveBotUser>();

  constructor(
    private queue: IMatchingQueue,
    private onMatch: (result: MatchResult) => void,
  ) {
    if (this.queue.setFallbackHandler) {
      this.queue.setFallbackHandler(() => {
        this.matchNow();
      });
    }
  }

  /** Flag any user currently chatting with a bot inside the memory store */
  flagBotUser(botUser: ActiveBotUser): void {
    this.activeBotUsers.set(botUser.socketId, botUser);
    logger.debug(`[Matcher] Flagged user ${botUser.user.nickname} (${botUser.socketId}) chatting with bot`);
  }

  /** Unflag a user when bot session ends */
  unflagBotUser(socketId: string): void {
    this.activeBotUsers.delete(socketId);
    logger.debug(`[Matcher] Unflagged user (${socketId}) from bot session`);
  }

  /** Check if a user is currently chatting with a bot */
  isChattingWithBot(socketId: string): boolean {
    return this.activeBotUsers.has(socketId);
  }

  /** Drop a user's bot session immediately */
  dropBot(socketId: string): boolean {
    const entry = this.activeBotUsers.get(socketId);
    if (!entry) return false;
    this.activeBotUsers.delete(socketId);
    try {
      entry.dropBot();
    } catch (err) {
      logger.error(`[Matcher] Error dropping bot for ${socketId}`, err);
    }
    logger.info(`[Matcher] Bot dropped for user ${entry.user.nickname} (${socketId})`);
    return true;
  }

  /** Get all active bot chat users */
  getActiveBotUsers(): ActiveBotUser[] {
    return Array.from(this.activeBotUsers.values());
  }

  /**
   * Run matching cycle immediately:
   * 1. Priority Hot-Swap: If real humans are in queue and someone is chatting with a bot,
   *    pair the real humans together with priority!
   * 2. Standard matching (real human-to-human, and 4s bot fallback).
   */
  matchNow(): void {
    // 1. Priority Hot-Swap: Real humans waiting in queue paired with real humans chatting with bots
    this.runPriorityHotSwap();

    // 2. Run queue matching
    const matches = this.queue.findMatches();
    for (const match of matches) {
      // Remove matched users from queue
      this.queue.remove(match.user1.socketId);
      this.queue.remove(match.user2.socketId);

      logger.debug(
        `Matched ${match.user1.nickname} ↔ ${match.user2.nickname}` +
        (match.isBotMatch ? ' (bot fallback)' : '') +
        (match.sharedInterests.length
          ? ` (shared: ${match.sharedInterests.join(', ')})`
          : ' (random)')
      );

      this.onMatch(match);
    }
  }

  /**
   * Priority Hot-Swap implementation:
   * Pairs waiting real humans in the queue with real humans currently chatting with bots.
   */
  private runPriorityHotSwap(): void {
    if (this.queue.size() === 0 || this.activeBotUsers.size === 0) return;

    const waitingUsers = this.queue.getAll ? this.queue.getAll() : [];
    const botEntries = Array.from(this.activeBotUsers.values());

    for (const waitingUser of waitingUsers) {
      if (botEntries.length === 0) break;
      if (waitingUser.isBot) continue;

      // Find compatible candidate currently chatting with a bot
      const candidateIndex = botEntries.findIndex((entry) => {
        if (entry.socketId === waitingUser.socketId) return false;
        if (entry.user.sessionId === waitingUser.sessionId) return false;
        if (entry.user.blockedSids.includes(waitingUser.sessionId)) return false;
        if (waitingUser.blockedSids.includes(entry.user.sessionId)) return false;
        return true;
      });

      if (candidateIndex !== -1) {
        const [candidateEntry] = botEntries.splice(candidateIndex, 1);
        this.activeBotUsers.delete(candidateEntry.socketId);

        // Drop the bot session immediately
        try {
          candidateEntry.dropBot();
        } catch (err) {
          logger.error(`[Matcher] Error in hot-swap dropBot for ${candidateEntry.socketId}`, err);
        }

        // Remove waiting human from queue
        this.queue.remove(waitingUser.socketId);

        const sharedInterests = waitingUser.interests.filter(i =>
          candidateEntry.user.interests.map(c => c.toLowerCase()).includes(i.toLowerCase())
        );

        logger.info(
          `[Hot-Swap] Priority paired real human ${waitingUser.nickname} with ${candidateEntry.user.nickname} (dropped bot)!`
        );

        this.onMatch({
          user1: waitingUser,
          user2: candidateEntry.user,
          sharedInterests,
          isBotMatch: false,
        });
      }
    }
  }

  /** Start the matching loop */
  start(intervalMs = 1000): void {
    if (this.interval) return;
    logger.info(`Matcher started (interval: ${intervalMs}ms)`);

    this.interval = setInterval(() => {
      this.matchNow();
    }, intervalMs);
  }

  /** Stop the matching loop */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Matcher stopped');
    }
  }
}
