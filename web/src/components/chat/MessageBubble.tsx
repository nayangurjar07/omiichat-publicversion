// web/src/components/chat/MessageBubble.tsx
'use client';

import React, { useState } from 'react';

export interface MessageBubbleProps {
  message: {
    id?: string;
    sender?: 'me' | 'stranger' | 'system' | string;
    isOwn?: boolean;
    isSelf?: boolean;
    type?: 'text' | 'image' | 'voice' | 'audio' | 'system' | string;
    content?: string;
    text?: string;
    imageUrl?: string;
    fileUrl?: string;
    url?: string;
    audioUrl?: string;
    timestamp?: string | number | Date;
    senderName?: string;
    [key: string]: any;
  };
  isOwn?: boolean;
  onImageClick?: (url: string) => void;
  [key: string]: any;
}

function extractImageSource(msg: MessageBubbleProps['message']): string | null {
  if (msg.imageUrl) return msg.imageUrl;
  if (msg.type === 'image' && (msg.fileUrl || msg.url || msg.content)) {
    return (msg.fileUrl || msg.url || msg.content) as string;
  }
  const raw = (msg.content || msg.text || '').trim();
  if (
    raw.startsWith('data:image/') ||
    raw.startsWith('/uploads/') ||
    /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(raw)
  ) {
    return raw;
  }
  return null;
}

export function MessageBubble({ message, isOwn: propIsOwn, onImageClick }: MessageBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (message.type === 'system' || message.sender === 'system') {
    return (
      <div className="my-2 flex justify-center px-4">
        <span className="rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] px-3.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
          {message.content || message.text}
        </span>
      </div>
    );
  }

  const isSelf =
    propIsOwn ??
    message.isOwn ??
    message.isSelf ??
    (message.sender === 'me' || message.sender === 'self' || message.sender === 'user');

  const imageSrc = extractImageSource(message);
  const rawText = (message.content || message.text || '').trim();
  const displayCaption = imageSrc && rawText === imageSrc ? '' : rawText;

  return (
    <>
      <div className={`my-1.5 flex w-full px-3 sm:px-4 ${isSelf ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`group relative max-w-[82%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-sm transition ${
            isSelf
              ? 'bg-[var(--bubble-self)] text-[var(--bubble-self-text)] rounded-br-sm'
              : 'bg-[var(--bubble-stranger)] text-[var(--bubble-stranger-text)] border border-[var(--border-subtle)] rounded-bl-sm'
          }`}
        >
          {!isSelf && message.senderName && (
            <div className="mb-1 text-[11px] font-semibold text-indigo-400">
              {message.senderName}
            </div>
          )}

          {/* Photo Attachment */}
          {imageSrc && (
            <div className="mb-1.5 overflow-hidden rounded-xl border border-black/10 bg-black/20">
              <img
                src={imageSrc}
                alt="Shared photo"
                loading="lazy"
                onClick={() => {
                  if (onImageClick) onImageClick(imageSrc);
                  else setLightboxOpen(true);
                }}
                className="max-h-72 w-auto max-w-full cursor-zoom-in object-contain transition hover:opacity-95"
              />
            </div>
          )}

          {/* Text Content */}
          {displayCaption && (
            <p className="whitespace-pre-wrap break-words text-[14.5px] leading-relaxed">
              {displayCaption}
            </p>
          )}
        </div>
      </div>

      {/* Built-in Fullscreen Image Lightbox */}
      {lightboxOpen && imageSrc && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
          >
            ✕
          </button>
          <img
            src={imageSrc}
            alt="Fullscreen view"
            className="max-h-[90dvh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

export default MessageBubble;
