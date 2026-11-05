'use client';

import { getAuthToken, apiGetFriends, apiAddFriend, apiRemoveFriend } from './auth';

export interface SavedFriend {
  id: string;
  nickname: string;
  avatar: string;
  friendCode: string;
  addedAt: number;
  isOnline?: boolean;
  lastSeenAt?: number;
}

export interface FriendRequest {
  id: string;
  fromSessionId?: string;
  fromFriendCode: string;
  fromNickname: string;
  fromAvatar: string;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
}

const LOCAL_FRIENDS_KEY = 'omii_saved_friends';
const LOCAL_REQUESTS_KEY = 'omii_pending_friend_requests';
const MY_FRIEND_CODE_KEY = 'omii_my_friend_code';

const DEFAULT_AVATARS = ['🦊', '⚡', '🚀', '🎮', '🎨', '🎧', '🌟', '👾', '🐱', '🔥', '🔮', '🍀'];

export function getMyFriendCode(): string {
  if (typeof window === 'undefined') return 'OMII-LIVE';
  let code = localStorage.getItem(MY_FRIEND_CODE_KEY);
  if (!code) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars[Math.floor(Math.random() * chars.length)];
    }
    code = `OMII-${rand}`;
    localStorage.setItem(MY_FRIEND_CODE_KEY, code);
  }
  return code;
}

export function getLocalFriends(): SavedFriend[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_FRIENDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalFriend(params: {
  id?: string;
  nickname: string;
  avatar?: string;
  friendCode?: string;
  isOnline?: boolean;
  lastSeenAt?: number;
}): SavedFriend {
  const current = getLocalFriends();
  const cleanNick = params.nickname.trim();
  const code = params.friendCode ? params.friendCode.trim().toUpperCase() : `OMII-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  // Check if friend with this friend code or nickname already exists
  const existingIdx = current.findIndex(
    (f) =>
      (f.friendCode && f.friendCode.toUpperCase() === code) ||
      f.nickname.toLowerCase() === cleanNick.toLowerCase()
  );

  const avatar = params.avatar || (existingIdx >= 0 ? current[existingIdx].avatar : DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]);

  const updatedFriend: SavedFriend = {
    id: params.id || (existingIdx >= 0 ? current[existingIdx].id : `fr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    nickname: cleanNick,
    avatar,
    friendCode: code,
    addedAt: existingIdx >= 0 ? current[existingIdx].addedAt : Date.now(),
    isOnline: params.isOnline ?? (existingIdx >= 0 ? current[existingIdx].isOnline : true),
    lastSeenAt: params.lastSeenAt ?? (existingIdx >= 0 ? current[existingIdx].lastSeenAt : Date.now()),
  };

  let updatedList: SavedFriend[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = updatedFriend;
  } else {
    updatedList = [updatedFriend, ...current];
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify(updatedList));
  }

  // Also sync to backend account if logged in
  if (getAuthToken()) {
    apiAddFriend(cleanNick).catch(() => {});
  }

  return updatedFriend;
}

export function removeLocalFriend(id: string): void {
  const current = getLocalFriends();
  const updated = current.filter((f) => f.id !== id && f.friendCode !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify(updated));
  }
  if (getAuthToken()) {
    apiRemoveFriend(id).catch(() => {});
  }
}

/**
 * Update cached presence for friends list
 */
export function updateFriendsPresence(
  presence: Record<string, { isOnline: boolean; lastSeenAt: number }>
): SavedFriend[] {
  const friends = getLocalFriends();
  let changed = false;

  const updated = friends.map((f) => {
    const p = presence[f.friendCode?.toUpperCase()] || presence[f.id];
    if (p && (f.isOnline !== p.isOnline || f.lastSeenAt !== p.lastSeenAt)) {
      changed = true;
      return {
        ...f,
        isOnline: p.isOnline,
        lastSeenAt: p.lastSeenAt,
      };
    }
    return f;
  });

  if (changed && typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify(updated));
  }
  return updated;
}

// ─── Friend Requests Storage ──────────────────────────────────────

export function getStoredRequests(): FriendRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredRequest(req: FriendRequest): FriendRequest[] {
  const current = getStoredRequests();
  const existing = current.find((r) => r.id === req.id || (r.fromFriendCode && r.fromFriendCode === req.fromFriendCode && r.direction === req.direction));
  if (existing) return current;

  const updated = [req, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function removeStoredRequest(requestId: string): FriendRequest[] {
  const current = getStoredRequests();
  const updated = current.filter((r) => r.id !== requestId);
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(updated));
  }
  return updated;
}

// ─── Format Last Seen ─────────────────────────────────────────────

export function formatLastSeen(lastSeenAt?: number, isOnline?: boolean): string {
  if (isOnline) return 'Online';
  if (!lastSeenAt) return 'Offline';

  const diff = Date.now() - lastSeenAt;
  if (diff < 60000) return 'Last seen just now';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Last seen yesterday';
  return `Last seen ${days}d ago`;
}

/**
 * Loads friends combining local storage with authenticated cloud backend
 */
export async function loadAllFriends(): Promise<SavedFriend[]> {
  const localList = getLocalFriends();
  if (!getAuthToken()) {
    return localList;
  }

  try {
    const cloudFriends = await apiGetFriends();
    const mergedMap = new Map<string, SavedFriend>();

    // Local friends first
    for (const lf of localList) {
      mergedMap.set(lf.nickname.toLowerCase(), lf);
    }

    // Merge cloud friends
    for (const cf of cloudFriends) {
      const key = cf.nickname.toLowerCase();
      if (!mergedMap.has(key)) {
        mergedMap.set(key, {
          id: cf.friendshipId || cf.friendId,
          nickname: cf.nickname,
          avatar: cf.avatar || '🦊',
          friendCode: `OMII-${cf.friendId.slice(0, 4).toUpperCase()}`,
          addedAt: new Date(cf.createdAt).getTime() || Date.now(),
          isOnline: false,
          lastSeenAt: Date.now() - 3600000,
        });
      }
    }

    const merged = Array.from(mergedMap.values());
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {
    return localList;
  }
}
