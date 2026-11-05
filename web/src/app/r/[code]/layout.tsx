import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join Room – Omii',
};

export function generateStaticParams() {
  return [{ code: 'welcome' }];
}

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
