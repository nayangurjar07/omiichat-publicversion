'use client';

const SESSION_KEY = 'omii_session_id';
const NICKNAME_KEY = 'omii_nickname';
const INTERESTS_KEY = 'omii_interests';
const LANGUAGE_KEY = 'omii_language';
const BLOCKS_KEY = 'omii_blocked_sids';

/**
 * Generate a random 32-character hex session identifier.
 */
function generateRandomSessionId(): string {
  const chars = 'abcdef0123456789';
  let result = 'sid_';
  for (let i = 0; i < 28; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

let memorySessionId = '';

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = generateRandomSessionId();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    if (!memorySessionId) {
      memorySessionId = generateRandomSessionId();
    }
    return memorySessionId;
  }
}

export function getStoredNickname(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(NICKNAME_KEY) || '';
}

export function setStoredNickname(nickname: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NICKNAME_KEY, nickname.trim().slice(0, 20));
}

export function getStoredInterests(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(INTERESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function setStoredInterests(interests: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INTERESTS_KEY, JSON.stringify(interests.slice(0, 5)));
}

export function getStoredLanguage(): string {
  if (typeof window === 'undefined') return 'any';
  return localStorage.getItem(LANGUAGE_KEY) || 'any';
}

export function setStoredLanguage(lang: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANGUAGE_KEY, lang);
}

export function getBlockedSessions(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BLOCKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addBlockedSession(sessionId: string): void {
  if (typeof window === 'undefined' || !sessionId) return;
  const current = getBlockedSessions();
  if (!current.includes(sessionId)) {
    current.push(sessionId);
    localStorage.setItem(BLOCKS_KEY, JSON.stringify(current));
  }
}
