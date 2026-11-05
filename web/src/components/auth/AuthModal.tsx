'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { apiRegister, apiLogin, apiGoogleLogin } from '@/lib/auth';
import { setStoredNickname } from '@/lib/session';
import { UserProfile } from '@/types';
import { LogIn, UserPlus, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await apiRegister({
          email: email.trim(),
          password,
          nickname: nickname.trim() || email.split('@')[0],
        });
        if (res.user.nickname) setStoredNickname(res.user.nickname);
        onSuccess(res.user);
        onClose();
      } else {
        const res = await apiLogin(email.trim(), password);
        if (res.user.nickname) setStoredNickname(res.user.nickname);
        onSuccess(res.user);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleMock = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const randomId = Math.random().toString(36).substring(2, 10);
      const guestNick = nickname.trim() || `User_${randomId.slice(0, 4)}`;
      const res = await apiGoogleLogin({
        googleId: `google_${randomId}`,
        email: `${guestNick.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        nickname: guestNick,
        avatar: 'avatar_google',
      });
      if (res.user.nickname) setStoredNickname(res.user.nickname);
      onSuccess(res.user);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google login failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'login' ? 'Sign in' : 'Create account'}
    >
      <div className="space-y-4">
        {/* Optional Account Banner */}
        <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] flex items-start gap-2.5 text-xs text-[var(--text-muted)]">
          <ShieldCheck className="w-4 h-4 text-[var(--accent-dial)] shrink-0 mt-0.5" />
          <span>
            Accounts are completely optional. You can always use Omii anonymously without signing in.
          </span>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-[var(--accent-dial)] text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-[var(--accent-dial)] text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
            }`}
          >
            Create account
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google One-Click Login */}
        <button
          type="button"
          onClick={handleGoogleMock}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-line)] hover:bg-[var(--bg-subtle)] text-[var(--text-ink)] font-medium text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--border-line)]" />
          <span className="text-xs text-[var(--text-muted)]">
            or with email
          </span>
          <div className="flex-1 h-px bg-[var(--border-line)]" />
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-ink)]">
                Display nickname
              </label>
              <input
                type="text"
                required
                maxLength={20}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. StarGazer"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-dial)]"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-ink)]">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-dial)]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-ink)]">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-dial)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[var(--accent-dial)] hover:opacity-90 text-white font-medium text-xs shadow-xs active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Processing...</span>
            ) : mode === 'register' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign in</span>
              </>
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
}
