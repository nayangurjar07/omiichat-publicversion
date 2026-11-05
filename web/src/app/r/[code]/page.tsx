'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

export default function InviteResolverPage({ params }: InvitePageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const code = resolvedParams.code;

  useEffect(() => {
    if (code) {
      router.replace(`/rooms/${encodeURIComponent(code.trim().toUpperCase())}`);
    } else {
      router.replace('/rooms');
    }
  }, [code, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-paper)] text-[var(--text-muted)]">
      <div className="p-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-center space-y-3 max-w-sm">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-dial)] border-t-transparent rounded-full mx-auto" />
        <h2 className="text-sm font-semibold text-[var(--text-ink)]">
          Connecting to private room...
        </h2>
        <p className="text-xs text-[var(--text-muted)] font-mono">Code {code.toUpperCase()}</p>
      </div>
    </div>
  );
}
