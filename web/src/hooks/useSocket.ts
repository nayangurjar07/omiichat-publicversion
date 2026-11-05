'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket, reconnectSocket, SOCKET_EVENTS } from '@/lib/socket';
import { getSessionId, getStoredNickname } from '@/lib/session';
import { sounds } from '@/lib/sound';
import {
  ChatMessage,
  ChatStatus,
  MatchData,
  ReportReason,
  RoomSummary,
  RoomMember,
  RoomMessage,
  ReconnectInfo,
} from '@/types';
import {
  SavedFriend,
  FriendRequest,
  getLocalFriends,
  saveLocalFriend,
  removeLocalFriend,
  getStoredRequests,
  saveStoredRequest,
  removeStoredRequest,
  updateFriendsPresence,
  getMyFriendCode,
} from '@/lib/friends';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useSocket() {
  // ─── Connection & Network State ───────────────────────────
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // ─── 1-to-1 Random Chat State ─────────────────────────────
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [partnerNickname, setPartnerNickname] = useState<string>('Stranger');
  const [partnerSessionId, setPartnerSessionId] = useState<string | null>(null);
  const [sharedInterests, setSharedInterests] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partnerTyping, setPartnerTyping] = useState<boolean>(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitedNotice, setRateLimitedNotice] = useState<string | null>(null);
  const [reconnectInfo, setReconnectInfo] = useState<ReconnectInfo | null>(null);

  // ─── Topic & Private Rooms State ──────────────────────────
  const [roomList, setRoomList] = useState<RoomSummary[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomSummary | null>(null);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [isRoomCreator, setIsRoomCreator] = useState<boolean>(false);
  const [isRoomMuted, setIsRoomMuted] = useState<boolean>(false);
  const [roomTypingUsers, setRoomTypingUsers] = useState<string[]>([]);
  const [kickedReason, setKickedReason] = useState<string | null>(null);
  const [roomJoinError, setRoomJoinError] = useState<{ message: string; code?: string } | null>(null);

  // ─── Friends & Presence State ─────────────────────────────
  const [friends, setFriends] = useState<SavedFriend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [activePartnerFriendRequest, setActivePartnerFriendRequest] = useState<FriendRequest | null>(null);
  const [friendRequestFeedback, setFriendRequestFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [friendChatInvite, setFriendChatInvite] = useState<{ roomId: string; roomName: string; inviteCode: string; inviterNickname: string } | null>(null);

  const sessionIdRef = useRef<string>(getSessionId());
  const partnerSessionIdRef = useRef<string | null>(null);
  const statusRef = useRef<ChatStatus>('idle');
  const lastQueueParamsRef = useRef<{ nickname: string; interests: string[]; language: string } | null>(null);
  const currentRoomRef = useRef<RoomSummary | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const roomTypingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Synchronize refs
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    partnerSessionIdRef.current = partnerSessionId;
  }, [partnerSessionId]);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  // Initial load of local friends and requests
  useEffect(() => {
    setFriends(getLocalFriends());
    setFriendRequests(getStoredRequests());
  }, []);

  const retryConnection = useCallback(() => {
    setConnectionState('connecting');
    const s = reconnectSocket();
    if (s.connected) {
      setConnectionState('connected');
      setIsConnected(true);
    }
  }, []);

  useEffect(() => {
    sessionIdRef.current = getSessionId();
    const socket = getSocket();

    if (socket.connected) {
      setConnectionState('connected');
      setIsConnected(true);
    } else {
      setConnectionState('connecting');
      socket.connect();
    }

    // ─── 1-to-1 Handlers ────────────────────────────────────
    const onOnlineCount = (data: { count: number }) => {
      setOnlineCount(data.count);
    };

    const onQueueStatus = (data: { status: 'searching' | 'idle' }) => {
      if (data.status === 'searching') {
        setStatus('searching');
        setMessages([]);
        setPartnerTyping(false);
      } else if (data.status === 'idle') {
        setStatus('idle');
      }
    };

    const onMatched = (data: MatchData) => {
      setStatus('matched');
      setPartnerNickname(data.partnerNickname || 'Stranger');
      setPartnerSessionId(data.partnerSessionId || null);
      partnerSessionIdRef.current = data.partnerSessionId || null;
      setActivePartnerFriendRequest(null);
      setSharedInterests(data.sharedInterests || []);
      setMessages([]);
      setPartnerTyping(false);
      setReconnectInfo(null);
      sounds.playMatchChime();
    };

    const onMessage = (data: {
      id?: string;
      senderId: string;
      senderNick?: string;
      text?: string;
      mediaUrl?: string;
      mediaType?: 'image' | 'audio';
      timestamp: number;
    }) => {
      const isSelf = data.senderId === sessionIdRef.current || (!!socket.id && data.senderId === socket.id);
      setMessages((prev) => [
        ...prev,
        {
          id: data.id || `${data.timestamp}-${Math.random()}`,
          senderId: data.senderId,
          senderNick: data.senderNick,
          text: data.text,
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType,
          timestamp: data.timestamp,
          isSelf,
        },
      ]);

      if (!isSelf) {
        sounds.playMessagePop();
        setPartnerTyping(false);
      }
    };

    const onPartnerTyping = (data: { isTyping: boolean }) => {
      setPartnerTyping(data.isTyping);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (data.isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          setPartnerTyping(false);
        }, 4000);
      }
    };

    const onPartnerLeft = () => {
      setStatus('partner_left');
      partnerSessionIdRef.current = null;
      setActivePartnerFriendRequest(null);
      setPartnerTyping(false);
      sounds.playPartnerLeft();
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          senderId: 'system',
          text: 'Stranger disconnected from the chat.',
          timestamp: Date.now(),
          isSelf: false,
          isSystem: true,
        },
      ]);
    };

    const onRateLimited = (data: { retryAfterMs: number }) => {
      const seconds = Math.ceil((data.retryAfterMs || 2000) / 1000);
      setRateLimitedNotice(`Slow down. Please wait ${seconds}s before sending more.`);
      setTimeout(() => setRateLimitedNotice(null), data.retryAfterMs || 2000);
    };

    const onBanned = (data: { reason: string }) => {
      setStatus('banned');
      setBanReason(data.reason || 'Your session has been banned due to violations.');
    };

    const onError = (data: { message: string; code?: string }) => {
      setErrorMessage(data.message);
      if (data.code === 'ROOM_NOT_FOUND' || data.code === 'ROOM_FULL') {
        setRoomJoinError({ message: data.message, code: data.code });
      }
      setTimeout(() => setErrorMessage(null), 5000);
    };

    // ─── Reconnect Handlers ─────────────────────────────────
    const onReconnectCode = (data: ReconnectInfo) => {
      setReconnectInfo(data);
      sounds.playMatchChime();
    };

    const onReconnectFailed = (data: { message: string }) => {
      setErrorMessage(data.message);
      setTimeout(() => setErrorMessage(null), 5000);
    };

    // ─── Topic Room Handlers ────────────────────────────────
    const onRoomList = (data: { rooms: RoomSummary[] }) => {
      setRoomList(data.rooms || []);
    };

    const onRoomJoined = (data: {
      room: RoomSummary;
      isCreator: boolean;
      members: RoomMember[];
      messages: RoomMessage[];
    }) => {
      setCurrentRoom(data.room);
      setIsRoomCreator(data.isCreator);
      setRoomMembers(data.members || []);
      setRoomMessages(data.messages || []);
      setIsRoomMuted(false);
      setRoomJoinError(null);
      sounds.playMatchChime();
    };

    const onRoomUserJoined = (data: { member: RoomMember }) => {
      setRoomMembers((prev) => {
        const filtered = prev.filter((m) => m.sessionId !== data.member.sessionId);
        return [...filtered, data.member];
      });
      setRoomMessages((prev) => [
        ...prev,
        {
          id: `sys_join_${Date.now()}_${Math.random()}`,
          senderId: 'system',
          senderNick: 'System',
          text: `${data.member.nickname} joined the room.`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ]);
    };

    const onRoomUserLeft = (data: { sessionId: string; nickname: string }) => {
      setRoomMembers((prev) => prev.filter((m) => m.sessionId !== data.sessionId));
      setRoomMessages((prev) => [
        ...prev,
        {
          id: `sys_left_${Date.now()}_${Math.random()}`,
          senderId: 'system',
          senderNick: 'System',
          text: `${data.nickname} left the room.`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ]);
    };

    const onRoomMessage = (msg: RoomMessage) => {
      setRoomMessages((prev) => [...prev, msg]);
      if (msg.senderId !== sessionIdRef.current && (!socket.id || msg.senderId !== socket.id)) {
        sounds.playMessagePop();
      }
    };

    const onRoomMembers = (data: { members: RoomMember[] }) => {
      setRoomMembers(data.members || []);
    };

    const onRoomKicked = (data: { reason: string }) => {
      setCurrentRoom(null);
      setRoomMessages([]);
      setRoomMembers([]);
      setKickedReason(data.reason || 'You were removed from the room.');
    };

    const onRoomMuted = (data: { isMuted: boolean }) => {
      setIsRoomMuted(data.isMuted);
    };

    const onRoomUserTyping = (data: { sessionId: string; nickname: string; isTyping: boolean }) => {
      setRoomTypingUsers((prev) => {
        if (data.isTyping) {
          return prev.includes(data.nickname) ? prev : [...prev, data.nickname];
        } else {
          return prev.filter((n) => n !== data.nickname);
        }
      });

      if (data.isTyping) {
        const existing = roomTypingTimeoutsRef.current.get(data.sessionId);
        if (existing) clearTimeout(existing);
        const timeout = setTimeout(() => {
          setRoomTypingUsers((prev) => prev.filter((n) => n !== data.nickname));
          roomTypingTimeoutsRef.current.delete(data.sessionId);
        }, 3000);
        roomTypingTimeoutsRef.current.set(data.sessionId, timeout);
      }
    };

    // ─── Friend System Handlers ──────────────────────────────
    const onFriendRequestReceived = (data: {
      requestId: string;
      fromSessionId?: string;
      fromFriendCode: string;
      fromNickname: string;
      fromAvatar?: string;
      timestamp: number;
    }) => {
      const req: FriendRequest = {
        id: data.requestId,
        fromSessionId: data.fromSessionId,
        fromFriendCode: data.fromFriendCode,
        fromNickname: data.fromNickname || 'Stranger',
        fromAvatar: data.fromAvatar || '🦊',
        timestamp: data.timestamp || Date.now(),
        direction: 'incoming',
      };
      saveStoredRequest(req);
      setFriendRequests(getStoredRequests());
      sounds.playMatchChime();

      if (partnerSessionIdRef.current && partnerSessionIdRef.current === data.fromSessionId) {
        setActivePartnerFriendRequest(req);
      }
    };

    const onFriendRequestResolved = (data: {
      requestId: string;
      accepted: boolean;
      friend?: SavedFriend;
      isInitiator?: boolean;
      reason?: string;
      responderNickname?: string;
    }) => {
      removeStoredRequest(data.requestId);
      setFriendRequests(getStoredRequests());
      setActivePartnerFriendRequest((prev) => (prev?.id === data.requestId ? null : prev));

      if (data.accepted && data.friend) {
        saveLocalFriend(data.friend);
        const updated = getLocalFriends();
        setFriends(updated);
        sounds.playMatchChime();
        setFriendRequestFeedback({
          type: 'success',
          message: `${data.friend.nickname || data.friend.friendCode} accepted your friend request!`,
        });

        socket.emit(SOCKET_EVENTS.FRIEND_PRESENCE_SUBSCRIBE, {
          friendCodes: [data.friend.friendCode],
        });
      } else {
        setFriendRequestFeedback({
          type: 'info',
          message: data.responderNickname
            ? `${data.responderNickname} declined the friend request.`
            : 'Friend request was declined.',
        });
      }
      setTimeout(() => setFriendRequestFeedback(null), 5000);
    };

    const onFriendPresenceData = (data: {
      presence: Record<string, { isOnline: boolean; lastSeenAt?: number; nickname?: string }>;
    }) => {
      if (data?.presence) {
        updateFriendsPresence(data.presence as Record<string, { isOnline: boolean; lastSeenAt: number }>);
        setFriends(getLocalFriends());
      }
    };

    const onFriendPresenceUpdate = (data: {
      friendCode: string;
      isOnline: boolean;
      lastSeenAt?: number;
      nickname?: string;
    }) => {
      if (data?.friendCode) {
        updateFriendsPresence({
          [data.friendCode]: {
            isOnline: data.isOnline,
            lastSeenAt: data.lastSeenAt || Date.now(),
          },
        });
        setFriends(getLocalFriends());
      }
    };

    const onFriendChatInvite = (data: {
      roomId: string;
      roomName: string;
      inviteCode: string;
      inviterNickname: string;
    }) => {
      setFriendChatInvite(data);
      sounds.playMatchChime();
    };

    // Socket subscriptions
    socket.on(SOCKET_EVENTS.ONLINE_COUNT, onOnlineCount);
    socket.on(SOCKET_EVENTS.QUEUE_STATUS, onQueueStatus);
    socket.on(SOCKET_EVENTS.MATCHED, onMatched);
    socket.on(SOCKET_EVENTS.MESSAGE, onMessage);
    socket.on(SOCKET_EVENTS.PARTNER_TYPING, onPartnerTyping);
    socket.on(SOCKET_EVENTS.PARTNER_LEFT, onPartnerLeft);
    socket.on(SOCKET_EVENTS.RATE_LIMITED, onRateLimited);
    socket.on(SOCKET_EVENTS.BANNED, onBanned);
    socket.on(SOCKET_EVENTS.ERROR, onError);

    socket.on(SOCKET_EVENTS.RECONNECT_CODE, onReconnectCode);
    socket.on(SOCKET_EVENTS.RECONNECT_FAILED, onReconnectFailed);

    socket.on(SOCKET_EVENTS.ROOM_LIST, onRoomList);
    socket.on(SOCKET_EVENTS.ROOM_JOINED, onRoomJoined);
    socket.on(SOCKET_EVENTS.ROOM_USER_JOINED, onRoomUserJoined);
    socket.on(SOCKET_EVENTS.ROOM_USER_LEFT, onRoomUserLeft);
    socket.on(SOCKET_EVENTS.ROOM_MESSAGE, onRoomMessage);
    socket.on(SOCKET_EVENTS.ROOM_MEMBERS, onRoomMembers);
    socket.on(SOCKET_EVENTS.ROOM_KICKED, onRoomKicked);
    socket.on(SOCKET_EVENTS.ROOM_MUTED, onRoomMuted);
    socket.on(SOCKET_EVENTS.ROOM_USER_TYPING, onRoomUserTyping);

    // Friend events
    socket.on(SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, onFriendRequestReceived);
    socket.on(SOCKET_EVENTS.FRIEND_REQUEST_RESOLVED, onFriendRequestResolved);
    socket.on(SOCKET_EVENTS.FRIEND_PRESENCE_DATA, onFriendPresenceData);
    socket.on(SOCKET_EVENTS.FRIEND_PRESENCE_UPDATE, onFriendPresenceUpdate);
    socket.on(SOCKET_EVENTS.FRIEND_CHAT_INVITE, onFriendChatInvite);

    const onConnect = () => {
      setConnectionState('connected');
      setIsConnected(true);
      sessionIdRef.current = getSessionId();
      socket.emit(SOCKET_EVENTS.ROOM_GET_LIST);

      // Register presence with my friend code
      socket.emit(SOCKET_EVENTS.FRIEND_REGISTER, {
        sessionId: sessionIdRef.current,
        friendCode: getMyFriendCode(),
        nickname: getStoredNickname() || 'Anonymous',
      });

      // Subscribe to friends presence
      const currentFriends = getLocalFriends();
      if (currentFriends.length > 0) {
        socket.emit(SOCKET_EVENTS.FRIEND_PRESENCE_SUBSCRIBE, {
          friendCodes: currentFriends.map((f) => f.friendCode),
        });
      }

      // Auto-recovery
      if (statusRef.current === 'searching' && lastQueueParamsRef.current) {
        socket.emit(SOCKET_EVENTS.JOIN_QUEUE, {
          sessionId: sessionIdRef.current,
          ...lastQueueParamsRef.current,
        });
      } else if (currentRoomRef.current) {
        socket.emit(SOCKET_EVENTS.ROOM_JOIN, {
          roomIdentifier: currentRoomRef.current.id,
          nickname: getStoredNickname() || 'Anonymous',
          sessionId: sessionIdRef.current,
        });
      }
    };

    const onDisconnect = () => {
      setConnectionState('disconnected');
      setIsConnected(false);
      // Immediately disconnect active match if socket drops
      if (statusRef.current === 'matched') {
        setStatus('partner_left');
        setMessages((prev) => [
          ...prev,
          {
            id: `sys_disconnected_${Date.now()}`,
            senderId: 'system',
            text: 'Connection lost. The conversation has ended.',
            timestamp: Date.now(),
            isSelf: false,
            isSystem: true,
          },
        ]);
      }
    };

    const onConnectError = () => {
      setConnectionState('error');
      setIsConnected(false);
    };

    const handleBrowserOffline = () => {
      setConnectionState('disconnected');
      setIsConnected(false);
      if (statusRef.current === 'matched') {
        setStatus('partner_left');
        setMessages((prev) => [
          ...prev,
          {
            id: `sys_offline_${Date.now()}`,
            senderId: 'system',
            text: 'Your device went offline. Conversation disconnected.',
            timestamp: Date.now(),
            isSelf: false,
            isSystem: true,
          },
        ]);
      }
      socket.disconnect();
    };

    const handleBrowserOnline = () => {
      setConnectionState('connecting');
      socket.connect();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('offline', handleBrowserOffline);
      window.addEventListener('online', handleBrowserOnline);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // Initial fetch of rooms
    socket.emit(SOCKET_EVENTS.ROOM_GET_LIST);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('offline', handleBrowserOffline);
        window.removeEventListener('online', handleBrowserOnline);
      }
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off(SOCKET_EVENTS.ONLINE_COUNT, onOnlineCount);
      socket.off(SOCKET_EVENTS.QUEUE_STATUS, onQueueStatus);
      socket.off(SOCKET_EVENTS.MATCHED, onMatched);
      socket.off(SOCKET_EVENTS.MESSAGE, onMessage);
      socket.off(SOCKET_EVENTS.PARTNER_TYPING, onPartnerTyping);
      socket.off(SOCKET_EVENTS.PARTNER_LEFT, onPartnerLeft);
      socket.off(SOCKET_EVENTS.RATE_LIMITED, onRateLimited);
      socket.off(SOCKET_EVENTS.BANNED, onBanned);
      socket.off(SOCKET_EVENTS.ERROR, onError);

      socket.off(SOCKET_EVENTS.RECONNECT_CODE, onReconnectCode);
      socket.off(SOCKET_EVENTS.RECONNECT_FAILED, onReconnectFailed);

      socket.off(SOCKET_EVENTS.ROOM_LIST, onRoomList);
      socket.off(SOCKET_EVENTS.ROOM_JOINED, onRoomJoined);
      socket.off(SOCKET_EVENTS.ROOM_USER_JOINED, onRoomUserJoined);
      socket.off(SOCKET_EVENTS.ROOM_USER_LEFT, onRoomUserLeft);
      socket.off(SOCKET_EVENTS.ROOM_MESSAGE, onRoomMessage);
      socket.off(SOCKET_EVENTS.ROOM_MEMBERS, onRoomMembers);
      socket.off(SOCKET_EVENTS.ROOM_KICKED, onRoomKicked);
      socket.off(SOCKET_EVENTS.ROOM_MUTED, onRoomMuted);
      socket.off(SOCKET_EVENTS.ROOM_USER_TYPING, onRoomUserTyping);

      socket.off(SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, onFriendRequestReceived);
      socket.off(SOCKET_EVENTS.FRIEND_REQUEST_RESOLVED, onFriendRequestResolved);
      socket.off(SOCKET_EVENTS.FRIEND_PRESENCE_DATA, onFriendPresenceData);
      socket.off(SOCKET_EVENTS.FRIEND_PRESENCE_UPDATE, onFriendPresenceUpdate);
      socket.off(SOCKET_EVENTS.FRIEND_CHAT_INVITE, onFriendChatInvite);
    };
  }, []);

  // ─── 1-to-1 Methods ───────────────────────────────────────
  const joinQueue = useCallback((nickname: string, interests: string[] = [], language = 'any') => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    statusRef.current = 'searching';
    lastQueueParamsRef.current = { nickname, interests, language };
    setStatus('searching');
    setMessages([]);
    setPartnerTyping(false);
    socket.emit(SOCKET_EVENTS.JOIN_QUEUE, {
      sessionId: sessionIdRef.current || getSessionId(),
      nickname: nickname || getStoredNickname() || 'Anonymous',
      interests,
      language,
    });
  }, []);

  const leaveQueue = useCallback(() => {
    const socket = getSocket();
    statusRef.current = 'idle';
    lastQueueParamsRef.current = null;
    socket.emit(SOCKET_EVENTS.LEAVE_QUEUE);
    setStatus('idle');
  }, []);

  const sendMessage = useCallback((text?: string, mediaUrl?: string, mediaType?: 'image' | 'audio') => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.SEND_MESSAGE, { text, mediaUrl, mediaType });
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.TYPING, { isTyping });
  }, []);

  const skip = useCallback(() => {
    const socket = getSocket();
    statusRef.current = 'idle';
    socket.emit(SOCKET_EVENTS.SKIP);
    setStatus('idle');
    setMessages([]);
    setPartnerTyping(false);
  }, []);

  const block = useCallback(() => {
    const socket = getSocket();
    statusRef.current = 'idle';
    socket.emit(SOCKET_EVENTS.BLOCK);
    setStatus('idle');
    setMessages([]);
    setPartnerTyping(false);
  }, []);

  const report = useCallback((reason: ReportReason, detail?: string) => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.REPORT, { reason, detail });
  }, []);

  const requestReconnect = useCallback((partnerSid?: string) => {
    const target = partnerSid || partnerSessionIdRef.current;
    if (!target) return;
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.RECONNECT_REQUEST, { partnerSid: target });
  }, []);

  const joinByReconnectCode = useCallback((code: string, nickname?: string) => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    setStatus('searching');
    setMessages([]);
    socket.emit(SOCKET_EVENTS.RECONNECT_JOIN, {
      code: code.trim().toUpperCase(),
      sessionId: sessionIdRef.current || getSessionId(),
      nickname: nickname || getStoredNickname() || 'Anonymous',
    });
  }, []);

  // ─── Topic Room Methods ───────────────────────────────────
  const fetchRoomList = useCallback(() => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.ROOM_GET_LIST);
  }, []);

  const joinRoom = useCallback((roomIdentifier: string, nickname?: string): Promise<RoomSummary> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
      if (!socket.connected) socket.connect();
      const cleanNick = nickname || getStoredNickname() || 'Anonymous';
      const cleanId = roomIdentifier.trim();

      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        clearTimeout(timeoutId);
        socket.off(SOCKET_EVENTS.ROOM_JOINED, onJoined);
        socket.off(SOCKET_EVENTS.ERROR, onError);
      };

      const onJoined = (data: { room: RoomSummary }) => {
        cleanup();
        setRoomJoinError(null);
        resolve(data.room);
      };

      const onError = (data: { message: string; code?: string }) => {
        cleanup();
        setRoomJoinError({ message: data.message, code: data.code });
        reject(new Error(data.message || 'Failed to join room'));
      };

      timeoutId = setTimeout(() => {
        cleanup();
        const msg = "Can't reach the server. Joining room timed out.";
        setRoomJoinError({ message: msg, code: 'TIMEOUT' });
        reject(new Error(msg));
      }, 10000);

      socket.once(SOCKET_EVENTS.ROOM_JOINED, onJoined);
      socket.once(SOCKET_EVENTS.ERROR, onError);

      socket.emit(SOCKET_EVENTS.ROOM_JOIN, {
        roomIdentifier: cleanId,
        roomId: cleanId,
        inviteCode: cleanId,
        nickname: cleanNick,
        sessionId: sessionIdRef.current || getSessionId(),
      });
    });
  }, []);

  const leaveRoom = useCallback(() => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.ROOM_LEAVE);
    currentRoomRef.current = null;
    setCurrentRoom(null);
    setRoomMessages([]);
    setRoomMembers([]);
    setRoomJoinError(null);
  }, []);

  const sendRoomMessage = useCallback(
    (text?: string, mediaUrl?: string, mediaType?: 'image' | 'audio') => {
      if (!currentRoom) return;
      const socket = getSocket();
      const cleanText = (text || '').trim();
      if (!cleanText && !mediaUrl) return;

      socket.emit(SOCKET_EVENTS.ROOM_SEND_MESSAGE, {
        roomId: currentRoom.id,
        text: cleanText,
        mediaUrl,
        mediaType,
      });
    },
    [currentRoom]
  );

  const sendRoomTyping = useCallback(
    (isTyping: boolean) => {
      if (!currentRoom) return;
      const socket = getSocket();
      socket.emit(SOCKET_EVENTS.ROOM_TYPING, {
        roomId: currentRoom.id,
        isTyping,
      });
    },
    [currentRoom]
  );

  const kickRoomMember = useCallback(
    (targetSessionId: string) => {
      if (!currentRoom || !isRoomCreator) return;
      const socket = getSocket();
      socket.emit(SOCKET_EVENTS.ROOM_KICK, {
        roomId: currentRoom.id,
        targetSessionId,
      });
    },
    [currentRoom, isRoomCreator]
  );

  const muteRoomMember = useCallback(
    (targetSessionId: string, muted: boolean) => {
      if (!currentRoom || !isRoomCreator) return;
      const socket = getSocket();
      socket.emit(SOCKET_EVENTS.ROOM_MUTE, {
        roomId: currentRoom.id,
        targetSessionId,
        muted,
      });
    },
    [currentRoom, isRoomCreator]
  );

  const createPrivateRoom = useCallback(
    (
      name: string,
      description?: string,
      nickname?: string
    ): Promise<{ roomId: string; inviteCode: string; inviteUrl: string }> => {
      return new Promise((resolve, reject) => {
        const socket = getSocket();
        if (!socket.connected) socket.connect();

        let timeoutId: NodeJS.Timeout;

        const cleanup = () => {
          clearTimeout(timeoutId);
          socket.off(SOCKET_EVENTS.ROOM_CREATED_PRIVATE, onCreated);
          socket.off(SOCKET_EVENTS.ERROR, onError);
        };

        const onCreated = (data: { roomId: string; inviteCode: string; inviteUrl: string }) => {
          cleanup();
          resolve(data);
        };

        const onError = (data: { message: string }) => {
          cleanup();
          reject(new Error(data.message || 'Failed to create private room'));
        };

        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error("Can't reach the server. Room creation timed out."));
        }, 10000);

        socket.once(SOCKET_EVENTS.ROOM_CREATED_PRIVATE, onCreated);
        socket.once(SOCKET_EVENTS.ERROR, onError);

        socket.emit(SOCKET_EVENTS.ROOM_CREATE_PRIVATE, {
          name,
          description,
          nickname: nickname || getStoredNickname() || 'Host',
          sessionId: sessionIdRef.current || getSessionId(),
        });
      });
    },
    []
  );

  const reportRoomMessage = useCallback(
    (params: {
      messageId: string;
      reportedSid: string;
      messageText?: string;
      mediaUrl?: string;
      reason: string;
      detail?: string;
    }) => {
      if (!currentRoom) return;
      const socket = getSocket();
      socket.emit(SOCKET_EVENTS.ROOM_REPORT_MESSAGE, {
        roomId: currentRoom.id,
        ...params,
      });
    },
    [currentRoom]
  );

  // ─── Friend System Methods ────────────────────────────────
  const sendFriendRequest = useCallback(
    (params: { targetFriendCode?: string; targetSessionId?: string }) => {
      const socket = getSocket();
      const myCode = getMyFriendCode();
      const myNick = getStoredNickname() || 'Anonymous';

      if (params.targetFriendCode) {
        const cleanTarget = params.targetFriendCode.trim().toUpperCase();
        if (cleanTarget === myCode.toUpperCase()) {
          setFriendRequestFeedback({ type: 'error', message: 'You cannot add yourself as a friend.' });
          return { success: false, message: 'You cannot add yourself as a friend.' };
        }
        const alreadyFriend = getLocalFriends().some((f) => f.friendCode?.toUpperCase() === cleanTarget);
        if (alreadyFriend) {
          setFriendRequestFeedback({ type: 'info', message: 'This person is already in your friends list.' });
          return { success: false, message: 'Already in your friends list.' };
        }
      }

      const targetSid =
        params.targetSessionId ||
        (statusRef.current === 'matched' ? partnerSessionIdRef.current || undefined : undefined);

      socket.emit(SOCKET_EVENTS.FRIEND_REQUEST_SEND, {
        targetFriendCode: params.targetFriendCode?.trim().toUpperCase(),
        targetSessionId: targetSid,
        fromFriendCode: myCode,
        fromNickname: myNick,
      });

      // Record outgoing request locally if targeting by friend code
      if (params.targetFriendCode) {
        const req: FriendRequest = {
          id: `req_out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          fromFriendCode: params.targetFriendCode.trim().toUpperCase(),
          fromNickname: 'Stranger',
          fromAvatar: '🦊',
          timestamp: Date.now(),
          direction: 'outgoing',
        };
        saveStoredRequest(req);
        setFriendRequests(getStoredRequests());
      }

      setFriendRequestFeedback({
        type: 'success',
        message: 'Friend request sent! Waiting for acceptance.',
      });
      setTimeout(() => setFriendRequestFeedback(null), 4000);
      return { success: true, message: 'Friend request sent!' };
    },
    []
  );

  const respondFriendRequest = useCallback((requestId: string, accepted: boolean) => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.FRIEND_REQUEST_RESPOND, {
      requestId,
      accepted,
    });
    removeStoredRequest(requestId);
    setFriendRequests(getStoredRequests());
    setActivePartnerFriendRequest((prev) => (prev?.id === requestId ? null : prev));
    if (!accepted) {
      setFriendRequestFeedback({ type: 'info', message: 'Friend request declined.' });
      setTimeout(() => setFriendRequestFeedback(null), 3000);
    }
  }, []);

  const cancelFriendRequest = useCallback((requestId: string) => {
    removeStoredRequest(requestId);
    setFriendRequests(getStoredRequests());
  }, []);

  const removeFriend = useCallback((friendCodeOrId: string) => {
    removeLocalFriend(friendCodeOrId);
    setFriends(getLocalFriends());
  }, []);

  const inviteFriendToChat = useCallback((friendCode: string) => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.FRIEND_CHAT_INVITE, { friendCode });
    setFriendRequestFeedback({
      type: 'info',
      message: `Chat invite sent to ${friendCode}!`,
    });
    setTimeout(() => setFriendRequestFeedback(null), 3500);
  }, []);

  const dismissFriendChatInvite = useCallback(() => {
    setFriendChatInvite(null);
  }, []);

  const clearFriendFeedback = useCallback(() => {
    setFriendRequestFeedback(null);
  }, []);

  const refreshFriends = useCallback(() => {
    const current = getLocalFriends();
    setFriends(current);
    setFriendRequests(getStoredRequests());
    const socket = getSocket();
    if (socket.connected && current.length > 0) {
      socket.emit(SOCKET_EVENTS.FRIEND_PRESENCE_SUBSCRIBE, {
        friendCodes: current.map((f) => f.friendCode),
      });
    }
  }, []);

  return {
    connectionState,
    isConnected,
    retryConnection,
    status,
    onlineCount,
    partnerNickname,
    partnerSessionId,
    sharedInterests,
    messages,
    partnerTyping,
    banReason,
    errorMessage,
    rateLimitedNotice,
    reconnectInfo,
    roomList,
    currentRoom,
    roomMembers,
    roomMessages,
    isRoomCreator,
    isRoomMuted,
    roomTypingUsers,
    kickedReason,
    roomJoinError,
    // Friends state & actions
    friends,
    friendRequests,
    activePartnerFriendRequest,
    friendRequestFeedback,
    friendChatInvite,
    sendFriendRequest,
    respondFriendRequest,
    cancelFriendRequest,
    removeFriend,
    inviteFriendToChat,
    dismissFriendChatInvite,
    clearFriendFeedback,
    refreshFriends,
    // 1-to-1 & room actions
    joinQueue,
    leaveQueue,
    sendMessage,
    sendTyping,
    skip,
    block,
    report,
    requestReconnect,
    joinByReconnectCode,
    fetchRoomList,
    joinRoom,
    leaveRoom,
    sendRoomMessage,
    sendRoomTyping,
    kickRoomMember,
    muteRoomMember,
    createPrivateRoom,
    reportRoomMessage,
  };
}
