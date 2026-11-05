import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Room Chat – Omii: Stranger Chat',
  description: siteConfig.description,
};

export function generateStaticParams() {
  return [
    { id: 'gaming' },
    { id: 'music' },
    { id: 'anime' },
    { id: 'coding' },
    { id: 'movies' },
    { id: 'india' },
    { id: 'college' },
    { id: 'late-night' },
  ];
}

export default function RoomChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
