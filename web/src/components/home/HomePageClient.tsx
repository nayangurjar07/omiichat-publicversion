'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui/Navbar';
import { Footer } from '@/components/ui/Footer';
import { AgeGateModal } from '@/components/ui/AgeGateModal';
import {
  setStoredNickname,
  getStoredNickname,
  setStoredInterests,
  getStoredInterests,
} from '@/lib/session';
import { useSocket } from '@/hooks/useSocket';
import { Dice5, X, Shield, ArrowRight, Zap, Radio, KeyRound } from 'lucide-react';

const RANDOM_NICKNAMES = [
  'Cedar',
  'Marlin',
  'Otter',
  'Rowan',
  'Finch',
  'Sable',
  'Loom',
  'Tide',
  'Birch',
  'Kite',
  'Ghost',
  'Echo',
  'Nova',
  'Vesper',
  'Blaze',
];

const QUICK_TAGS = [
  'music',
  'gaming',
  'tech',
  'anime',
  'movies',
  'books',
  'travel',
  'philosophy',
];

export function HomePageClient() {
  const router = useRouter();
  const { onlineCount, isConnected, retryConnection } = useSocket();

  const [nickname, setNickname] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [reconnectCodeInput, setReconnectCodeInput] = useState('');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);

  useEffect(() => {
    const savedNick = getStoredNickname();
    if (savedNick) setNickname(savedNick);
    const savedInterests = getStoredInterests();
    if (savedInterests.length > 0) setInterests(savedInterests);
  }, []);

  const handleRandomizeNickname = () => {
    const random = RANDOM_NICKNAMES[Math.floor(Math.random() * RANDOM_NICKNAMES.length)];
    setNickname(random);
    setStoredNickname(random);
  };

  const handleAddInterest = (tag: string) => {
    const clean = tag.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
    if (!clean || interests.includes(clean)) return;
    if (interests.length >= 5) {
      setErrorNotice('Maximum 5 interests allowed.');
      setTimeout(() => setErrorNotice(null), 3000);
      return;
    }
    const next = [...interests, clean];
    setInterests(next);
    setStoredInterests(next);
    setInterestInput('');
  };

  const handleRemoveInterest = (tag: string) => {
    const next = interests.filter((i) => i !== tag);
    setInterests(next);
    setStoredInterests(next);
  };

  const proceedToChat = () => {
    const finalNick = nickname.trim() || 'Anonymous';
    setStoredNickname(finalNick);
    setStoredInterests(interests);
    router.push('/chat');
  };

  const handleStartChat = () => {
    if (typeof window !== 'undefined') {
      const isVerified = localStorage.getItem('omii_age_verified') === 'true';
      if (!isVerified) {
        setIsAgeModalOpen(true);
        return;
      }
    }
    proceedToChat();
  };

  const handleJoinByReconnect = (e: React.FormEvent) => {
    e.preventDefault();
    const code = reconnectCodeInput.trim().toUpperCase();
    if (!code) return;
    router.push(`/chat?reconnect=${encodeURIComponent(code)}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white">
      <Navbar onlineCount={onlineCount} isConnected={isConnected} onRetryConnection={retryConnection} />

      {/* Connection Warning */}
      {!isConnected && (
        <div className="w-full bg-[#18181b] border-b border-rose-500/30 px-4 py-2 text-xs font-mono text-center flex items-center justify-center gap-2 text-rose-400">
          <span>[WARN] Server connection unreachable. Trying to reconnect...</span>
          <button
            type="button"
            onClick={retryConnection}
            className="font-bold underline text-white hover:text-zinc-200 cursor-pointer"
          >
            Retry now
          </button>
        </div>
      )}

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col justify-center">
        {/* Main Zero-Friction Match Panel */}
        <div className="space-y-6">
          {/* Header & Status Indicator */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#141414] border border-[#27272a] text-xs font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{onlineCount > 0 ? `${onlineCount.toLocaleString()} online now` : 'Live switchboard ready'}</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-500">Zero logs &bull; 1-to-1</span>
            </div>

            <h1 className="font-mono text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Talk to someone new.
            </h1>
            <p className="text-sm font-mono text-zinc-400">
              Instant, anonymous 1-on-1 text chat with random strangers. No sign-up required.
            </p>
          </div>

          {/* Core Matcher Entry Box */}
          <div className="bg-[#121212] border border-[#27272a] rounded-lg p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nickname Input */}
              <div className="space-y-1.5 font-mono">
                <label htmlFor="nickname-input" className="block text-xs text-zinc-400">
                  Nickname (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    id="nickname-input"
                    type="text"
                    value={nickname}
                    onChange={(e) => {
                      setNickname(e.target.value.slice(0, 20));
                      setStoredNickname(e.target.value.slice(0, 20));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleStartChat();
                      }
                    }}
                    placeholder="Anonymous"
                    maxLength={20}
                    className="flex-1 h-11 px-3.5 rounded bg-[#0a0a0a] border border-[#27272a] text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-400 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleRandomizeNickname}
                    title="Generate random nickname"
                    className="h-11 w-11 inline-flex items-center justify-center rounded bg-[#1c1c1f] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-colors cursor-pointer"
                  >
                    <Dice5 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Interests Input */}
              <div className="space-y-1.5 font-mono">
                <label htmlFor="interest-input" className="block text-xs text-zinc-400">
                  Interests (optional, max 5)
                </label>
                <div className="flex gap-2">
                  <input
                    id="interest-input"
                    type="text"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (interestInput.trim()) {
                          handleAddInterest(interestInput);
                        } else {
                          handleStartChat();
                        }
                      }
                    }}
                    placeholder="e.g. music, coding, anime"
                    className="flex-1 h-11 px-3.5 rounded bg-[#0a0a0a] border border-[#27272a] text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-400 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddInterest(interestInput)}
                    className="h-11 px-3.5 rounded bg-[#1c1c1f] hover:bg-[#27272a] text-xs font-semibold text-zinc-300 hover:text-white border border-[#27272a] transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Active Selected Interest Tags */}
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {interests.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1f1f23] text-zinc-200 border border-zinc-700 font-mono text-xs"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(tag)}
                      aria-label={`Remove interest ${tag}`}
                      className="cursor-pointer text-zinc-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick Interest Selector */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-zinc-500">
              <span className="text-zinc-600">Quick tags:</span>
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddInterest(tag)}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    interests.includes(tag)
                      ? 'bg-zinc-800 text-white border-zinc-600'
                      : 'bg-[#141414] hover:bg-[#1f1f23] text-zinc-400 hover:text-zinc-200 border-[#27272a]'
                  }`}
                >
                  +{tag}
                </button>
              ))}
            </div>

            {errorNotice && (
              <p className="text-xs font-mono text-rose-400">{errorNotice}</p>
            )}

            {/* Primary Action Button: Large, Zero-Friction START CHAT */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartChat}
                className="w-full h-12 rounded bg-white hover:bg-zinc-200 text-black font-mono font-bold text-sm tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>START CHAT NOW</span>
                <span className="text-zinc-500 font-normal text-xs normal-case ml-2 hidden sm:inline">(or press Enter)</span>
              </button>
            </div>
          </div>

          {/* Quick Reconnect Single-Line Bar */}
          <div className="bg-[#121212] border border-[#27272a] rounded-lg p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-zinc-400">
              <KeyRound className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>Have a 24-hr reconnect code?</span>
            </div>
            <form onSubmit={handleJoinByReconnect} className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={reconnectCodeInput}
                onChange={(e) => setReconnectCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABC123"
                maxLength={6}
                className="w-28 h-9 px-2.5 rounded bg-[#0a0a0a] border border-[#27272a] text-center font-mono text-xs uppercase tracking-wider text-white placeholder-zinc-700 focus:border-zinc-400 focus:outline-none"
              />
              <button
                type="submit"
                className="h-9 px-3 rounded bg-[#1c1c1f] hover:bg-[#27272a] text-zinc-300 hover:text-white border border-[#27272a] transition-colors cursor-pointer"
              >
                Reconnect
              </button>
            </form>
          </div>

          {/* Fast Privacy & Features Notice */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono text-zinc-500">
            <div className="p-3 rounded bg-[#0f0f11] border border-[#222225] space-y-1">
              <div className="text-zinc-300 font-semibold flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400" />
                <span>Instant Fallback</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Never wait in queue. Matched in under 4s with smart interest affinity.
              </p>
            </div>

            <div className="p-3 rounded bg-[#0f0f11] border border-[#222225] space-y-1">
              <div className="text-zinc-300 font-semibold flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-zinc-400" />
                <span>Instant Esc Skip</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Hit Escape anytime on desktop or tap Next on mobile for instant rematch.
              </p>
            </div>

            <div className="p-3 rounded bg-[#0f0f11] border border-[#222225] space-y-1">
              <div className="text-zinc-300 font-semibold flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-zinc-400" />
                <span>Zero Chat Logs</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Purely in-memory sockets. All text and media evaporate when chat ends.
              </p>
            </div>
          </div>
        </div>
      </main>

      <AgeGateModal
        isOpen={isAgeModalOpen}
        onConfirm={() => {
          localStorage.setItem('omii_age_verified', 'true');
          setIsAgeModalOpen(false);
          proceedToChat();
        }}
        onDecline={() => setIsAgeModalOpen(false)}
      />

      <Footer />
    </div>
  );
}
