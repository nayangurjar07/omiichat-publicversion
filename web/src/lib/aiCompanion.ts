/**
 * Client-Side Companion Module
 *
 * All autonomous bot logic and response generators have been removed and
 * migrated completely to the server (Phase 2). The frontend relies strictly
 * on incoming real-time Socket.IO events (message, partner_typing, matched, etc.).
 */

export interface AiPersona {
  id: string;
  nickname: string;
  avatar: string;
  gender?: 'm' | 'f';
  age?: number;
  location?: string;
  interests?: string[];
  bio?: string;
}

export interface AiReplyResult {
  reply: string;
  typingDelayMs: number;
  followUpReply?: string;
  followUpDelayMs?: number;
}
