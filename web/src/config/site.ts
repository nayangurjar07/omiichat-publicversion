import { API_BASE, SOCKET_URL } from '@/lib/endpoints';

/**
 * Centralized site branding and configuration for Omii.
 * Every place that displays the product name, tagline, description, or domain reads from here.
 */
export const siteConfig = {
  siteName: 'Omii',
  name: 'Omii',
  fullTitle: 'Omii: Free Stranger Chat',
  tagline: 'Talk to strangers. Make connections.',
  description:
    'Free anonymous 1-to-1 stranger chat. No sign-up needed. Talk to random people worldwide with interest matching. Safe, fast, and private.',
  domain: process.env.NEXT_PUBLIC_APP_URL || 'https://omiichat.antideploy.app',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://omiichat.antideploy.app',
  apiBase: API_BASE,
  socketUrl: SOCKET_URL,
  links: {
    github: 'https://github.com',
    rules: '/rules',
    faq: '/faq',
    privacy: '/privacy',
    terms: '/terms',
    contact: '/contact',
    rooms: '/rooms',
  },
  themeColor: '#2563EB',
  accentDial: '#2563EB',
  accentStranger: '#F1F5F9',
  bgDark: '#0B0F17',
  bgPaper: '#F2F4F7',
  creator: 'Omii Studio',
} as const;

export type SiteConfig = typeof siteConfig;

/**
 * Standard per-page title generator matching pattern "<Page> – Omii"
 */
export function getPageTitle(pageName: string): string {
  return `${pageName} – ${siteConfig.fullTitle}`;
}
