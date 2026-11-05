'use client';

import Link from 'next/link';
import { siteConfig } from '@/config/site';

export function Footer() {
  return (
    <footer className="w-full border-t border-[#27272a] bg-[#0a0a0a] py-6 text-xs font-mono text-zinc-500">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-300">
              omii.chat
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500">
              Two strangers. 1-to-1 line.
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-4 text-zinc-400">
            <Link href="/chat" className="hover:text-white transition-colors">
              Chat
            </Link>
            <Link href="/rooms" className="hover:text-white transition-colors">
              Rooms
            </Link>
            <Link href="/rules" className="hover:text-white transition-colors">
              Rules
            </Link>
            <Link href="/faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
            <Link href="/admin" className="hover:text-white transition-colors">
              Admin
            </Link>
          </nav>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-600">
          <p>
            Ephemeral &amp; zero-log. Messages and media vanish immediately when the line disconnects.
          </p>
          <p>© {new Date().getFullYear()} {siteConfig.siteName}. High-contrast terminal.</p>
        </div>
      </div>
    </footer>
  );
}
