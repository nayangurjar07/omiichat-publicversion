'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ReconnectInfo } from '@/types';
import { Sparkles, Copy, Check, Clock, Share2 } from 'lucide-react';

interface ReconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  reconnectInfo: ReconnectInfo | null;
}

export function ReconnectModal({ isOpen, onClose, reconnectInfo }: ReconnectModalProps) {
  const [copied, setCopied] = useState(false);

  if (!reconnectInfo) return null;

  const appUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/chat?reconnect=${reconnectInfo.code}`
      : `/chat?reconnect=${reconnectInfo.code}`;

  const copyCode = () => {
    navigator.clipboard.writeText(reconnectInfo.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hoursRemaining = Math.max(
    1,
    Math.round((reconnectInfo.expiresAt - Date.now()) / (1000 * 60 * 60))
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pick up conversation later">
      <div className="space-y-5 text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[var(--bg-subtle)] text-[var(--accent-dial)] flex items-center justify-center border border-[var(--border-line)]">
          <Sparkles className="w-5 h-5" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-semibold text-[var(--text-ink)]">
            Keep in touch with {reconnectInfo.partnerNickname || 'Stranger'}
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Both of you received this temporary reconnect code. Save it or share the link to pick up your conversation anytime within 24 hours.
          </p>
        </div>

        {/* Code Block */}
        <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] space-y-2">
          <span className="text-xs text-[var(--text-muted)]">
            Your reconnect code
          </span>
          <div className="text-3xl font-extrabold font-mono tracking-widest text-[var(--accent-dial)]">
            {reconnectInfo.code}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Clock className="w-3.5 h-3.5" />
            <span>Expires in ~{hoursRemaining} hours</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={copyCode}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-ink)] border border-[var(--border-line)] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-[var(--color-success)]" /> : <Copy className="w-4 h-4" />}
            <span>Copy code</span>
          </button>

          <button
            onClick={copyLink}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[var(--accent-dial)] hover:opacity-90 text-white transition-all cursor-pointer shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>Copy link</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
