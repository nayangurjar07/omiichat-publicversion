/**
 * Socket.IO event handler — Core real-time engine of Omii.
 *
 * Supports:
 * 1. Anonymous 1-to-1 random chat with matching queue, skip, block, report, typing.
 * 2. 1-to-1 Media sharing (images & voice notes).
 * 3. 24-hour mutual post-chat Reconnect codes.
 * 4. Topic rooms & private creator-managed rooms (up to 200 users, 50-msg history,
 *    live presence, join/leave notices, per-room rate limiting, kick/mute, and report).
 */

import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { EVENTS } from './events';
import { IMatchingQueue, QueueUser, MatchResult } from '../matching/types';
import { Matcher } from '../matching/matcher';
import { RateLimiter, TokenBucketLimiter } from '../safety/rateLimiter';
import { filterProfanity } from '../safety/profanityFilter';
import { sanitizeMessage, sanitizeNickname, sanitizeRoomName, sanitizeTag, sanitizeInput } from '../utils/sanitize';
import { createReport, CreateReportInput } from '../safety/reportService';
import { isBanned, checkAutoBan } from '../safety/banService';
import { RoomManager, ChatRoomInstance } from '../rooms/RoomManager';
import { createOrGetReconnectCode, verifyReconnectCode } from '../reconnect/reconnectService';
import { logger } from '../utils/logger';
import {
  BotPersona,
  BOT_PERSONAS,
  pickBotPersona,
  calculateTypingDelay,
  generateBotReplies,
} from '../bot/botEngine';

// ─── 1-to-1 Chat Interfaces ──────────────────────────────────────────

export interface MessagePayload {
  id?: string;
  senderId: string;
  senderNick?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio';
  timestamp: number;
}

interface ChatRoom {
  id: string;
  sockets: [string, string];
  sessions: [string, string];
  nicknames: [string, string];
  messages: MessagePayload[];
}

// ─── State ───────────────────────────────────────────────────────────

const rooms = new Map<string, ChatRoom>();
const socketToRoom = new Map<string, string>();
const socketToSession = new Map<string, string>();
const socketToNickname = new Map<string, string>();
const sessionToSocket = new Map<string, string>();
const sessionBlockList = new Map<string, Set<string>>();
const rateLimiter = new RateLimiter();
const tokenBucket = new TokenBucketLimiter();
const socketToIp = new Map<string, string>();

let globalIo: Server | null = null;
let globalQueue: IMatchingQueue | null = null;
let globalMatcher: Matcher | null = null;

// ─── Active Server-Side Bot Sessions ─────────────────────────────────
export interface ActiveBotSession {
  humanSocketId: string;
  humanSessionId: string;
  botSocketId: string;
  botSessionId: string;
  persona: BotPersona;
  roomId: string;
  history: { sender: 'user' | 'bot'; text: string }[];
  timers: Set<NodeJS.Timeout>;
}

const activeBotSessions = new Map<string, ActiveBotSession>();

function dropBotSession(humanSocketId: string): void {
  const botSession = activeBotSessions.get(humanSocketId);
  if (!botSession) return;
  for (const timer of botSession.timers) {
    clearTimeout(timer);
  }
  botSession.timers.clear();
  activeBotSessions.delete(humanSocketId);
  socketToRoom.delete(humanSocketId);
  socketToRoom.delete(botSession.botSocketId);
  rooms.delete(botSession.roomId);
}

export function getSocketClientIp(socket: Socket): string {
  const rawForwarded = socket.handshake.headers['x-forwarded-for'];
  return typeof rawForwarded === 'string'
    ? rawForwarded.split(',')[0].trim()
    : (socket.handshake.address || 'unknown');
}

// Socket to Room ID mapping for public/private topic rooms
const socketToTopicRoom = new Map<string, string>();

// Room manager singleton
const roomManager = new RoomManager();

// Pending reconnect attempts waiting for second partner
const pendingReconnects = new Map<string, { socketId: string; sessionId: string; nickname: string; timestamp: number }>();

// ─── Friend Presence & Requests State ──────────────────────────────
const socketToFriendCode = new Map<string, string>();
const friendCodeToSocket = new Map<string, string>();
const sessionPresence = new Map<string, { isOnline: boolean; lastSeenAt: number; nickname: string; friendCode: string }>();
const friendSubscribers = new Map<string, Set<string>>(); // friendCode -> Set<socketId>
const pendingFriendRequests = new Map<string, {
  id: string;
  fromSessionId: string;
  fromFriendCode: string;
  fromNickname: string;
  fromAvatar: string;
  toSessionId?: string;
  toFriendCode?: string;
  timestamp: number;
}>();

let onlineCount = 0;
let roomCounter = 0;

/**
 * Real-Time Ban Enforcement & Socket Teardown:
 * Immediately ejects user from queues, active 1-to-1 chats (notifying partner),
 * topic rooms, and forcibly disconnects their socket.
 */
export function enforceBan(sessionId: string, reason = 'Your session has been banned due to violations of community rules.'): void {
  try {
    const socketId = sessionToSocket.get(sessionId);
    if (!socketId) return;

    const io = globalIo;
    const matcher = globalMatcher;
    const queue = globalQueue;

    // 1. Remove from matching queue
    if (queue) queue.remove(socketId);

    // 2. Drop any bot session
    if (matcher) {
      matcher.dropBot(socketId);
    } else {
      dropBotSession(socketId);
    }

    // 3. Clean up active 1-to-1 chat & notify partner
    const roomId = socketToRoom.get(socketId);
    if (roomId && io) {
      cleanupRoom(io, roomId, socketId, matcher || undefined);
    }

    // 4. Clean up topic room if present
    const topicRoomId = socketToTopicRoom.get(socketId);
    if (topicRoomId) {
      const room = roomManager.getRoom(topicRoomId);
      if (room) {
        room.removeMember(sessionId);
      }
      socketToTopicRoom.delete(socketId);
      if (io) broadcastRoomList(io);
    }

    // 5. Emit forced ban event & immediately terminate socket
    if (io) {
      io.to(socketId).emit(EVENTS.BANNED, { reason });
      const targetSocket = io.sockets.sockets.get(socketId);
      if (targetSocket) {
        targetSocket.disconnect(true);
      }
    }

    // 6. Clean mapping state
    sessionToSocket.delete(sessionId);
    socketToSession.delete(socketId);
    socketToNickname.delete(socketId);
    socketToRoom.delete(socketId);

    logger.info(`Enforced real-time ban and socket teardown for session: ${sessionId}`);
  } catch (err) {
    logger.error(`Error enforcing ban on session ${sessionId}:`, err);
  }
}

/**
 * Automated periodic cleanup of stale guest sessions, reconnect tokens, and rate limits
 */
export function cleanStaleSessions(maxAgeMs = 2 * 60 * 60 * 1000): void {
  const now = Date.now();
  for (const [sid, pres] of sessionPresence.entries()) {
    if (!pres.isOnline && now - pres.lastSeenAt > maxAgeMs) {
      sessionPresence.delete(sid);
    }
  }
  for (const [key, item] of pendingReconnects.entries()) {
    if (now - item.timestamp > maxAgeMs) {
      pendingReconnects.delete(key);
    }
  }
  for (const [key, item] of pendingFriendRequests.entries()) {
    if (now - item.timestamp > maxAgeMs) {
      pendingFriendRequests.delete(key);
    }
  }
  tokenBucket.prune();
  logger.info('Cleaned stale in-memory guest sessions, presence, and token buckets');
}

function broadcastPresenceChange(io: Server, friendCode: string, isOnline: boolean, lastSeenAt: number): void {
  const subscribers = friendSubscribers.get(friendCode);
  if (!subscribers) return;
  for (const sId of subscribers) {
    io.to(sId).emit(EVENTS.FRIEND_PRESENCE_UPDATE, {
      friendCode,
      isOnline,
      lastSeenAt,
    });
  }
}


// ─── Helpers ─────────────────────────────────────────────────────────

function getPartnerSocketId(roomId: string, mySocketId: string): string | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  return room.sockets[0] === mySocketId ? room.sockets[1] : room.sockets[0];
}

function generateRoomId(): string {
  return `room_${Date.now()}_${++roomCounter}`;
}

function broadcastOnlineCount(io: Server): void {
  io.emit(EVENTS.ONLINE_COUNT, { count: onlineCount });
}

function broadcastRoomList(io: Server): void {
  io.emit(EVENTS.ROOM_LIST, { rooms: roomManager.getAllSummaries() });
}

/** Clean up a 1-to-1 room and notify the partner that the other person left */
function cleanupRoom(io: Server, roomId: string, leavingSocketId: string, matcher?: Matcher): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const partnerSocketId = getPartnerSocketId(roomId, leavingSocketId);
  if (partnerSocketId) {
    if (activeBotSessions.has(partnerSocketId)) {
      if (matcher) {
        matcher.dropBot(partnerSocketId);
      } else {
        dropBotSession(partnerSocketId);
      }
    }
    // Only emit partner_left if partner is not a virtual bot
    if (!partnerSocketId.startsWith('bot_sock_')) {
      io.to(partnerSocketId).emit(EVENTS.PARTNER_LEFT);
    }
    socketToRoom.delete(partnerSocketId);
  }

  if (activeBotSessions.has(leavingSocketId)) {
    if (matcher) {
      matcher.dropBot(leavingSocketId);
    } else {
      dropBotSession(leavingSocketId);
    }
  }

  socketToRoom.delete(leavingSocketId);
  rooms.delete(roomId);
}

/** Schedule natural bot greeting opener if human user does not message first */
function scheduleBotOpener(io: Server, botSession: ActiveBotSession, room: ChatRoom): void {
  const persona = botSession.persona;
  const openers = persona.openers;
  const picked = openers[Math.floor(Math.random() * openers.length)] || { first: "hey! what's up" };
  const initialDelay = 1200 + Math.random() * 800; // 1.2s - 2.0s human pause

  const openerTimer = setTimeout(() => {
    botSession.timers.delete(openerTimer);

    // Emit typing indicator
    io.to(botSession.humanSocketId).emit(EVENTS.PARTNER_TYPING, { isTyping: true });
    io.to(botSession.humanSocketId).emit('typing:start');

    const typingDuration1 = calculateTypingDelay(picked.first);
    const typingTimer1 = setTimeout(() => {
      botSession.timers.delete(typingTimer1);
      io.to(botSession.humanSocketId).emit(EVENTS.PARTNER_TYPING, { isTyping: false });
      io.to(botSession.humanSocketId).emit('typing:stop');

      const msg1: MessagePayload = {
        id: `msg_${Date.now()}_${uuidv4().slice(0, 6)}`,
        senderId: botSession.botSocketId,
        senderNick: persona.nickname,
        text: picked.first,
        timestamp: Date.now(),
      };
      room.messages.push(msg1);
      botSession.history.push({ sender: 'bot', text: picked.first });
      io.to(botSession.humanSocketId).emit(EVENTS.MESSAGE, msg1);

      if (picked.second) {
        const bubbleGap = 600 + Math.random() * 400; // 600-1000ms pause
        const gapTimer = setTimeout(() => {
          botSession.timers.delete(gapTimer);
          io.to(botSession.humanSocketId).emit(EVENTS.PARTNER_TYPING, { isTyping: true });
          io.to(botSession.humanSocketId).emit('typing:start');

          const typingDuration2 = calculateTypingDelay(picked.second!);
          const typingTimer2 = setTimeout(() => {
            botSession.timers.delete(typingTimer2);
            io.to(botSession.humanSocketId).emit(EVENTS.PARTNER_TYPING, { isTyping: false });
            io.to(botSession.humanSocketId).emit('typing:stop');

            const msg2: MessagePayload = {
              id: `msg_${Date.now()}_${uuidv4().slice(0, 6)}`,
              senderId: botSession.botSocketId,
              senderNick: persona.nickname,
              text: picked.second,
              timestamp: Date.now(),
            };
            room.messages.push(msg2);
            botSession.history.push({ sender: 'bot', text: picked.second! });
            io.to(botSession.humanSocketId).emit(EVENTS.MESSAGE, msg2);
          }, typingDuration2);

          botSession.timers.add(typingTimer2);
        }, bubbleGap);

        botSession.timers.add(gapTimer);
      }
    }, typingDuration1);

    botSession.timers.add(typingTimer1);
  }, initialDelay);

  botSession.timers.add(openerTimer);
}

/**
 * Handle incoming user message when chatting with a server-side bot.
 * Mimics authentic human texting behavior:
 * - Reading Delay: 1.5 - 2.5s
 * - Typing Indicator duration based on response length
 * - Multi-Bubble Splitting: 2 short lowercase messages sent sequentially
 */
function handleBotMessageResponse(
  io: Server,
  socket: Socket,
  botSession: ActiveBotSession,
  userText: string
): void {
  // Clear any existing bot timers (e.g. pending opener)
  for (const timer of botSession.timers) {
    clearTimeout(timer);
  }
  botSession.timers.clear();
  io.to(socket.id).emit(EVENTS.PARTNER_TYPING, { isTyping: false });
  io.to(socket.id).emit('typing:stop');

  botSession.history.push({ sender: 'user', text: userText });

  // 1. Reading Delay: Wait 1.5 to 2.5 seconds after user sends message before bot reacts
  const readingDelay = 1500 + Math.random() * 1000;

  const readingTimer = setTimeout(() => {
    botSession.timers.delete(readingTimer);

    // Generate 2 short, lowercase messages with casual slang, occasional typos, and hooks
    const { bubble1, bubble2 } = generateBotReplies(userText, botSession.persona, botSession.history);

    // 2. Typing Indicator: Emit typing:start and partner_typing for duration calculated by response length
    io.to(socket.id).emit(EVENTS.PARTNER_TYPING, { isTyping: true });
    io.to(socket.id).emit('typing:start');

    const typingDuration1 = calculateTypingDelay(bubble1);

    const typingTimer1 = setTimeout(() => {
      botSession.timers.delete(typingTimer1);

      // Stop typing
      io.to(socket.id).emit(EVENTS.PARTNER_TYPING, { isTyping: false });
      io.to(socket.id).emit('typing:stop');

      // Send bubble 1
      const botMsg1: MessagePayload = {
        id: `msg_${Date.now()}_${uuidv4().slice(0, 6)}`,
        senderId: botSession.botSocketId,
        senderNick: botSession.persona.nickname,
        text: bubble1,
        timestamp: Date.now(),
      };
      const room = rooms.get(botSession.roomId);
      if (room) {
        room.messages.push(botMsg1);
        if (room.messages.length > 50) room.messages = room.messages.slice(-50);
      }
      botSession.history.push({ sender: 'bot', text: bubble1 });
      io.to(socket.id).emit(EVENTS.MESSAGE, botMsg1);

      // 3. Multi-Bubble Splitting: wait natural human pause, then emit typing, then bubble 2
      const pauseBetweenBubbles = 600 + Math.random() * 400; // 600 - 1000ms

      const pauseTimer = setTimeout(() => {
        botSession.timers.delete(pauseTimer);

        io.to(socket.id).emit(EVENTS.PARTNER_TYPING, { isTyping: true });
        io.to(socket.id).emit('typing:start');

        const typingDuration2 = calculateTypingDelay(bubble2);

        const typingTimer2 = setTimeout(() => {
          botSession.timers.delete(typingTimer2);

          io.to(socket.id).emit(EVENTS.PARTNER_TYPING, { isTyping: false });
          io.to(socket.id).emit('typing:stop');

          const botMsg2: MessagePayload = {
            id: `msg_${Date.now()}_${uuidv4().slice(0, 6)}`,
            senderId: botSession.botSocketId,
            senderNick: botSession.persona.nickname,
            text: bubble2,
            timestamp: Date.now(),
          };
          if (room) {
            room.messages.push(botMsg2);
            if (room.messages.length > 50) room.messages = room.messages.slice(-50);
          }
          botSession.history.push({ sender: 'bot', text: bubble2 });
          io.to(socket.id).emit(EVENTS.MESSAGE, botMsg2);
        }, typingDuration2);

        botSession.timers.add(typingTimer2);
      }, pauseBetweenBubbles);

      botSession.timers.add(pauseTimer);
    }, typingDuration1);

    botSession.timers.add(typingTimer1);
  }, readingDelay);

  botSession.timers.add(readingTimer);
}

/** Handle a successful 1-to-1 match — create room and notify users */
function handleMatch(io: Server, match: MatchResult, matcher?: Matcher): void {
  const isBotMatch = !!(match.isBotMatch || match.user1.isBot || match.user2.isBot);

  if (isBotMatch) {
    const humanUser = match.user1.isBot ? match.user2 : match.user1;
    const botUser = match.user1.isBot ? match.user1 : match.user2;

    const roomId = generateRoomId();
    const room: ChatRoom = {
      id: roomId,
      sockets: [humanUser.socketId, botUser.socketId],
      sessions: [humanUser.sessionId, botUser.sessionId],
      nicknames: [humanUser.nickname, botUser.nickname],
      messages: [],
    };

    rooms.set(roomId, room);
    socketToRoom.set(humanUser.socketId, roomId);
    socketToRoom.set(botUser.socketId, roomId);

    io.to(humanUser.socketId).emit(EVENTS.MATCHED, {
      partnerNickname: botUser.nickname,
      partnerSessionId: botUser.sessionId,
      sharedInterests: match.sharedInterests,
    });

    const persona =
      BOT_PERSONAS.find((p) => p.id === botUser.sessionId) || pickBotPersona(humanUser.interests);
    const botSession: ActiveBotSession = {
      humanSocketId: humanUser.socketId,
      humanSessionId: humanUser.sessionId,
      botSocketId: botUser.socketId,
      botSessionId: botUser.sessionId,
      persona,
      roomId,
      history: [],
      timers: new Set<NodeJS.Timeout>(),
    };
    activeBotSessions.set(humanUser.socketId, botSession);

    if (matcher) {
      matcher.flagBotUser({
        socketId: humanUser.socketId,
        sessionId: humanUser.sessionId,
        user: humanUser,
        roomId,
        dropBot: () => {
          dropBotSession(humanUser.socketId);
        },
      });
    }

    scheduleBotOpener(io, botSession, room);
    return;
  }

  // Regular human-to-human match: clean state isolation from prior bot sessions
  if (activeBotSessions.has(match.user1.socketId)) {
    if (matcher) matcher.dropBot(match.user1.socketId);
    else dropBotSession(match.user1.socketId);
  }
  if (activeBotSessions.has(match.user2.socketId)) {
    if (matcher) matcher.dropBot(match.user2.socketId);
    else dropBotSession(match.user2.socketId);
  }

  const roomId = generateRoomId();
  const room: ChatRoom = {
    id: roomId,
    sockets: [match.user1.socketId, match.user2.socketId],
    sessions: [match.user1.sessionId, match.user2.sessionId],
    nicknames: [match.user1.nickname, match.user2.nickname],
    messages: [],
  };

  rooms.set(roomId, room);
  socketToRoom.set(match.user1.socketId, roomId);
  socketToRoom.set(match.user2.socketId, roomId);

  io.to(match.user1.socketId).emit(EVENTS.MATCHED, {
    partnerNickname: match.user2.nickname,
    partnerSessionId: match.user2.sessionId,
    sharedInterests: match.sharedInterests,
  });
  io.to(match.user2.socketId).emit(EVENTS.MATCHED, {
    partnerNickname: match.user1.nickname,
    partnerSessionId: match.user1.sessionId,
    sharedInterests: match.sharedInterests,
  });
}

// ─── Main Setup ──────────────────────────────────────────────────────

export function setupSocketHandlers(io: Server, queue: IMatchingQueue): void {
  // Start the 1-to-1 matching loop (runs every 1s)
  const matcher = new Matcher(queue, (match: MatchResult) => {
    handleMatch(io, match, matcher);
  });
  matcher.start(1000);

  globalIo = io;
  globalQueue = queue;
  globalMatcher = matcher;

  io.on('connection', (socket: Socket) => {
    onlineCount++;
    broadcastOnlineCount(io);

    // Enforce per-event token-bucket rate limiting across all socket events
    socket.use((_packet, next) => {
      if (!tokenBucket.consume(socket.id, 25, 10, 1)) {
        socket.emit(EVENTS.RATE_LIMITED, { retryAfterMs: 1500 });
        return; // Drop socket flood packet
      }
      next();
    });

    const clientIp = getSocketClientIp(socket);
    socketToIp.set(socket.id, clientIp);

    const authSessionId = socket.handshake.auth?.sessionId;
    if (authSessionId && typeof authSessionId === 'string') {
      const cleanSid = authSessionId.trim().slice(0, 64);
      if (cleanSid) {
        socketToSession.set(socket.id, cleanSid);
        sessionToSocket.set(cleanSid, socket.id);
      }
    }

    const authFriendCode = socket.handshake.auth?.friendCode;
    const authNickname = socket.handshake.auth?.nickname;
    if (authFriendCode && typeof authFriendCode === 'string') {
      const cleanCode = authFriendCode.trim().toUpperCase();
      if (cleanCode) {
        socketToFriendCode.set(socket.id, cleanCode);
        friendCodeToSocket.set(cleanCode, socket.id);
        const nick = typeof authNickname === 'string' ? authNickname.slice(0, 30) : 'User';
        sessionPresence.set(cleanCode, {
          isOnline: true,
          lastSeenAt: Date.now(),
          nickname: nick,
          friendCode: cleanCode,
        });
        broadcastPresenceChange(io, cleanCode, true, Date.now());
      }
    }

    logger.debug(`Socket connected: ${socket.id} (online: ${onlineCount})`);

    // ─────────────────────────────────────────────────────────────────
    // 1-TO-1 RANDOM CHAT EVENTS
    // ─────────────────────────────────────────────────────────────────

    // ── JOIN QUEUE ─────────────────────────────────────────
    socket.on(EVENTS.JOIN_QUEUE, async (data: {
      sessionId: string;
      nickname: string;
      interests?: string[];
      language?: string;
    }) => {
      try {
        if (!data.sessionId || !data.nickname) {
          socket.emit(EVENTS.ERROR, { message: 'Session ID and nickname are required' });
          return;
        }

        const sessionId = sanitizeInput(data.sessionId, 64);
        const nickname = sanitizeNickname(data.nickname);
        if (nickname.length === 0) {
          socket.emit(EVENTS.ERROR, { message: 'Nickname cannot be empty' });
          return;
        }

        // Check ban status for both session and real client IP
        const clientIp = socketToIp.get(socket.id) || getSocketClientIp(socket);
        const banned = await isBanned(sessionId, clientIp);
        if (banned) {
          socket.emit(EVENTS.BANNED, {
            reason: 'Your session has been banned due to violations of community rules.',
          });
          return;
        }

        // Track session & nickname
        socketToSession.set(socket.id, sessionId);
        socketToNickname.set(socket.id, nickname);
        sessionToSocket.set(sessionId, socket.id);

        // Clean up any existing 1-to-1 room
        const existingRoom = socketToRoom.get(socket.id);
        if (existingRoom) {
          cleanupRoom(io, existingRoom, socket.id, matcher);
        }

        queue.remove(socket.id);

        const interests = (data.interests || [])
          .slice(0, 5)
          .map((i) => i.trim().toLowerCase().slice(0, 30))
          .filter((i) => i.length > 0);

        const language = (data.language || '').trim().toLowerCase().slice(0, 10);
        const blocked = sessionBlockList.get(sessionId);
        const blockedSids = blocked ? Array.from(blocked) : [];

        const queueUser: QueueUser = {
          socketId: socket.id,
          sessionId,
          nickname,
          interests,
          language,
          joinedAt: Date.now(),
          blockedSids,
        };

        queue.add(queueUser);
        socket.emit(EVENTS.QUEUE_STATUS, { status: 'searching' });

        // Trigger immediate matching & priority hot-swap
        matcher.matchNow();
      } catch (err) {
        logger.error('Error in join_queue', err);
        socket.emit(EVENTS.ERROR, { message: 'Failed to join queue' });
      }
    });

    // ── LEAVE QUEUE ────────────────────────────────────────
    socket.on(EVENTS.LEAVE_QUEUE, () => {
      queue.remove(socket.id);
      socket.emit(EVENTS.QUEUE_STATUS, { status: 'idle' });
    });

    // ── SEND 1-TO-1 MESSAGE ────────────────────────────────
    socket.on(EVENTS.SEND_MESSAGE, (data: { text?: string; mediaUrl?: string; mediaType?: 'image' | 'audio' }) => {
      try {
        const roomId = socketToRoom.get(socket.id);
        if (!roomId) {
          socket.emit(EVENTS.ERROR, { message: 'You are not in an active chat.' });
          return;
        }

        const rawText = typeof data.text === 'string' ? data.text.trim() : '';
        const mediaUrl = typeof data.mediaUrl === 'string' ? data.mediaUrl.trim() : undefined;
        const mediaType = data.mediaType === 'image' || data.mediaType === 'audio' ? data.mediaType : undefined;

        if (!rawText && !mediaUrl) {
          socket.emit(EVENTS.ERROR, { message: 'Message cannot be empty.' });
          return;
        }

        // Sliding rate limiter by client IP
        const clientIp = socketToIp.get(socket.id) || socket.id;
        const checkKey = rawText ? rawText : (mediaUrl || 'media');
        const rateCheck = rateLimiter.check(clientIp, checkKey);
        if (!rateCheck.allowed) {
          if (rateCheck.isRepeat) {
            socket.emit(EVENTS.ERROR, { message: "Please don't send repeated messages." });
          } else {
            socket.emit(EVENTS.RATE_LIMITED, { retryAfterMs: rateCheck.retryAfterMs });
          }
          return;
        }

        let cleanText = '';
        if (rawText) {
          cleanText = sanitizeInput(rawText, 500);
          cleanText = filterProfanity(cleanText);
        }

        const senderNick = socketToNickname.get(socket.id) || 'Stranger';
        const timestamp = Date.now();

        const messagePayload: MessagePayload = {
          id: `msg_${timestamp}_${uuidv4().slice(0, 6)}`,
          senderId: socket.id, // Forcing sender ID to socket.id
          senderNick,
          text: cleanText,
          mediaUrl,
          mediaType,
          timestamp,
        };

        const room = rooms.get(roomId);
        if (room) {
          room.messages.push(messagePayload);
          if (room.messages.length > 50) {
            room.messages = room.messages.slice(-50);
          }
        }

        const partnerSocketId = getPartnerSocketId(roomId, socket.id);
        if (partnerSocketId) {
          io.to(partnerSocketId).emit(EVENTS.MESSAGE, messagePayload);
        }
        socket.emit(EVENTS.MESSAGE, messagePayload);

        // Check if chatting with a server-side bot
        const botSession = activeBotSessions.get(socket.id);
        if (botSession) {
          handleBotMessageResponse(io, socket, botSession, cleanText || '');
        }
      } catch (err) {
        logger.error('Error in send_message', err);
      }
    });

    // ── TYPING ─────────────────────────────────────────────
    socket.on(EVENTS.TYPING, (data: { isTyping: boolean }) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const partnerSocketId = getPartnerSocketId(roomId, socket.id);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit(EVENTS.PARTNER_TYPING, { isTyping: !!data.isTyping });
      }
    });

    // ── SKIP ───────────────────────────────────────────────
    socket.on(EVENTS.SKIP, () => {
      queue.remove(socket.id);
      if (matcher.isChattingWithBot(socket.id)) {
        matcher.dropBot(socket.id);
      }
      const roomId = socketToRoom.get(socket.id);
      if (roomId) cleanupRoom(io, roomId, socket.id, matcher);
      socket.emit(EVENTS.QUEUE_STATUS, { status: 'idle' });
    });

    // ── BLOCK ──────────────────────────────────────────────
    socket.on(EVENTS.BLOCK, () => {
      if (matcher.isChattingWithBot(socket.id)) {
        matcher.dropBot(socket.id);
      }
      const sessionId = socketToSession.get(socket.id);
      const roomId = socketToRoom.get(socket.id);
      if (!sessionId || !roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const partnerIdx = room.sockets[0] === socket.id ? 1 : 0;
      const partnerSessionId = room.sessions[partnerIdx];

      if (!sessionBlockList.has(sessionId)) {
        sessionBlockList.set(sessionId, new Set());
      }
      sessionBlockList.get(sessionId)!.add(partnerSessionId);
      cleanupRoom(io, roomId, socket.id, matcher);
    });

    // ── REPORT 1-TO-1 ──────────────────────────────────────
    socket.on(EVENTS.REPORT, async (data: { reason: string; detail?: string }) => {
      try {
        const sessionId = socketToSession.get(socket.id);
        const roomId = socketToRoom.get(socket.id);
        if (!sessionId || !roomId) {
          socket.emit(EVENTS.ERROR, { message: 'Cannot report: not in a chat.' });
          return;
        }

        const room = rooms.get(roomId);
        if (!room) return;

        const validReasons = ['harassment', 'spam', 'sexual', 'underage', 'other'];
        if (!validReasons.includes(data.reason)) {
          socket.emit(EVENTS.ERROR, { message: 'Invalid report reason.' });
          return;
        }

        const partnerIdx = room.sockets[0] === socket.id ? 1 : 0;
        const partnerSessionId = room.sessions[partnerIdx];
        const partnerSocketId = room.sockets[partnerIdx];

        const reportInput: CreateReportInput = {
          reporterSid: sessionId,
          reportedSid: partnerSessionId,
          reason: data.reason,
          detail: data.detail ? sanitizeMessage(data.detail) : undefined,
          context: room.messages.slice(-20),
        };
        await createReport(reportInput);

        const wasBanned = await checkAutoBan(partnerSessionId);
        if (wasBanned) {
          enforceBan(partnerSessionId, 'Your session has been banned due to multiple user reports.');
        }

        if (!sessionBlockList.has(sessionId)) {
          sessionBlockList.set(sessionId, new Set());
        }
        sessionBlockList.get(sessionId)!.add(partnerSessionId);
        cleanupRoom(io, roomId, socket.id, matcher);

        socket.emit(EVENTS.QUEUE_STATUS, { status: 'idle' });
        socket.emit(EVENTS.ERROR, {
          message: 'Report submitted. Thank you for helping keep Omii safe.',
        });
      } catch (err) {
        logger.error('Error in report', err);
        socket.emit(EVENTS.ERROR, { message: 'Failed to submit report.' });
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // RECONNECT ENGINE (24-Hour Code)
    // ─────────────────────────────────────────────────────────────────

    socket.on(
      EVENTS.RECONNECT_REQUEST,
      async (data: { partnerSid: string; partnerNickname?: string }) => {
        try {
          const mySid = socketToSession.get(socket.id);
          const myNick = socketToNickname.get(socket.id) || 'Anonymous';
          if (!mySid || !data.partnerSid) {
            socket.emit(EVENTS.ERROR, { message: 'Unable to create reconnect code.' });
            return;
          }

          const partnerNick = data.partnerNickname || 'Stranger';
          const { code, expiresAt } = await createOrGetReconnectCode({
            user1Sid: mySid,
            user1Nick: myNick,
            user2Sid: data.partnerSid,
            user2Nick: partnerNick,
          });

          // Send reconnect code to requesting socket
          socket.emit(EVENTS.RECONNECT_CODE, {
            code,
            expiresAt: expiresAt.getTime(),
            partnerNickname: partnerNick,
          });

          // Also deliver to partner if still connected
          const partnerSocketId = sessionToSocket.get(data.partnerSid);
          if (partnerSocketId) {
            io.to(partnerSocketId).emit(EVENTS.RECONNECT_CODE, {
              code,
              expiresAt: expiresAt.getTime(),
              partnerNickname: myNick,
            });
          }
        } catch (err) {
          logger.error('Error generating reconnect code', err);
          socket.emit(EVENTS.ERROR, { message: 'Failed to generate reconnect code.' });
        }
      }
    );

    socket.on(
      EVENTS.RECONNECT_JOIN,
      async (data: { code: string; nickname?: string; sessionId?: string }) => {
        try {
          const code = (data.code || '').trim().toUpperCase();
          if (!code) {
            socket.emit(EVENTS.RECONNECT_FAILED, { message: 'Please enter a reconnect code.' });
            return;
          }

          const mySid = data.sessionId || socketToSession.get(socket.id) || socket.id;
          const myNick = sanitizeNickname(data.nickname || socketToNickname.get(socket.id) || 'Anonymous');

          socketToSession.set(socket.id, mySid);
          socketToNickname.set(socket.id, myNick);
          sessionToSocket.set(mySid, socket.id);

          const record = await verifyReconnectCode(code, mySid);

          // Check if partner is already waiting for this code
          const waiting = pendingReconnects.get(code);
          if (waiting && waiting.socketId !== socket.id) {
            // Pair them immediately into a 1-to-1 chat!
            pendingReconnects.delete(code);

            const roomId = generateRoomId();
            const room: ChatRoom = {
              id: roomId,
              sockets: [waiting.socketId, socket.id],
              sessions: [waiting.sessionId, mySid],
              nicknames: [waiting.nickname, myNick],
              messages: [],
            };

            rooms.set(roomId, room);
            socketToRoom.set(waiting.socketId, roomId);
            socketToRoom.set(socket.id, roomId);

            io.to(waiting.socketId).emit(EVENTS.MATCHED, {
              partnerNickname: myNick,
              partnerSessionId: mySid,
              sharedInterests: ['Reconnected!'],
            });
            io.to(socket.id).emit(EVENTS.MATCHED, {
              partnerNickname: waiting.nickname,
              partnerSessionId: waiting.sessionId,
              sharedInterests: ['Reconnected!'],
            });
            logger.info(`Reconnected users paired via code ${code}: ${waiting.nickname} & ${myNick}`);
          } else {
            // Save as waiting
            pendingReconnects.set(code, {
              socketId: socket.id,
              sessionId: mySid,
              nickname: myNick,
              timestamp: Date.now(),
            });
            socket.emit(EVENTS.QUEUE_STATUS, { status: 'searching' });
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Failed to redeem reconnect code.';
          socket.emit(EVENTS.RECONNECT_FAILED, { message: errMsg });
        }
      }
    );

    // ─────────────────────────────────────────────────────────────────
    // PUBLIC & PRIVATE TOPIC ROOM EVENTS
    // ─────────────────────────────────────────────────────────────────

    // ── GET ROOMS LIST ─────────────────────────────────────
    socket.on(EVENTS.ROOM_GET_LIST, () => {
      socket.emit(EVENTS.ROOM_LIST, { rooms: roomManager.getAllSummaries() });
    });

    // ── CREATE PRIVATE ROOM ────────────────────────────────
    socket.on(
      EVENTS.ROOM_CREATE_PRIVATE,
      (data: { name: string; description?: string; nickname: string; sessionId: string }) => {
        try {
          const sessionId = sanitizeInput(data.sessionId, 64) || socketToSession.get(socket.id) || socket.id;
          const nickname = sanitizeNickname(data.nickname || 'Host');
          const roomName = sanitizeInput(data.name, 50) || 'Private Room';
          const roomDesc = data.description ? sanitizeInput(data.description, 200) : undefined;

          socketToSession.set(socket.id, sessionId);
          socketToNickname.set(socket.id, nickname);

          const { room, inviteCode } = roomManager.createPrivateRoom({
            name: roomName,
            description: roomDesc,
            creatorSessionId: sessionId,
          });

          socket.emit(EVENTS.ROOM_CREATED_PRIVATE, {
            roomId: room.id,
            inviteCode,
            name: room.name,
            inviteUrl: `/r/${inviteCode}`,
          });

          broadcastRoomList(io);
        } catch (err) {
          logger.error('Error creating private room', err);
          socket.emit(EVENTS.ERROR, { message: 'Failed to create private room.' });
        }
      }
    );

    // ── JOIN ROOM ──────────────────────────────────────────
    socket.on(
      EVENTS.ROOM_JOIN,
      async (data: { roomId?: string; inviteCode?: string; roomIdentifier?: string; nickname: string; sessionId: string }) => {
        try {
          const target = (data.roomIdentifier || data.roomId || data.inviteCode || '').trim();
          if (!target) {
            socket.emit(EVENTS.ERROR, { message: 'Room identifier is required.', code: 'ROOM_NOT_FOUND' });
            return;
          }

          const room = roomManager.resolveRoom(target);
          if (!room) {
            socket.emit(EVENTS.ERROR, { message: 'Room not found or invite code expired.', code: 'ROOM_NOT_FOUND' });
            return;
          }

          const sessionId = sanitizeInput(data.sessionId, 64) || socketToSession.get(socket.id) || socket.id;
          const nickname = sanitizeNickname(data.nickname || 'Anonymous');
          const clientIp = socketToIp.get(socket.id) || getSocketClientIp(socket);

          // Check if session or IP is banned
          const banned = await isBanned(sessionId, clientIp);
          if (banned) {
            socket.emit(EVENTS.BANNED, {
              reason: 'Your session has been banned due to violations of community rules.',
            });
            return;
          }

          socketToSession.set(socket.id, sessionId);
          socketToNickname.set(socket.id, nickname);
          sessionToSocket.set(sessionId, socket.id);

          // Leave existing topic room if any
          const currentRoomId = socketToTopicRoom.get(socket.id);
          if (currentRoomId && currentRoomId !== room.id) {
            const oldRoom = roomManager.getRoom(currentRoomId);
            if (oldRoom) {
              oldRoom.removeMember(sessionId);
              socket.leave(currentRoomId);
              io.to(currentRoomId).emit(EVENTS.ROOM_USER_LEFT, { sessionId, nickname });
            }
          }

          const isCreator = room.creatorSessionId === sessionId;
          const memberResult = room.addMember({
            socketId: socket.id,
            sessionId,
            nickname,
            isCreator,
            isMuted: false,
            joinedAt: Date.now(),
          });

          if (!memberResult.success) {
            socket.emit(EVENTS.ERROR, { message: memberResult.error });
            return;
          }

          socket.join(room.id);
          socketToTopicRoom.set(socket.id, room.id);

          // Notify the newly joined client
          socket.emit(EVENTS.ROOM_JOINED, {
            room: room.getSummary(),
            isCreator,
            members: Array.from(room.members.values()),
            messages: room.messages,
          });

          // Broadcast user joined to other members in the room
          socket.to(room.id).emit(EVENTS.ROOM_USER_JOINED, {
            member: {
              sessionId,
              nickname,
              isCreator,
              isMuted: false,
              joinedAt: Date.now(),
            },
          });

          // Update public room counts
          broadcastRoomList(io);
        } catch (err) {
          logger.error('Error joining room', err);
          socket.emit(EVENTS.ERROR, { message: 'Failed to join room.' });
        }
      }
    );

    // ── LEAVE ROOM ─────────────────────────────────────────
    socket.on(EVENTS.ROOM_LEAVE, () => {
      const roomId = socketToTopicRoom.get(socket.id);
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      const sessionId = socketToSession.get(socket.id) || socket.id;
      const nickname = socketToNickname.get(socket.id) || 'Anonymous';

      if (room) {
        room.removeMember(sessionId);
        socket.leave(roomId);
        io.to(roomId).emit(EVENTS.ROOM_USER_LEFT, { sessionId, nickname });
      }

      socketToTopicRoom.delete(socket.id);
      broadcastRoomList(io);
    });

    // ── SEND ROOM MESSAGE ──────────────────────────────────
    socket.on(
      EVENTS.ROOM_SEND_MESSAGE,
      (data: { roomId: string; text?: string; mediaUrl?: string; mediaType?: 'image' | 'audio' }) => {
        try {
          const room = roomManager.getRoom(data.roomId);
          if (!room) {
            socket.emit(EVENTS.ERROR, { message: 'Room not found.' });
            return;
          }

          const sessionId = socketToSession.get(socket.id) || socket.id;
          const member = room.members.get(sessionId);
          if (!member) {
            socket.emit(EVENTS.ERROR, { message: 'You are not a member of this room.' });
            return;
          }

          if (member.isMuted) {
            socket.emit(EVENTS.ERROR, { message: 'You have been muted by the room host.' });
            return;
          }

          const rawText = typeof data.text === 'string' ? data.text.trim() : '';
          const mediaUrl = typeof data.mediaUrl === 'string' ? data.mediaUrl.trim() : undefined;
          const mediaType = data.mediaType === 'image' || data.mediaType === 'audio' ? data.mediaType : undefined;

          if (!rawText && !mediaUrl) return;

          // Per-room rate limiter by client IP
          const clientIp = socketToIp.get(socket.id) || socket.id;
          const checkKey = rawText ? rawText : (mediaUrl || 'media');
          const rateCheck = room.rateLimiter.check(clientIp, checkKey);
          if (!rateCheck.allowed) {
            if (rateCheck.isRepeat) {
              socket.emit(EVENTS.ERROR, { message: "Please don't send repeated messages." });
            } else {
              socket.emit(EVENTS.RATE_LIMITED, { retryAfterMs: rateCheck.retryAfterMs });
            }
            return;
          }

          let cleanText = '';
          if (rawText) {
            cleanText = sanitizeInput(rawText, 500);
            cleanText = filterProfanity(cleanText);
          }

          const timestamp = Date.now();
          const messageObj = {
            id: `rm_${timestamp}_${uuidv4().slice(0, 6)}`,
            senderId: socket.id, // Forcing sender ID to socket.id
            senderNick: member.nickname,
            text: cleanText,
            mediaUrl,
            mediaType,
            timestamp,
          };

          room.addMessage(messageObj);
          io.to(room.id).emit(EVENTS.ROOM_MESSAGE, messageObj);
        } catch (err) {
          logger.error('Error in room_send_message', err);
        }
      }
    );

    // ── ROOM TYPING ────────────────────────────────────────
    socket.on(EVENTS.ROOM_TYPING, (data: { roomId: string; isTyping: boolean }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;
      const sessionId = socketToSession.get(socket.id) || socket.id;
      const nickname = socketToNickname.get(socket.id) || 'Someone';

      socket.to(data.roomId).emit(EVENTS.ROOM_USER_TYPING, {
        sessionId,
        nickname,
        isTyping: !!data.isTyping,
      });
    });

    // ── ROOM KICK (Creator Only) ───────────────────────────
    socket.on(EVENTS.ROOM_KICK, (data: { roomId: string; targetSessionId: string }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      const mySid = socketToSession.get(socket.id);
      if (room.creatorSessionId !== mySid) {
        socket.emit(EVENTS.ERROR, { message: 'Only the room creator can kick members.' });
        return;
      }

      const targetMember = room.removeMember(data.targetSessionId);
      if (targetMember) {
        const targetSocket = io.sockets.sockets.get(targetMember.socketId);
        if (targetSocket) {
          targetSocket.leave(room.id);
          socketToTopicRoom.delete(targetMember.socketId);
          targetSocket.emit(EVENTS.ROOM_KICKED, {
            reason: 'You were kicked from this room by the host.',
          });
        }
        io.to(room.id).emit(EVENTS.ROOM_USER_LEFT, {
          sessionId: targetMember.sessionId,
          nickname: targetMember.nickname,
        });
        io.to(room.id).emit(EVENTS.ROOM_MEMBERS, {
          members: Array.from(room.members.values()),
        });
      }
    });

    // ── ROOM MUTE (Creator Only) ───────────────────────────
    socket.on(EVENTS.ROOM_MUTE, (data: { roomId: string; targetSessionId: string; muted: boolean }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      const mySid = socketToSession.get(socket.id);
      if (room.creatorSessionId !== mySid) {
        socket.emit(EVENTS.ERROR, { message: 'Only the room creator can mute members.' });
        return;
      }

      const targetMember = room.members.get(data.targetSessionId);
      if (targetMember) {
        targetMember.isMuted = !!data.muted;
        const targetSocket = io.sockets.sockets.get(targetMember.socketId);
        if (targetSocket) {
          targetSocket.emit(EVENTS.ROOM_MUTED, { isMuted: targetMember.isMuted });
        }
        io.to(room.id).emit(EVENTS.ROOM_MEMBERS, {
          members: Array.from(room.members.values()),
        });
      }
    });

    // ── ROOM REPORT MESSAGE ────────────────────────────────
    socket.on(
      EVENTS.ROOM_REPORT_MESSAGE,
      async (data: {
        roomId: string;
        messageId: string;
        reportedSid: string;
        messageText?: string;
        mediaUrl?: string;
        reason: string;
        detail?: string;
      }) => {
        try {
          const room = roomManager.getRoom(data.roomId);
          const reporterSid = socketToSession.get(socket.id) || socket.id;

          const validReasons = ['harassment', 'spam', 'sexual', 'underage', 'other'];
          if (!validReasons.includes(data.reason)) {
            socket.emit(EVENTS.ERROR, { message: 'Invalid report reason.' });
            return;
          }

          const reportInput: CreateReportInput = {
            reporterSid,
            reportedSid: data.reportedSid,
            roomId: data.roomId,
            roomName: room ? room.name : data.roomId,
            messageText: data.messageText,
            mediaUrl: data.mediaUrl,
            reason: data.reason,
            detail: data.detail ? sanitizeMessage(data.detail) : undefined,
            context: room ? room.messages.slice(-20) : [],
          };

          await createReport(reportInput);
          const wasBanned = await checkAutoBan(data.reportedSid);
          if (wasBanned) {
            enforceBan(data.reportedSid, 'Your session has been banned due to multiple user reports.');
          }

          socket.emit(EVENTS.ERROR, {
            message: 'Report filed. Thank you for keeping our topic communities safe.',
          });
        } catch (err) {
          logger.error('Error filing room report', err);
          socket.emit(EVENTS.ERROR, { message: 'Failed to file report.' });
        }
      }
    );

    // ─────────────────────────────────────────────────────────────────
    // FRIEND SYSTEM & PRESENCE EVENTS
    // ─────────────────────────────────────────────────────────────────

    socket.on(EVENTS.FRIEND_REGISTER, (data: { friendCode: string; nickname?: string }) => {
      if (data?.friendCode && typeof data.friendCode === 'string') {
        const cleanCode = data.friendCode.trim().toUpperCase();
        if (cleanCode) {
          socketToFriendCode.set(socket.id, cleanCode);
          friendCodeToSocket.set(cleanCode, socket.id);
          const nick = data.nickname ? sanitizeNickname(data.nickname) : (socketToNickname.get(socket.id) || 'User');
          sessionPresence.set(cleanCode, {
            isOnline: true,
            lastSeenAt: Date.now(),
            nickname: nick,
            friendCode: cleanCode,
          });
          broadcastPresenceChange(io, cleanCode, true, Date.now());
        }
      }
    });

    socket.on(EVENTS.FRIEND_PRESENCE_SUBSCRIBE, (data: { friendCodes: string[] }) => {
      const codes = Array.isArray(data?.friendCodes) ? data.friendCodes : [];
      const result: Record<string, { isOnline: boolean; lastSeenAt: number; nickname?: string }> = {};

      for (const raw of codes) {
        if (!raw || typeof raw !== 'string') continue;
        const code = raw.trim().toUpperCase();
        if (!friendSubscribers.has(code)) {
          friendSubscribers.set(code, new Set());
        }
        friendSubscribers.get(code)!.add(socket.id);

        const pres = sessionPresence.get(code);
        result[code] = {
          isOnline: pres ? pres.isOnline : false,
          lastSeenAt: pres ? pres.lastSeenAt : Date.now() - 3600000,
          nickname: pres?.nickname,
        };
      }

      socket.emit(EVENTS.FRIEND_PRESENCE_DATA, { presence: result });
    });

    socket.on(EVENTS.FRIEND_REQUEST_SEND, (data: {
      targetSessionId?: string;
      targetFriendCode?: string;
      fromNickname: string;
      fromFriendCode: string;
      fromAvatar?: string;
    }) => {
      const mySid = socketToSession.get(socket.id) || socket.id;
      const myNick = sanitizeNickname(data.fromNickname || socketToNickname.get(socket.id) || 'Stranger');
      const myCode = data.fromFriendCode?.trim().toUpperCase();
      const myAvatar = data.fromAvatar || '🦊';

      let targetSocketId: string | undefined;

      // In 1-to-1 active chat: lookup by targetSessionId
      if (data.targetSessionId) {
        targetSocketId = sessionToSocket.get(data.targetSessionId);
      }
      // By Friend Code
      if (!targetSocketId && data.targetFriendCode) {
        const cleanTargetCode = data.targetFriendCode.trim().toUpperCase();
        if (cleanTargetCode === myCode) {
          socket.emit(EVENTS.ERROR, { message: 'You cannot send a friend request to yourself.' });
          return;
        }
        targetSocketId = friendCodeToSocket.get(cleanTargetCode);
      }

      const requestId = `freq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const requestPayload = {
        id: requestId,
        fromSessionId: mySid,
        fromFriendCode: myCode || '',
        fromNickname: myNick,
        fromAvatar: myAvatar,
        toSessionId: data.targetSessionId,
        toFriendCode: data.targetFriendCode?.trim().toUpperCase(),
        timestamp: Date.now(),
      };

      pendingFriendRequests.set(requestId, requestPayload);

      if (targetSocketId) {
        io.to(targetSocketId).emit(EVENTS.FRIEND_REQUEST_RECEIVED, {
          requestId,
          fromSessionId: mySid,
          fromFriendCode: myCode,
          fromNickname: myNick,
          fromAvatar: myAvatar,
          timestamp: Date.now(),
        });
      }

      socket.emit(EVENTS.FRIEND_REQUEST_SEND, {
        status: 'sent',
        requestId,
        targetFriendCode: data.targetFriendCode,
        delivered: !!targetSocketId,
      });
    });

    socket.on(EVENTS.FRIEND_REQUEST_RESPOND, (data: {
      requestId: string;
      accepted: boolean;
    }) => {
      const req = pendingFriendRequests.get(data.requestId);
      if (!req) {
        socket.emit(EVENTS.ERROR, { message: 'Friend request not found or expired.' });
        return;
      }

      const responderSid = socketToSession.get(socket.id) || socket.id;
      const responderNick = socketToNickname.get(socket.id) || 'Friend';
      const responderCode = socketToFriendCode.get(socket.id) || req.toFriendCode || '';

      const requesterSocketId = sessionToSocket.get(req.fromSessionId) ||
        (req.fromFriendCode ? friendCodeToSocket.get(req.fromFriendCode) : undefined);

      pendingFriendRequests.delete(data.requestId);

      if (data.accepted) {
        // Mutual acceptance confirmed!
        const friendshipId = `fr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        if (requesterSocketId) {
          io.to(requesterSocketId).emit(EVENTS.FRIEND_REQUEST_RESOLVED, {
            requestId: data.requestId,
            accepted: true,
            friend: {
              id: friendshipId,
              nickname: responderNick,
              friendCode: responderCode,
              avatar: '🦊',
              isOnline: true,
              lastSeenAt: Date.now(),
            },
            isInitiator: true,
          });
        }

        socket.emit(EVENTS.FRIEND_REQUEST_RESOLVED, {
          requestId: data.requestId,
          accepted: true,
          friend: {
            id: friendshipId,
            nickname: req.fromNickname,
            friendCode: req.fromFriendCode,
            avatar: req.fromAvatar || '🦊',
            isOnline: !!requesterSocketId,
            lastSeenAt: Date.now(),
          },
          isInitiator: false,
        });
      } else {
        // Declined
        if (requesterSocketId) {
          io.to(requesterSocketId).emit(EVENTS.FRIEND_REQUEST_RESOLVED, {
            requestId: data.requestId,
            accepted: false,
            reason: 'declined',
            responderNickname: responderNick,
          });
        }
      }
    });

    socket.on(EVENTS.FRIEND_CHAT_INVITE, (data: { friendCode: string }) => {
      const targetCode = data.friendCode?.trim().toUpperCase();
      const targetSocketId = friendCodeToSocket.get(targetCode);
      const myNick = socketToNickname.get(socket.id) || 'Friend';
      const mySid = socketToSession.get(socket.id) || socket.id;

      const { room, inviteCode } = roomManager.createPrivateRoom({
        name: `Chat with ${myNick}`,
        creatorSessionId: mySid,
      });
      socket.emit(EVENTS.ROOM_CREATED_PRIVATE, {
        roomId: room.id,
        inviteCode,
        room: room.getSummary(),
      });

      if (targetSocketId) {
        io.to(targetSocketId).emit(EVENTS.FRIEND_CHAT_INVITE, {
          roomId: room.id,
          roomName: room.name,
          inviteCode,
          inviterNickname: myNick,
        });
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      onlineCount = Math.max(0, onlineCount - 1);
      broadcastOnlineCount(io);

      if (matcher.isChattingWithBot(socket.id)) {
        matcher.dropBot(socket.id);
      }

      // Clean up Friend Presence
      const friendCode = socketToFriendCode.get(socket.id);
      if (friendCode) {
        sessionPresence.set(friendCode, {
          isOnline: false,
          lastSeenAt: Date.now(),
          nickname: socketToNickname.get(socket.id) || 'User',
          friendCode,
        });
        broadcastPresenceChange(io, friendCode, false, Date.now());
        socketToFriendCode.delete(socket.id);
        friendCodeToSocket.delete(friendCode);
      }

      // Remove from friend presence subscriptions
      for (const [, subscribers] of friendSubscribers) {
        subscribers.delete(socket.id);
      }

      // Clean up 1-to-1 room if any
      const roomId = socketToRoom.get(socket.id);
      if (roomId) cleanupRoom(io, roomId, socket.id, matcher);

      // Clean up Topic room if any
      const topicRoomId = socketToTopicRoom.get(socket.id);
      const sessionId = socketToSession.get(socket.id) || socket.id;
      const nickname = socketToNickname.get(socket.id) || 'Anonymous';

      if (topicRoomId) {
        const room = roomManager.getRoom(topicRoomId);
        if (room) {
          room.removeMember(sessionId);
          io.to(topicRoomId).emit(EVENTS.ROOM_USER_LEFT, { sessionId, nickname });
        }
        socketToTopicRoom.delete(socket.id);
        broadcastRoomList(io);
      }

      queue.remove(socket.id);
      rateLimiter.remove(socket.id);
      tokenBucket.remove(socket.id);
      socketToIp.delete(socket.id);
      socketToSession.delete(socket.id);
      socketToNickname.delete(socket.id);
      sessionToSocket.delete(sessionId);

      logger.debug(`Socket disconnected: ${socket.id} (online: ${onlineCount})`);
    });
  });
}
