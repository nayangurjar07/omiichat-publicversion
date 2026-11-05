'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { AuthModal } from '@/components/auth/AuthModal';
import { ProfileModal } from '@/components/auth/ProfileModal';
import { FriendsModal } from '@/components/friends/FriendsModal';
import { getCachedUser } from '@/lib/auth';
import { getStoredRequests } from '@/lib/friends';
import { siteConfig } from '@/config/site';
import { UserProfile } from '@/types';
import {
  Menu,
  X,
  User as UserIcon,
  Home,
  Radio,
} from 'lucide-react';

interface NavbarProps {
  onlineCount?: number;
  inChat?: boolean;
  isConnected?: boolean;
  activeStrangerNickname?: string;
  onRetryConnection?: () => void;
}

export function Navbar({
  onlineCount = 0,
  inChat = false,
  isConnected = true,
  activeStrangerNickname,
  onRetryConnection,
}: NavbarProps) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingReqCount, setPendingReqCount] = useState(0);

  useEffect(() => {
    setCurrentUser(getCachedUser());
  }, []);

  useEffect(() => {
    const checkRequests = () => {
      const reqs = getStoredRequests();
      const incoming = reqs.filter((r) => r.direction === 'incoming');
      setPendingReqCount(incoming.length);
    };
    checkRequests();
    const interval = setInterval(checkRequests, 3000);
    return () => clearInterval(interval);
  }, [isFriendsOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#0a0a0a] border-b border-[#27272a]">
        <div className="max-w-5xl mx-auto px-4 h-13 flex items-center justify-between gap-3">
          {/* Brand Wordmark - Crisp Terminal Font */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <span className="font-mono font-bold text-lg tracking-tight text-white select-none">
                omii<span className="text-zinc-500">.chat</span>
              </span>
            </Link>

            {/* Live Online Count or Status Pill */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#141414] border border-[#27272a] text-xs font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isConnected ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'
                }`}
              />
              <span className="text-zinc-400 text-[11px]">
                {isConnected
                  ? onlineCount > 0
                    ? `${onlineCount.toLocaleString()} online`
                    : 'connected'
                  : 'disconnected'}
              </span>
              {!isConnected && onRetryConnection && (
                <button
                  type="button"
                  onClick={onRetryConnection}
                  className="text-[11px] font-semibold text-white underline hover:text-zinc-300 cursor-pointer"
                >
                  retry
                </button>
              )}
            </div>
          </div>

          {/* Right Navigation */}
          <div className="flex items-center gap-2">
            {inChat && (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#18181b] hover:bg-[#27272a] text-xs font-mono text-zinc-300 hover:text-white border border-[#27272a] transition-colors"
                title="Return to home page"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            )}

            {!inChat && (
              <nav className="hidden md:flex items-center gap-4 text-xs font-mono text-zinc-400">
                <Link
                  href="/chat"
                  className="px-2 py-1 rounded hover:text-white transition-colors"
                >
                  [Chat]
                </Link>
                <Link
                  href="/rooms"
                  className="px-2 py-1 rounded hover:text-white transition-colors"
                >
                  [Rooms]
                </Link>
                <button
                  type="button"
                  onClick={() => setIsFriendsOpen(true)}
                  className="relative px-2 py-1 rounded hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>[Friends]</span>
                  {pendingReqCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-black text-[10px] font-bold">
                      {pendingReqCount}
                    </span>
                  )}
                </button>
                <Link
                  href="/rules"
                  className="px-2 py-1 rounded hover:text-white transition-colors"
                >
                  [Rules]
                </Link>
              </nav>
            )}

            {/* Profile / Sign in */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#18181b] hover:bg-[#27272a] text-xs font-mono text-white border border-[#27272a] transition-colors cursor-pointer"
              >
                <UserIcon className="w-3 h-3 text-zinc-400" />
                <span className="truncate max-w-[80px]">{currentUser.nickname}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Mobile Menu Button */}
            {!inChat && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                className="md:hidden inline-flex items-center justify-center p-2 rounded text-zinc-400 hover:text-white bg-[#141414] border border-[#27272a] cursor-pointer"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && !inChat && (
          <div className="md:hidden border-t border-[#27272a] bg-[#0d0d0d] px-4 py-3 space-y-2 font-mono text-xs">
            <Link
              href="/chat"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-zinc-200 hover:text-white"
            >
              &gt; Start chat
            </Link>
            <Link
              href="/rooms"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-zinc-200 hover:text-white"
            >
              &gt; Topic rooms
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsFriendsOpen(true);
              }}
              className="w-full text-left py-2 text-zinc-200 hover:text-white cursor-pointer flex items-center justify-between"
            >
              <span>&gt; Friends</span>
              {pendingReqCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-black text-[10px] font-bold">
                  {pendingReqCount} new
                </span>
              )}
            </button>
            <Link
              href="/rules"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-zinc-200 hover:text-white"
            >
              &gt; Rules & Safety
            </Link>
            {!currentUser && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsAuthOpen(true);
                }}
                className="w-full mt-2 py-2 rounded text-center text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-colors"
              >
                Sign in / Register
              </button>
            )}
          </div>
        )}
      </header>

      {/* Auth Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthOpen(false);
        }}
      />

      {currentUser && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={currentUser}
          onUserUpdated={(updated) => setCurrentUser(updated)}
          onLogout={() => {
            setCurrentUser(null);
            setIsProfileOpen(false);
          }}
        />
      )}

      <FriendsModal
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
      />
    </>
  );
}
