/**
 * Types and interfaces for the matching queue system.
 * The IMatchingQueue interface enables swapping between
 * in-memory (dev) and Redis-backed (prod) implementations.
 */

/** A user waiting in the matching queue */
export interface QueueUser {
  socketId: string;
  sessionId: string;
  nickname: string;
  interests: string[];
  language: string;
  joinedAt: number;       // Date.now() timestamp
  blockedSids: string[];  // Session IDs this user has blocked
  isBot?: boolean;
}

/** Result of a successful match between two users */
export interface MatchResult {
  user1: QueueUser;
  user2: QueueUser;
  sharedInterests: string[];
  isBotMatch?: boolean;
}

/**
 * Matching queue interface.
 * Implement this to swap between in-memory and Redis-backed queues
 * without changing any consumer code.
 */
export interface IMatchingQueue {
  /** Add a user to the queue */
  add(user: QueueUser): void;
  /** Remove a user by socket ID; returns the removed user or undefined */
  remove(socketId: string): QueueUser | undefined;
  /** Look up a user by socket ID */
  getBySocketId(socketId: string): QueueUser | undefined;
  /** Look up a user by session ID */
  getBySessionId(sessionId: string): QueueUser | undefined;
  /** Number of users currently in the queue */
  size(): number;
  /** Get all users currently waiting in the queue */
  getAll?(): QueueUser[];
  /** Run the matching algorithm and return all found matches */
  findMatches(): MatchResult[];
  /** Optional handler triggered when a user's queue fallback timer expires */
  setFallbackHandler?(handler: (user: QueueUser) => void): void;
}
