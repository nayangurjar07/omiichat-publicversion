import { RateLimiter } from '../safety/rateLimiter';
import { filterProfanity } from '../safety/profanityFilter';
import { sanitizeMessage, sanitizeNickname } from '../utils/sanitize';
import { logger } from '../utils/logger';

export interface RoomMember {
  socketId: string;
  sessionId: string;
  nickname: string;
  isCreator: boolean;
  isMuted: boolean;
  joinedAt: number;
}

export interface RoomMessage {
  id: string;
  senderId: string;
  senderNick: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio';
  timestamp: number;
  isSystem?: boolean;
}

export interface RoomSummary {
  id: string;
  name: string;
  description: string;
  category: 'public' | 'regional' | 'private';
  isPrivate: boolean;
  inviteCode?: string;
  userCount: number;
  maxUsers: number;
}

export class ChatRoomInstance {
  id: string;
  name: string;
  description: string;
  category: 'public' | 'regional' | 'private';
  isPrivate: boolean;
  inviteCode?: string;
  creatorSessionId?: string;
  maxUsers: number = 200;
  members: Map<string, RoomMember> = new Map(); // keyed by sessionId
  messages: RoomMessage[] = []; // last 50 messages
  emptySince: number | null = null;
  rateLimiter: RateLimiter = new RateLimiter();

  constructor(params: {
    id: string;
    name: string;
    description: string;
    category: 'public' | 'regional' | 'private';
    isPrivate?: boolean;
    inviteCode?: string;
    creatorSessionId?: string;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.description = params.description;
    this.category = params.category;
    this.isPrivate = !!params.isPrivate;
    this.inviteCode = params.inviteCode;
    this.creatorSessionId = params.creatorSessionId;
    // Private rooms start empty until the creator joins
    this.emptySince = params.isPrivate ? Date.now() : null;
  }

  addMember(member: RoomMember): { success: boolean; error?: string } {
    if (this.members.size >= this.maxUsers && !this.members.has(member.sessionId)) {
      return { success: false, error: 'Room has reached the maximum capacity of 200 users.' };
    }

    this.members.set(member.sessionId, member);
    this.emptySince = null;
    return { success: true };
  }

  removeMember(sessionId: string): RoomMember | undefined {
    const member = this.members.get(sessionId);
    if (member) {
      this.members.delete(sessionId);
      this.rateLimiter.remove(member.socketId);
      if (this.members.size === 0) {
        this.emptySince = Date.now();
      }
    }
    return member;
  }

  getMemberBySocket(socketId: string): RoomMember | undefined {
    for (const member of this.members.values()) {
      if (member.socketId === socketId) return member;
    }
    return undefined;
  }

  addMessage(msg: RoomMessage): void {
    this.messages.push(msg);
    if (this.messages.length > 50) {
      this.messages = this.messages.slice(-50);
    }
  }

  getSummary(): RoomSummary {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      isPrivate: this.isPrivate,
      inviteCode: this.inviteCode,
      userCount: this.members.size,
      maxUsers: this.maxUsers,
    };
  }
}

export class RoomManager {
  private rooms: Map<string, ChatRoomInstance> = new Map();
  private codeToRoomId: Map<string, string> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initDefaultRooms();
    this.startCleanupTimer();
  }

  private initDefaultRooms(): void {
    const publicRooms = [
      { id: 'gaming', name: 'Gaming Hub', description: 'PC, Console, RPGs, Esports & Indie titles', category: 'public' as const },
      { id: 'music', name: 'Music Lounge', description: 'Tracks, production, vinyl, playlists & genres', category: 'public' as const },
      { id: 'movies', name: 'Cinema & TV', description: 'Films, anime, streaming, series & reviews', category: 'public' as const },
      { id: 'college', name: 'College & Campus', description: 'Student life, study sessions, exams & late chats', category: 'public' as const },
      { id: 'tech', name: 'Tech & Code', description: 'Software engineering, AI, gadgets & startups', category: 'public' as const },
      { id: 'chill', name: 'Chill Cafe', description: 'Casual talk, relaxing vibes, late night banter', category: 'public' as const },
      // Regional Rooms
      { id: 'region-na', name: 'North America', description: 'US & Canada community and regional timezones', category: 'regional' as const },
      { id: 'region-eu', name: 'Europe', description: 'European regional topics, languages & culture', category: 'regional' as const },
      { id: 'region-asia', name: 'Asia & Pacific', description: 'Asian and Pacific region community hub', category: 'regional' as const },
      { id: 'region-latam', name: 'Latin America', description: 'Comunidad hispanohablante y brasileña', category: 'regional' as const },
      { id: 'region-global', name: 'Global Hub', description: 'International cross-border conversation', category: 'regional' as const },
    ];

    for (const r of publicRooms) {
      this.rooms.set(r.id, new ChatRoomInstance({
        id: r.id,
        name: r.name,
        description: r.description,
        category: r.category,
        isPrivate: false,
      }));
    }
    logger.info(`Initialized ${publicRooms.length} public and regional topic rooms.`);
  }

  getRoom(roomId: string): ChatRoomInstance | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByInviteCode(code: string): ChatRoomInstance | undefined {
    const upper = code.trim().toUpperCase();
    const roomId = this.codeToRoomId.get(upper);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  resolveRoom(identifier: string): ChatRoomInstance | undefined {
    if (!identifier) return undefined;
    const clean = identifier.trim();
    const direct = this.rooms.get(clean);
    if (direct) return direct;
    return this.getRoomByInviteCode(clean.toUpperCase());
  }

  getAllSummaries(): RoomSummary[] {
    const list: RoomSummary[] = [];
    for (const room of this.rooms.values()) {
      // Do not list private invite-only rooms on public /rooms page
      if (!room.isPrivate) {
        list.push(room.getSummary());
      }
    }
    return list;
  }

  createPrivateRoom(params: {
    name: string;
    description?: string;
    creatorSessionId: string;
  }): { room: ChatRoomInstance; inviteCode: string } {
    const inviteCode = this.generateInviteCode();
    const roomId = `priv_${Date.now()}_${inviteCode.toLowerCase()}`;
    const cleanName = sanitizeNickname(params.name || 'Private Group');

    const room = new ChatRoomInstance({
      id: roomId,
      name: cleanName,
      description: params.description ? sanitizeMessage(params.description) : 'Private group conversation',
      category: 'private',
      isPrivate: true,
      inviteCode,
      creatorSessionId: params.creatorSessionId,
    });

    this.rooms.set(roomId, room);
    this.codeToRoomId.set(inviteCode, roomId);
    logger.info(`Created private room "${cleanName}" [${inviteCode}] by session ${params.creatorSessionId}`);

    return { room, inviteCode };
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // ensure unique
    if (this.codeToRoomId.has(code)) {
      return this.generateInviteCode();
    }
    return code;
  }

  private startCleanupTimer(): void {
    // Check every 60 seconds for empty private rooms older than 30 minutes
    const THIRTY_MINUTES_MS = 30 * 60 * 1000;
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [roomId, room] of this.rooms.entries()) {
        if (room.isPrivate && room.emptySince && now - room.emptySince > THIRTY_MINUTES_MS) {
          logger.info(`Auto-deleting abandoned private room: ${room.name} (${roomId})`);
          if (room.inviteCode) {
            this.codeToRoomId.delete(room.inviteCode);
          }
          this.rooms.delete(roomId);
        }
      }
    }, 60 * 1000);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
