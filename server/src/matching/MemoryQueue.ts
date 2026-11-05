import { QueueUser, MatchResult, IMatchingQueue } from './types';
import { pickBotPersona } from '../bot/botEngine';

/**
 * How long to wait for an interest-based match before
 * falling back to matching with anyone available.
 */
const INTEREST_MATCH_TIMEOUT_MS = 10_000;

/**
 * Queue fallback timer: If a user remains unmatched in the queue
 * for more than 4 seconds, automatically pair them with a server-managed bot session.
 */
const BOT_FALLBACK_TIMEOUT_MS = 4000;

/**
 * In-memory matching queue.
 * For production, implement IMatchingQueue with Redis Sorted Sets.
 */
export class MemoryQueue implements IMatchingQueue {
  private queue = new Map<string, QueueUser>();
  private fallbackTimers = new Map<string, NodeJS.Timeout>();
  private onFallback?: (user: QueueUser) => void;

  setFallbackHandler(handler: (user: QueueUser) => void): void {
    this.onFallback = handler;
  }

  add(user: QueueUser): void {
    this.queue.set(user.socketId, user);
    this.scheduleFallbackTimer(user.socketId);
  }

  remove(socketId: string): QueueUser | undefined {
    this.clearFallbackTimer(socketId);
    const user = this.queue.get(socketId);
    if (user) this.queue.delete(socketId);
    return user;
  }

  getBySocketId(socketId: string): QueueUser | undefined {
    return this.queue.get(socketId);
  }

  getBySessionId(sessionId: string): QueueUser | undefined {
    for (const user of this.queue.values()) {
      if (user.sessionId === sessionId) return user;
    }
    return undefined;
  }

  getAll(): QueueUser[] {
    return Array.from(this.queue.values());
  }

  size(): number {
    return this.queue.size;
  }

  private scheduleFallbackTimer(socketId: string): void {
    this.clearFallbackTimer(socketId);
    const timer = setTimeout(() => {
      this.fallbackTimers.delete(socketId);
      const user = this.queue.get(socketId);
      if (!user) return;
      if (this.onFallback) {
        this.onFallback(user);
      }
    }, BOT_FALLBACK_TIMEOUT_MS);
    this.fallbackTimers.set(socketId, timer);
  }

  private clearFallbackTimer(socketId: string): void {
    const timer = this.fallbackTimers.get(socketId);
    if (timer) {
      clearTimeout(timer);
      this.fallbackTimers.delete(socketId);
    }
  }

  /**
   * Run the matching algorithm:
   * 1. Sort users by join time (longest-waiting first)
   * 2. For each unmatched user, score all valid candidates
   * 3. If user waited <10s and has interests, require affinity score > 0
   * 4. After 10s, fall back to any non-blocked user
   * 5. Pick highest score, break ties by wait time
   * 6. Queue fallback: If unmatched user waited >= 4s, pair with server-managed bot
   */
  findMatches(): MatchResult[] {
    const results: MatchResult[] = [];
    const matched = new Set<string>();
    const now = Date.now();

    const users = Array.from(this.queue.values())
      .sort((a, b) => a.joinedAt - b.joinedAt);

    // Phase 1: Real human-to-human matching
    for (const user of users) {
      if (matched.has(user.socketId)) continue;

      let bestCandidate: QueueUser | null = null;
      let bestScore = -1;
      let bestShared: string[] = [];
      const userWaitedLong = (now - user.joinedAt) > INTEREST_MATCH_TIMEOUT_MS;

      for (const candidate of users) {
        // Skip: self, already matched, same session, or blocked pair
        if (candidate.socketId === user.socketId) continue;
        if (matched.has(candidate.socketId)) continue;
        if (candidate.sessionId === user.sessionId) continue;
        if (user.blockedSids.includes(candidate.sessionId)) continue;
        if (candidate.blockedSids.includes(user.sessionId)) continue;

        // Calculate affinity score
        const shared = user.interests.filter(i =>
          candidate.interests.map(c => c.toLowerCase()).includes(i.toLowerCase())
        );
        let score = shared.length * 10;

        if (
          user.language && candidate.language &&
          user.language.toLowerCase() === candidate.language.toLowerCase()
        ) {
          score += 5;
        }

        const candidateWaitedLong = (now - candidate.joinedAt) > INTEREST_MATCH_TIMEOUT_MS;

        // If neither has waited long enough and no affinity, keep waiting
        if (!userWaitedLong && !candidateWaitedLong && score === 0) {
          // Exception: if neither user specified interests, match immediately
          if (user.interests.length > 0 || candidate.interests.length > 0) {
            continue;
          }
        }

        // Prefer higher score; tie-break by longest wait
        if (
          score > bestScore ||
          (score === bestScore && bestCandidate && candidate.joinedAt < bestCandidate.joinedAt)
        ) {
          bestCandidate = candidate;
          bestScore = score;
          bestShared = shared;
        }
      }

      if (bestCandidate) {
        matched.add(user.socketId);
        matched.add(bestCandidate.socketId);
        this.clearFallbackTimer(user.socketId);
        this.clearFallbackTimer(bestCandidate.socketId);
        results.push({
          user1: user,
          user2: bestCandidate,
          sharedInterests: bestShared,
          isBotMatch: false,
        });
      }
    }

    // Phase 2: Queue fallback timer check (> 4 seconds)
    // Automatically pair unmatched users with a server-managed bot session
    for (const user of users) {
      if (matched.has(user.socketId)) continue;
      if (user.isBot) continue;

      if ((now - user.joinedAt) >= BOT_FALLBACK_TIMEOUT_MS) {
        const persona = pickBotPersona(user.interests);
        const botUser: QueueUser = {
          socketId: `bot_sock_${persona.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          sessionId: persona.id,
          nickname: persona.nickname,
          interests: persona.interests,
          language: user.language || 'en',
          joinedAt: now,
          blockedSids: [],
          isBot: true,
        };

        const sharedInterests = user.interests.filter(i =>
          persona.interests.map(p => p.toLowerCase()).includes(i.toLowerCase())
        );

        matched.add(user.socketId);
        this.clearFallbackTimer(user.socketId);

        results.push({
          user1: user,
          user2: botUser,
          sharedInterests,
          isBotMatch: true,
        });
      }
    }

    return results;
  }
}
