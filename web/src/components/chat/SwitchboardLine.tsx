'use client';

import { ChatStatus } from '@/types';

interface SwitchboardLineProps {
  status: ChatStatus;
  partnerNickname?: string;
  isCompact?: boolean;
}

export function SwitchboardLine({
  status,
  partnerNickname = 'Stranger',
  isCompact = false,
}: SwitchboardLineProps) {
  const isSearching = status === 'searching';
  const isMatched = status === 'matched';
  const isLeft = status === 'partner_left';

  return (
    <div
      role="status"
      aria-label={`Connection state: ${
        isMatched
          ? `Connected to ${partnerNickname}`
          : isSearching
          ? 'Searching for stranger'
          : isLeft
          ? 'Stranger disconnected'
          : 'Idle'
      }`}
      className={`flex items-center gap-2 select-none font-mono ${
        isCompact ? 'w-full max-w-md mx-auto' : 'w-full'
      }`}
    >
      {/* Self Terminal Indicator */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`w-2 h-2 rounded-full transition-colors ${
            isMatched
              ? 'bg-emerald-400'
              : isSearching
              ? 'bg-zinc-400 animate-pulse'
              : 'bg-zinc-600'
          }`}
        />
        <span className="text-xs font-bold text-zinc-200">You</span>
      </div>

      {/* Terminal Line */}
      <div className="flex-1 relative h-5 flex items-center min-w-[50px] sm:min-w-[100px]">
        {isSearching && (
          <div className="w-full h-[1px] bg-zinc-700 relative overflow-hidden">
            <div className="absolute inset-y-0 w-1/3 bg-zinc-400 animate-[switchboardWave_1.5s_linear_infinite]" />
          </div>
        )}

        {isMatched && (
          <div className="w-full flex items-center">
            <div className="w-full h-[2px] bg-emerald-500 rounded-full" />
          </div>
        )}

        {isLeft && (
          <div className="w-full flex items-center gap-1">
            <div className="flex-1 h-[1px] bg-rose-500/60" />
            <span className="text-[10px] font-mono px-1 py-0.2 rounded text-rose-400 bg-rose-950/40 border border-rose-500/30">
              DISCONNECTED
            </span>
            <div className="flex-1 h-[1px] bg-rose-500/60" />
          </div>
        )}

        {!isSearching && !isMatched && !isLeft && (
          <div className="w-full h-[1px] bg-zinc-800" />
        )}
      </div>

      {/* Stranger Terminal Indicator */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs font-bold text-zinc-200 truncate max-w-[110px] sm:max-w-[160px]">
          {isMatched ? partnerNickname : isLeft ? 'Left' : 'Stranger'}
        </span>
        <span
          className={`w-2 h-2 rounded-full transition-colors ${
            isMatched
              ? 'bg-emerald-400'
              : isLeft
              ? 'bg-rose-500'
              : 'bg-zinc-700'
          }`}
        />
      </div>
    </div>
  );
}
