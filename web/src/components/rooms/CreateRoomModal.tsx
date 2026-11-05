'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Copy, Check, ArrowRight, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => Promise<{ roomId: string; inviteCode: string; inviteUrl: string }>;
}

export function CreateRoomModal({ isOpen, onClose, onCreate }: CreateRoomModalProps) {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{ roomId: string; inviteCode: string; inviteUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    setLoading(true);
    try {
      const res = await onCreate(roomName.trim(), description.trim() || undefined);
      setCreatedInfo(res);
    } catch {
      alert("Can't reach the server. Failed to create private room.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdInfo) return;
    const fullUrl = `${window.location.origin}${createdInfo.inviteUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinNow = () => {
    if (!createdInfo) return;
    onClose();
    router.push(createdInfo.inviteUrl);
  };

  const handleResetAndClose = () => {
    setRoomName('');
    setDescription('');
    setCreatedInfo(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={createdInfo ? 'Private room created' : 'Create private room'}
    >
      {createdInfo ? (
        <div className="space-y-5 text-center">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-[var(--text-ink)]">
              Your room is open
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Share this 6-character code or link to bring in friends. You have host controls to kick or mute participants.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-line)] space-y-1">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Invite code
            </span>
            <div className="text-3xl font-bold font-mono tracking-widest text-[var(--accent-dial)]">
              {createdInfo.inviteCode}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              Empty private rooms expire after 30 minutes.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyLink}
              className="min-h-[44px] flex items-center justify-center gap-1.5 px-4 rounded-lg text-xs font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--border-line)] text-[var(--text-ink)] border border-[var(--border-line)] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-[var(--color-success)]" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy link'}</span>
            </button>

            <button
              type="button"
              onClick={handleJoinNow}
              className="min-h-[44px] flex items-center justify-center gap-1.5 px-4 rounded-lg text-xs font-semibold bg-[var(--accent-dial)] hover:bg-[var(--accent-dial-hover)] text-white transition-colors cursor-pointer"
            >
              <span>Enter room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-[var(--text-muted)]">
            Create an unlisted group room accessible only by invite link or code.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-ink)]">
              Room name
            </label>
            <input
              type="text"
              required
              maxLength={40}
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Design review"
              className="w-full min-h-[44px] px-3.5 text-sm rounded-lg bg-[var(--bg-paper)] border border-[var(--border-line)] text-[var(--text-ink)] placeholder-[var(--text-muted)] focus:border-[var(--accent-dial)] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-ink)]">
              Topic (optional)
            </label>
            <input
              type="text"
              maxLength={100}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you discussing?"
              className="w-full min-h-[44px] px-3.5 text-sm rounded-lg bg-[var(--bg-paper)] border border-[var(--border-line)] text-[var(--text-ink)] placeholder-[var(--text-muted)] focus:border-[var(--accent-dial)] transition-colors"
            />
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-line)] flex items-start gap-2 text-xs text-[var(--text-muted)] leading-relaxed">
            <Shield className="w-4 h-4 text-[var(--accent-dial)] shrink-0 mt-0.5" />
            <span>
              You will be the <strong>Host</strong> with permission to mute or remove members.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || !roomName.trim()}
            className="w-full min-h-[44px] rounded-lg bg-[var(--accent-dial)] hover:bg-[var(--accent-dial-hover)] text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-40"
          >
            {loading ? 'Creating...' : 'Create room'}
          </button>
        </form>
      )}
    </Modal>
  );
}
