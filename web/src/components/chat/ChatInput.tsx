// web/src/components/chat/ChatInput.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface ChatInputProps {
  onSendMessage?: (text: string, imageUrl?: string) => void;
  onSend?: (text: string, imageUrl?: string) => void;
  onSendImage?: (imageUrl: string) => void;
  onSendVoice?: (audioUrl: string, duration?: number) => void;
  onSkip?: () => void;
  onNext?: () => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  isConnected?: boolean;
  placeholder?: string;
  [key: string]: any;
}

// Client-side image compressor so photos send fast & never hit payload limits
async function compressImageFile(file: File, maxWidth = 1280, quality = 0.82): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Compression failed'));
            resolve({ blob, dataUrl });
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ChatInput(props: ChatInputProps) {
  const {
    onSendMessage,
    onSend,
    onSendImage,
    onSkip,
    onNext,
    onTyping,
    disabled = false,
    isConnected = true,
    placeholder = 'Type a message or paste a photo...',
  } = props;

  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [skipArmed, setSkipArmed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const skipTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isChatDisabled = disabled || !isConnected;

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    };
  }, [previewUrl]);

  const clearSelectedPhoto = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (file: File | null | undefined) => {
    setErrorMsg(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image (JPG, PNG, WebP, GIF).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image must be smaller than 10 MB.');
      return;
    }
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const uploadPhotoAndGetUrl = async (file: File): Promise<string> => {
    const { blob, dataUrl } = await compressImageFile(file);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'photo.jpg');
      formData.append('image', blob, 'photo.jpg');

      const res = await fetch('/api/upload?type=image', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.url) return data.url;
        if (data?.imageUrl) return data.imageUrl;
      }
    } catch {
      // Fallback to compressed base64 dataUrl so photo still sends even if storage is offline
    }
    return dataUrl;
  };

  const dispatchMessage = (msgText: string, imgUrl?: string) => {
    if (imgUrl && onSendImage && !msgText.trim()) {
      onSendImage(imgUrl);
      return;
    }
    if (onSendMessage) {
      onSendMessage(msgText, imgUrl);
    } else if (onSend) {
      onSend(msgText, imgUrl);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isChatDisabled || isUploading) return;

    const trimmed = text.trim();
    if (!trimmed && !selectedFile) return;

    setErrorMsg(null);

    if (selectedFile) {
      setIsUploading(true);
      try {
        const uploadedUrl = await uploadPhotoAndGetUrl(selectedFile);
        dispatchMessage(trimmed, uploadedUrl);
        setText('');
        clearSelectedPhoto();
      } catch {
        setErrorMsg('Failed to process photo. Try another image.');
      } finally {
        setIsUploading(false);
      }
    } else {
      dispatchMessage(trimmed);
      setText('');
    }

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.focus();
    }
  };

  const handleSkipClick = () => {
    const skipFn = onSkip || onNext;
    if (!skipFn) return;
    if (!skipArmed) {
      setSkipArmed(true);
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
      skipTimerRef.current = setTimeout(() => setSkipArmed(false), 2500);
    } else {
      setSkipArmed(false);
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
      clearSelectedPhoto();
      skipFn();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFileSelect(file);
          break;
        }
      }
    }
  };

  return (
    <div className="w-full shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-colors">
      {/* Error Toast */}
      {errorMsg && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs text-red-400">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="ml-2 font-bold hover:text-red-300">
            ✕
          </button>
        </div>
      )}

      {/* Selected Photo Thumbnail Preview */}
      {previewUrl && (
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-[var(--bg-tertiary)] p-2 border border-[var(--border-subtle)]">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10">
            <img src={previewUrl} alt="Upload preview" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium text-[var(--text-primary)]">
              {selectedFile?.name || 'Photo ready to send'}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {isUploading ? 'Compressing & sending...' : 'Press Send or Enter to share'}
            </p>
          </div>
          <button
            type="button"
            onClick={clearSelectedPhoto}
            disabled={isUploading}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-black/20 hover:text-red-400 transition"
            title="Remove photo"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 max-w-5xl mx-auto">
        {/* Two-Step Skip Button */}
        {(onSkip || onNext) && (
          <button
            type="button"
            onClick={handleSkipClick}
            className={`h-11 px-3.5 rounded-xl font-semibold text-xs sm:text-sm shrink-0 transition-all active:scale-95 border ${
              skipArmed
                ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-indigo-500/40'
            }`}
          >
            {skipArmed ? 'Sure? (Esc)' : 'Skip'}
          </button>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files?.[0])}
        />

        {/* Photo Upload Trigger Button */}
        <button
          type="button"
          disabled={isChatDisabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
          title="Send a photo"
          aria-label="Send a photo"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-indigo-400 hover:border-indigo-500/40 disabled:opacity-40 transition-all active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Auto-expanding Textarea */}
        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            disabled={isChatDisabled}
            placeholder={isChatDisabled ? 'Waiting for a connection...' : placeholder}
            onPaste={handlePaste}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              if (onTyping) onTyping(e.target.value.length > 0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                handleSkipClick();
              }
            }}
            className="w-full max-h-[120px] min-h-[44px] resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-indigo-500 focus:outline-none disabled:opacity-50 transition"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={isChatDisabled || isUploading || (!text.trim() && !selectedFile)}
          className="flex h-11 px-4 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 font-semibold text-sm text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-40 transition-all active:scale-95"
        >
          {isUploading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <span className="hidden sm:inline">Send</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default ChatInput;
