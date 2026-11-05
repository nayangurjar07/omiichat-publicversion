/**
 * Unified endpoint configuration for Omii.
 * Single source of truth for REST API base, Socket.IO URL, and media resolution.
 */

function computeApiBase(): string {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    // Explicit override via env ONLY if not localhost
    if (
      process.env.NEXT_PUBLIC_API_URL &&
      !process.env.NEXT_PUBLIC_API_URL.includes('localhost') &&
      !process.env.NEXT_PUBLIC_API_URL.includes('127.0.0.1')
    ) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
    }

    // Local development mode: frontend on :3000, backend on :3001
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '3000') {
      return `${protocol}//${hostname}:3001`;
    }
    // LAN IP access (e.g. 192.168.x.x:3000 in local dev)
    if (port === '3000') {
      return `${protocol}//${hostname}:3001`;
    }
    // Behind reverse proxy / production deployment on same origin
    return window.location.origin;
  }

  return '';
}

function computeSocketUrl(): string {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    // Explicit override via env ONLY if not localhost
    if (
      process.env.NEXT_PUBLIC_SOCKET_URL &&
      !process.env.NEXT_PUBLIC_SOCKET_URL.includes('localhost') &&
      !process.env.NEXT_PUBLIC_SOCKET_URL.includes('127.0.0.1')
    ) {
      return process.env.NEXT_PUBLIC_SOCKET_URL.replace(/\/$/, '');
    }

    // Local development mode
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '3000') {
      return `${protocol}//${hostname}:3001`;
    }
    // LAN IP access in local dev
    if (port === '3000') {
      return `${protocol}//${hostname}:3001`;
    }
    // Production / same origin
    return window.location.origin;
  }

  return '';
}

export function getApiBase(): string {
  return typeof window !== 'undefined' ? computeApiBase() : '';
}

export function getSocketUrl(): string {
  return typeof window !== 'undefined' ? computeSocketUrl() : '';
}

export const API_BASE = '';
export const SOCKET_URL = '';

/**
 * Resolves uploaded media paths (images, audio) to absolute URLs
 */
export function resolveMediaUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('blob:')) {
    return pathOrUrl;
  }
  const base = getApiBase();
  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${cleanPath}`;
}
