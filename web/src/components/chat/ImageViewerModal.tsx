'use client';

import { useEffect } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  senderNick?: string;
}

export function ImageViewerModal({
  isOpen,
  onClose,
  imageUrl,
  senderNick,
}: ImageViewerModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-zinc-200 mb-3 backdrop-blur-md shadow-xl">
          <div className="text-xs font-semibold text-zinc-300 truncate">
            Shared by {senderNick || 'Stranger'}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              title="Open full image in new tab"
              className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href={imageUrl}
              download
              title="Download image"
              className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              title="Close viewer"
              className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-black/60 shadow-2xl flex items-center justify-center max-h-[75vh]">
          <img
            src={imageUrl}
            alt="Full-size view"
            className="max-w-full max-h-[75vh] object-contain rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
}
