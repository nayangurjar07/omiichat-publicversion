export type ChatStatus =
  | 'idle'
  | 'searching'
  | 'matched'
  | 'partner_left'
  | 'banned';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderNick?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio';
  timestamp: number;
  isSelf: boolean;
  isSystem?: boolean;
}

export interface MatchData {
  partnerNickname: string;
  partnerSessionId?: string;
  sharedInterests: string[];
}

export type ReportReason =
  | 'harassment'
  | 'spam'
  | 'sexual'
  | 'underage'
  | 'other';

export interface ReportItem {
  id: string;
  reporterSid: string;
  reportedSid: string;
  roomId?: string | null;
  roomName?: string | null;
  messageText?: string | null;
  mediaUrl?: string | null;
  reason: string;
  detail: string | null;
  context: string; // JSON string of messages
  status: 'pending' | 'banned' | 'dismissed';
  createdAt: string;
}

export interface BanItem {
  id: string;
  sessionId: string;
  reason: string;
  createdAt: string;
  expiresAt: string | null;
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

export interface RoomMember {
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
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio';
  timestamp: number;
  isSystem?: boolean;
}

export interface UserProfile {
  id: string;
  email?: string | null;
  nickname: string;
  avatar?: string | null;
  interests?: string[];
  bio?: string | null;
}

export interface FriendItem {
  friendshipId: string;
  friendId: string;
  nickname: string;
  email?: string;
  avatar?: string;
  createdAt: string;
}

export interface ReconnectInfo {
  code: string;
  expiresAt: number;
  partnerNickname: string;
}
