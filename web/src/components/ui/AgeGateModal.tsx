'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, AlertTriangle, Check } from 'lucide-react';

interface AgeGateModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}

export function AgeGateModal({ isOpen, onConfirm, onDecline }: AgeGateModalProps) {
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#121212] border border-[#27272a] rounded-xl p-6 shadow-2xl text-zinc-100 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Age &amp; Safety Compliance (18+)
            </h2>
            <p className="text-xs text-zinc-400">
              Mandatory confirmation before joining switchboard
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#18181b] border border-[#27272a] text-xs text-zinc-300 space-y-2 leading-relaxed">
          <p>
            Omii is an anonymous communication switchboard intended exclusively for adults aged 18 and older.
          </p>
          <ul className="list-disc list-inside text-zinc-400 space-y-1 text-[11px]">
            <li>Zero tolerance for harassment, non-consensual content, or hate speech.</li>
            <li>No transmission of sexually explicit material involving minors.</li>
            <li>Sessions accumulating reports are permanently banned and subject to safety audit.</li>
          </ul>
        </div>

        <label className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 cursor-pointer"
          />
          <span className="text-[11px] leading-tight text-zinc-300">
            I certify that I am at least 18 years old and I agree to the{' '}
            <Link href="/terms" target="_blank" className="text-white underline hover:text-emerald-400">
              Terms of Service
            </Link>
            ,{' '}
            <Link href="/privacy" target="_blank" className="text-white underline hover:text-emerald-400">
              Privacy Policy
            </Link>
            , and{' '}
            <Link href="/rules" target="_blank" className="text-white underline hover:text-emerald-400">
              Community Rules
            </Link>
            .
          </span>
        </label>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onDecline}
            className="px-4 py-2 text-xs font-semibold rounded bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-colors cursor-pointer"
          >
            Leave
          </button>
          <button
            type="button"
            disabled={!isChecked}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold rounded bg-white hover:bg-zinc-200 text-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95"
          >
            Confirm &amp; Enter
          </button>
        </div>
      </div>
    </div>
  );
}

