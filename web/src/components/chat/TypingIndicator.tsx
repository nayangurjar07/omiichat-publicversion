'use client';

interface TypingIndicatorProps {
  partnerNickname: string;
}

export function TypingIndicator({ partnerNickname }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-muted)] animate-in fade-in duration-200">
      <span className="font-medium text-[var(--text-ink)]">
        {partnerNickname || 'Stranger'} is typing
      </span>
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-dial)] animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-dial)] animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-dial)] animate-bounce"></span>
      </div>
    </div>
  );
}

