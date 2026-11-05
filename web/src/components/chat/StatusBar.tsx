'use client';

import { useState } from 'react';
import { ChatStatus } from '@/types';
import { sounds } from '@/lib/sound';
import { SwitchboardLine } from './SwitchboardLine';
import {
  Volume2,
  VolumeX,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Check,
  Home,
  FastForward,
} from 'lucide-react';

interface StatusBarProps {
  status: ChatStatus;
  partnerNickname: string;
  sharedInterests: string[];
  isConnected?: boolean;
  onSkip: () => void;
  onBlock: () => void;
  onReport: () => void;
  onLeave: () => void;
  onRequestReconnect?: () => void;
  onAddFriend?: () => void;
  isFriendAdded?: boolean;
  friendState?: 'none' | 'pending' | 'friend';
  isSkipConfirming?: boolean;
}

export function StatusBar({
  status,
  partnerNickname,
  sharedInterests,
  isConnected = true,
  onSkip,
  onBlock,
  onReport,
  onLeave,
  onRequestReconnect,
  onAddFriend,
  isFriendAdded = false,
  friendState,
  isSkipConfirming = false,
}: StatusBarProps) {
  const [soundEnabled, setSoundEnabled] = useState(sounds.isEnabled());

  const effectiveFriendState = friendState || (isFriendAdded ? 'friend' : 'none');

  const toggleSound = () => {
    const next = sounds.toggle();
    setSoundEnabled(next);
  };

  return (
    <header className="w-full px-4 py-2.5 bg-[#121212] border-b border-[#27272a] transition-colors">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Switchboard line indicator */}
        <div className="flex-1 min-w-0 pr-2 flex items-center gap-2">
          <SwitchboardLine
            status={status}
            partnerNickname={partnerNickname}
            isCompact={false}
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center font-mono">
          {/* Home Button */}
          <button
            type="button"
            onClick={onLeave}
            title="Return to home page"
            className="h-9 inline-flex items-center gap-1.5 px-2.5 rounded bg-[#18181b] hover:bg-[#27272a] text-xs text-zinc-300 hover:text-white border border-[#27272a] transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Home</span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute sound alerts' : 'Enable sound alerts'}
            className="h-9 w-9 inline-flex items-center justify-center rounded bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
          </button>

          {/* Report Button (if in chat or recently left) */}
          {(status === 'matched' || status === 'partner_left') && (
            <button
              type="button"
              onClick={onReport}
              aria-label="Report conversation"
              title="Report user"
              className="h-9 inline-flex items-center gap-1 px-2.5 rounded bg-[#18181b] hover:bg-rose-950/40 text-xs text-zinc-400 hover:text-rose-400 border border-[#27272a] transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Report</span>
            </button>
          )}

          {/* Add Friend Button (if matched) */}
          {status === 'matched' && onAddFriend && (
            <button
              type="button"
              onClick={effectiveFriendState === 'none' ? onAddFriend : undefined}
              disabled={effectiveFriendState !== 'none'}
              title={
                effectiveFriendState === 'friend'
                  ? 'Mutual friend'
                  : effectiveFriendState === 'pending'
                  ? 'Request pending recipient acceptance'
                  : 'Send friend request'
              }
              className={`h-9 inline-flex items-center gap-1 px-2.5 rounded text-xs border transition-colors ${
                effectiveFriendState === 'friend'
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 cursor-default'
                  : effectiveFriendState === 'pending'
                  ? 'bg-amber-950/40 text-amber-400 border-amber-500/30 cursor-default'
                  : 'bg-[#18181b] hover:bg-[#27272a] text-zinc-300 hover:text-white border-[#27272a] cursor-pointer'
              }`}
            >
              {effectiveFriendState === 'friend' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : effectiveFriendState === 'pending' ? (
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline">
                {effectiveFriendState === 'friend'
                  ? 'Friends'
                  : effectiveFriendState === 'pending'
                  ? 'Pending'
                  : 'Add Friend'}
              </span>
            </button>
          )}

          {/* Skip / Next Button (Primary High-Contrast Action with 2-step guard) */}
          <button
            type="button"
            onClick={onSkip}
            title={isSkipConfirming ? 'Confirm disconnect (or press Esc again)' : 'Next match (hit Esc anytime)'}
            className={`h-9 inline-flex items-center gap-1.5 px-3.5 rounded text-xs font-mono font-bold tracking-wide transition-all cursor-pointer active:scale-95 shadow-sm ${
              isSkipConfirming
                ? 'bg-amber-400 hover:bg-amber-300 text-black border border-amber-300 animate-pulse'
                : 'bg-white hover:bg-zinc-200 text-black'
            }`}
          >
            <FastForward className="w-3.5 h-3.5 fill-black" />
            <span>{isSkipConfirming ? 'Sure?' : 'Next'}</span>
            <kbd className={`hidden sm:inline-block px-1 py-0.2 rounded text-[10px] border ${
              isSkipConfirming
                ? 'bg-amber-200 text-amber-950 border-amber-400'
                : 'bg-zinc-200 text-zinc-800 border-zinc-300'
            }`}>
              {isSkipConfirming ? 'Esc again' : 'Esc'}
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
}
