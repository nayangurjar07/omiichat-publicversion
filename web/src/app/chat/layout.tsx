import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Chat – Omii: Stranger Chat',
  description: siteConfig.description,
  alternates: {
    canonical: `${siteConfig.url}/chat`,
  },
  openGraph: {
    title: 'Chat – Omii: Stranger Chat',
    description: siteConfig.description,
    url: `${siteConfig.url}/chat`,
    siteName: siteConfig.siteName,
  },
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
