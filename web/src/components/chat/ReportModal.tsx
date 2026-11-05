'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ReportReason } from '@/types';
import { AlertTriangle, Ban, MessageSquareWarning, ShieldAlert, Sparkles } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, detail?: string) => void;
  partnerNickname: string;
}

const REASONS: {
  id: ReportReason;
  label: string;
  desc: string;
  icon: typeof AlertTriangle;
}[] = [
  {
    id: 'harassment',
    label: 'Harassment & Hate',
    desc: 'Insults, threats, bullying, or abusive hostility',
    icon: AlertTriangle,
  },
  {
    id: 'underage',
    label: 'Appears Underage',
    desc: 'User mentions being under 18 or discusses minors (zero tolerance)',
    icon: ShieldAlert,
  },
  {
    id: 'spam',
    label: 'Spam & Advertising',
    desc: 'Promo links, bot copy-paste, scams, or solicitation',
    icon: MessageSquareWarning,
  },
  {
    id: 'sexual',
    label: 'Non-consensual / Inappropriate Sexual Content',
    desc: 'Explicit solicitations, non-consensual vulgarity, or illegal content',
    icon: Ban,
  },
  {
    id: 'other',
    label: 'Other Violation',
    desc: 'Other behavior that violates community rules',
    icon: Sparkles,
  },
];

export function ReportModal({
  isOpen,
  onClose,
  onSubmit,
  partnerNickname,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('harassment');
  const [detail, setDetail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    onSubmit(selectedReason, detail.trim() || undefined);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Report ${partnerNickname || 'Stranger'}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Submitting a report will instantly disconnect and block this user. The last 20 messages will be reviewed by moderation.
        </p>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {REASONS.map((r) => {
            const Icon = r.icon;
            const isSelected = selectedReason === r.id;
            return (
              <label
                key={r.id}
                onClick={() => setSelectedReason(r.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-rose-500/80 bg-rose-500/10 text-zinc-900 dark:text-zinc-100 ring-1 ring-rose-500/50'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isSelected
                      ? 'bg-rose-500 text-white'
                      : 'bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{r.label}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {r.desc}
                  </div>
                </div>
                <input
                  type="radio"
                  name="reportReason"
                  checked={isSelected}
                  onChange={() => setSelectedReason(r.id)}
                  className="mt-1 text-rose-600 focus:ring-rose-500"
                />
              </label>
            );
          })}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Additional details (optional)
          </label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Add context to help moderators evaluate this report..."
            className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-100/70 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:scale-98 rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Report & Disconnect
          </button>
        </div>
      </form>
    </Modal>
  );
}
