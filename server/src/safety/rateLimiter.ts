/**
 * Sliding-window message rate limiter and Token-Bucket event rate limiter.
 * Enforces max 5 messages per 5 seconds per socket, rejects identical consecutive messages,
 * and throttles high-frequency socket events to prevent flood attacks.
 */

interface RateLimitEntry {
  timestamps: number[];
  lastMessages: string[];
}

const MAX_MESSAGES = 5;
const WINDOW_MS = 5_000;
const REPEAT_BUFFER_SIZE = 3;

export class RateLimiter {
  private entries = new Map<string, RateLimitEntry>();

  /**
   * Check if a message should be allowed.
   * @returns Object with allowed status, retry delay, and repeat flag
   */
  check(socketId: string, message: string): {
    allowed: boolean;
    retryAfterMs: number;
    isRepeat: boolean;
  } {
    const now = Date.now();
    let entry = this.entries.get(socketId);

    if (!entry) {
      entry = { timestamps: [], lastMessages: [] };
      this.entries.set(socketId, entry);
    }

    // Prune timestamps outside the sliding window
    entry.timestamps = entry.timestamps.filter(t => now - t < WINDOW_MS);

    // Check for identical consecutive messages (reject spamming the exact same message back-to-back)
    const normalized = message.trim().toLowerCase();
    if (entry.lastMessages.length > 0) {
      const immediateLast = entry.lastMessages[entry.lastMessages.length - 1];
      if (immediateLast === normalized && normalized.length > 1) {
        return { allowed: false, retryAfterMs: 0, isRepeat: true };
      }
    }

    // Check rate limit
    if (entry.timestamps.length >= MAX_MESSAGES) {
      const oldest = entry.timestamps[0];
      const retryAfterMs = WINDOW_MS - (now - oldest);
      return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs), isRepeat: false };
    }

    // Allow — record the message
    entry.timestamps.push(now);
    entry.lastMessages.push(normalized);
    if (entry.lastMessages.length > REPEAT_BUFFER_SIZE) {
      entry.lastMessages.shift();
    }

    return { allowed: true, retryAfterMs: 0, isRepeat: false };
  }

  /** Clean up when a socket or IP disconnects */
  remove(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    const now = Date.now();
    entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
    if (entry.timestamps.length === 0) {
      this.entries.delete(key);
    }
  }
}

/**
 * Token-Bucket rate limiter to throttle high-frequency Socket.IO event flooding
 * (e.g., rapid queue-join spam, typing event flood, next-partner spam).
 */
export class TokenBucketLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();

  /**
   * Consume tokens from the bucket.
   * @param key Identifier (e.g. socket.id or IP)
   * @param capacity Maximum token burst capacity (default 20)
   * @param fillRatePerSec Tokens refilled per second (default 10)
   * @param cost Cost of this event (default 1)
   */
  consume(key: string, capacity = 20, fillRatePerSec = 10, cost = 1): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: capacity - cost, lastRefill: now };
      this.buckets.set(key, bucket);
      return true;
    }

    // Refill tokens according to elapsed time
    const elapsedSec = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSec * fillRatePerSec);
    bucket.lastRefill = now;

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return true;
    }

    return false;
  }

  remove(key: string): void {
    this.buckets.delete(key);
  }

  /** Cleanup old buckets inactive for > 15 minutes */
  prune(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > 15 * 60 * 1000) {
        this.buckets.delete(key);
      }
    }
  }
}
