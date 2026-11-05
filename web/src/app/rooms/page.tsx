import type { Metadata } from 'next';
import { Suspense } from 'react';
import { siteConfig } from '@/config/site';
import { RoomsDirectoryClient } from '@/components/rooms/RoomsDirectoryClient';

export const metadata: Metadata = {
  title: 'Rooms – Omii: Stranger Chat',
  description: `Join live topic rooms and regional communities on ${siteConfig.siteName}. Talk about gaming, music, movies, tech, and more.`,
  alternates: {
    canonical: `${siteConfig.url}/rooms`,
  },
  openGraph: {
    title: 'Rooms – Omii: Stranger Chat',
    description: `Join live topic rooms and regional communities on ${siteConfig.siteName}. Talk about gaming, music, movies, tech, and more.`,
    url: `${siteConfig.url}/rooms`,
    siteName: siteConfig.siteName,
  },
};

export default function RoomsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-paper)]" />}>
      <RoomsDirectoryClient />
    </Suspense>
  );
}

