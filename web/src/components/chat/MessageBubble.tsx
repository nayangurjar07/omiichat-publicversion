'use client';

import { useState } from 'react';
import { ChatMessage, RoomMessage } from '@/types';
import { getSessionId } from '@/lib/session';
import { resolveMediaUrl } from '@/lib/endpoints';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { ImageViewerModal } from './ImageViewerModal';
import { Copy, Eye, EyeOff, Maximize2, ShieldAlert } from 'lucide-react';

interface MessageBubbleProps {
  message: ChatMessage | RoomMessage;
  partnerNickname?: string;
  isConsecutive?: boolean;
  onReportMessage?: (msg: ChatMessage | RoomMessage) => void;
}

export function MessageBubble({
  message,
  partnerNickname,
  isConsecutive = false,
  onReportMessage,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const currentSid = typeof window !== 'undefined' ? getSessionId() : '';
  const isSelf =
    'isSelf' in message && typeof message.isSelf === 'boolean'
      ? !!message.isSelf
      : !!currentSid && message.senderId === currentSid;

  const [isRevealed, setIsRevealed] = useState(isSelf);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const copyText = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const resolvedMediaUrl = message.mediaUrl ? resolveMediaUrl(message.mediaUrl) : undefined;

  // System notice
  if (message.isSystem) {
    return (
      <div className="flex justify-center my-2 select-none font-mono">
        <span className="px-3 py-1 text-xs text-zinc-400 bg-[#141414] rounded border border-[#27272a]">
          {message.text}
        </span>
      </div>
    );
  }

  const senderDisplayName = isSelf
    ? 'You'
    : message.senderNick || partnerNickname || 'Stranger';

  return (
    <div
      className={`group relative flex flex-col ${
        isConsecutive ? 'mt-1' : 'mt-2.5'
      } ${isSelf ? 'items-end' : 'items-start'}`}
    >
      {/* Sender name & time */}
      {!isConsecutive && (
        <div className="flex items-center gap-2 mb-1 px-1 font-mono text-[11px] text-zinc-500">
          <span className="font-semibold text-zinc-300">{senderDisplayName}</span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">
            {formatTime(message.timestamp)}
          </span>
        </div>
      )}

      {/* Bubble Container */}
      <div className="relative max-w-[85%] sm:max-w-[75%]">
        <div
          className={`text-sm leading-relaxed break-words overflow-hidden ${
            message.mediaType === 'image'
              ? 'p-1.5 bg-[#141414] border border-[#27272a] rounded-lg'
              : message.mediaType === 'audio'
              ? 'p-0.5'
              : isSelf
              ? 'px-3.5 py-2 bg-zinc-800 text-white rounded-lg rounded-br-xs border border-zinc-700'
              : 'px-3.5 py-2 bg-[#18181b] text-zinc-100 rounded-lg rounded-bl-xs border border-[#27272a]'
          }`}
        >
          {/* IMAGE MEDIA */}
          {message.mediaType === 'image' && resolvedMediaUrl && (
            <div className="relative rounded overflow-hidden bg-black/20">
              <img
                src={resolvedMediaUrl}
                alt="Shared attachment"
                onClick={() => {
                  if (isRevealed) setIsViewerOpen(true);
                }}
                className={`max-w-xs sm:max-w-sm max-h-80 w-auto h-auto object-cover rounded transition-all duration-200 ${
                  isRevealed ? 'filter-none cursor-pointer hover:opacity-95' : 'filter blur-xl scale-105'
                }`}
              />

              {!isRevealed && (
                <div
                  onClick={() => setIsRevealed(true)}
                  className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 text-center cursor-pointer select-none text-white font-mono"
                >
                  <Eye className="w-5 h-5 mb-1 opacity-90" />
                  <span className="text-xs font-bold">Image hidden</span>
                  <span className="text-[10px] text-zinc-400 mt-0.5">Click to view</span>
                </div>
              )}

              {isRevealed && (
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity font-mono">
                  <button
                    type="button"
                    onClick={() => setIsViewerOpen(true)}
                    title="View full screen"
                    className="p-1.5 rounded bg-black/80 text-white text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRevealed(false)}
                    title="Hide image"
                    className="p-1.5 rounded bg-black/80 text-white text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <EyeOff className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AUDIO MEDIA */}
          {message.mediaType === 'audio' && resolvedMediaUrl && (
            <VoiceNotePlayer audioUrl={resolvedMediaUrl} isSelf={isSelf} />
          )}

          {/* TEXT CONTENT */}
          {message.text && (
            <p className="whitespace-pre-wrap select-text font-sans">{message.text}</p>
          )}
        </div>

        {/* Hover Action Strip */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
            isSelf ? '-left-13 pr-1' : '-right-13 pl-1'
          }`}
        >
          {message.text && (
            <button
              type="button"
              onClick={copyText}
              title={copied ? 'Copied' : 'Copy message'}
              className="p-1.5 rounded bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-colors cursor-pointer"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
          {!isSelf && onReportMessage && (
            <button
              type="button"
              onClick={() => onReportMessage(message)}
              title="Report message"
              className="p-1.5 rounded bg-[#18181b] hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-[#27272a] transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Full-screen Viewer */}
      {resolvedMediaUrl && message.mediaType === 'image' && (
        <ImageViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          imageUrl={resolvedMediaUrl}
        />
      )}
    </div>
  );
}
