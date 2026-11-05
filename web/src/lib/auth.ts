'use client';

import { UserProfile, FriendItem } from '@/types';
import { getApiBase } from '@/lib/endpoints';

const TOKEN_KEY = 'omii_auth_token';
const USER_KEY = 'omii_auth_user';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || token === 'null' || token === 'undefined') return null;
  return token;
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getCachedUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user: UserProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token && token.trim() !== '') {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    removeAuthToken();
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      message = data.error || data.message || message;
    } catch {
      const text = await res.text().catch(() => '');
      if (text) message = text.slice(0, 100);
    }
    throw new Error(message);
  }

  return res.json();
}

export async function apiRegister(params: {
  email: string;
  password: string;
  nickname: string;
  avatar?: string;
  interests?: string[];
}): Promise<{ user: UserProfile; token: string }> {
  const res = await fetch(`${getApiBase()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await parseJsonResponse<{ user: UserProfile; token: string }>(res);
  setAuthToken(data.token);
  setCachedUser(data.user);
  return data;
}

export async function apiLogin(email: string, password: string): Promise<{ user: UserProfile; token: string }> {
  const res = await fetch(`${getApiBase()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJsonResponse<{ user: UserProfile; token: string }>(res);
  setAuthToken(data.token);
  setCachedUser(data.user);
  return data;
}

export async function apiGoogleLogin(params: {
  googleId: string;
  email: string;
  nickname: string;
  avatar?: string;
}): Promise<{ user: UserProfile; token: string }> {
  const res = await fetch(`${getApiBase()}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await parseJsonResponse<{ user: UserProfile; token: string }>(res);
  setAuthToken(data.token);
  setCachedUser(data.user);
  return data;
}

export async function apiUpdateProfile(data: {
  nickname?: string;
  avatar?: string;
  interests?: string[];
  bio?: string;
}): Promise<UserProfile> {
  const res = await fetch(`${getApiBase()}/api/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  const result = await parseJsonResponse<{ user: UserProfile }>(res);
  setCachedUser(result.user);
  return result.user;
}

export async function apiGetFriends(): Promise<FriendItem[]> {
  const headers = getAuthHeaders();
  if (!headers.Authorization) return [];

  try {
    const res = await fetch(`${getApiBase()}/api/auth/friends`, {
      headers,
    });
    if (!res.ok) {
      if (res.status === 401) removeAuthToken();
      return [];
    }
    const data = await res.json();
    return data.friends || [];
  } catch {
    return [];
  }
}

export async function apiAddFriend(identifier: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/api/auth/friends`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ identifier }),
  });
  await parseJsonResponse<{ success: boolean }>(res);
}

export async function apiRemoveFriend(friendshipId: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/api/auth/friends/${friendshipId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (res.status === 401) removeAuthToken();
}
