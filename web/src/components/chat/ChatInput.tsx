'use client';

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { SendHorizonal, Mic, Image as ImageIcon, Loader2, X, FastForward, CornerDownLeft } from 'lucide-react';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { getApiBase } from '@/lib/endpoints';

interface ChatInputProps {
  onSendMessage: (text?: string, mediaUrl?: string, mediaType?: 'image' | 'audio') => void;
  onTyping: (isTyping: boolean) => void;
  onDoubleEsc?: () => void;
  onSkip?: () => void;
  disabled?: boolean;
  placeholder?: string;
  isSkipConfirming?: boolean;
}

const MAX_LENGTH = 500;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB upload cap aligned with server

export function ChatInput({
  onSendMessage,
  onTyping,
  onDoubleEsc,
  onSkip,
  disabled = false,
  placeholder,
  isSkipConfirming = false,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerSkip = onSkip || onDoubleEsc;

  // Global Escape key listener on desktop to immediately trigger partner disconnection & rematch
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && triggerSkip && !disabled) {
        e.preventDefault();
        triggerSkip();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [triggerSkip, disabled]);

  useEffect(() => {
    if (!disabled && !isRecording && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled, isRecording]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, MAX_LENGTH);
    setText(val);

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping(true);
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (triggerSkip) triggerSkip();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed);
    setText('');

    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping(false);
    }

    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleImageSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Image must be under 2 MB.');
      setTimeout(() => setImageError(null), 4000);
      return;
    }

    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      setImageError('Only JPEG, PNG, and WebP images are supported.');
      setTimeout(() => setImageError(null), 4000);
      return;
    }

    setIsUploadingImage(true);
    setImageError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errMsg = 'Upload failed';
        try {
          const data = await res.json();
          errMsg = data.error || errMsg;
        } catch {
          const textMsg = await res.text().catch(() => '');
          if (textMsg) errMsg = textMsg.slice(0, 100);
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      onSendMessage(text.trim() || undefined, data.url, 'image');
      setText('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload image';
      setImageError(msg);
      setTimeout(() => setImageError(null), 5000);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleVoiceNoteReady = (audioUrl: string) => {
    onSendMessage(undefined, audioUrl, 'audio');
    setIsRecording(false);
  };

  const charsLeft = MAX_LENGTH - text.length;

  return (
    <div className="w-full bg-[#121212] border-t border-[#27272a] p-2 sm:p-3 transition-colors pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {imageError && (
        <div className="max-w-4xl mx-auto mb-2 p-2 rounded bg-rose-950/60 border border-rose-500/40 text-xs font-mono text-rose-300 flex items-center justify-between">
          <span>{imageError}</span>
          <button type="button" onClick={() => setImageError(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Prominent Mobile Thumb-Friendly Action Bar with 2-step confirmation */}
      {triggerSkip && (
        <div className="sm:hidden mb-2">
          <button
            type="button"
            onClick={triggerSkip}
            className={`w-full h-11 rounded font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all shadow-sm active:scale-95 cursor-pointer ${
              isSkipConfirming
                ? 'bg-amber-400 text-black border-amber-300 animate-pulse'
                : 'bg-zinc-800 active:bg-zinc-700 text-white border-zinc-700'
            }`}
          >
            <FastForward className={`w-4 h-4 ${isSkipConfirming ? 'fill-black text-black' : 'text-emerald-400'}`} />
            <span>{isSkipConfirming ? 'Sure? Tap to confirm skip' : 'Next Match / Skip'}</span>
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto flex items-end gap-2">
        {isRecording ? (
          <VoiceNoteRecorder
            onAudioReady={handleVoiceNoteReady}
            onCancel={() => setIsRecording(false)}
          />
        ) : (
          <>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Desktop Quick Skip Action Button */}
            {triggerSkip && (
              <button
                type="button"
                onClick={triggerSkip}
                title="Skip partner instantly (or hit Esc)"
                className="hidden sm:inline-flex h-11 px-3 items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 font-mono text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <span>Skip</span>
                <kbd className="ml-1.5 px-1 py-0.2 rounded text-[10px] bg-zinc-900 text-zinc-400 border border-zinc-700">
                  Esc
                </kbd>
              </button>
            )}

            {/* Media attachment buttons */}
            <div className="flex items-center gap-1 shrink-0 pb-0.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploadingImage}
                title="Send photo (JPEG, PNG, WebP)"
                aria-label="Send photo"
                className="w-10 h-10 inline-flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-40"
              >
                {isUploadingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsRecording(true)}
                disabled={disabled}
                title="Record voice note"
                aria-label="Record voice note"
                className="w-10 h-10 inline-flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-40"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            {/* Textarea */}
            <div className="relative flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                rows={1}
                maxLength={MAX_LENGTH}
                placeholder={
                  placeholder ||
                  (disabled
                    ? 'Connecting to the line...'
                    : 'Type a message... (Enter to send, Esc to skip)')
                }
                className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded bg-[#0a0a0a] border border-[#27272a] text-zinc-100 placeholder-zinc-600 focus:border-zinc-400 focus:outline-none resize-none transition-colors disabled:opacity-50 font-sans"
              />

              {text.length > 400 && (
                <span className="absolute right-3 bottom-2 text-[10px] font-mono text-zinc-500">
                  {charsLeft}
                </span>
              )}
            </div>

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={disabled || !text.trim()}
              aria-label="Send message"
              className="h-11 px-3.5 inline-flex items-center justify-center rounded bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs disabled:opacity-40 transition-colors cursor-pointer shrink-0 pb-0.5 active:scale-95"
            >
              <SendHorizonal className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
