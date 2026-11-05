'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/endpoints';

interface VoiceNotePlayerProps {
  audioUrl: string;
  isSelf?: boolean;
}

export function VoiceNotePlayer({ audioUrl, isSelf = false }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const resolvedUrl = resolveMediaUrl(audioUrl);

  useEffect(() => {
    if (!resolvedUrl) return;

    const audio = new Audio(resolvedUrl);
    audioRef.current = audio;

    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        if (isFinite(audio.duration)) {
          setDuration(Math.round(audio.duration));
        } else if (audio.duration === Infinity) {
          // WebM duration workaround
          audio.currentTime = 1e10;
          const onSeekFix = () => {
            audio.removeEventListener('timeupdate', onSeekFix);
            if (isFinite(audio.duration)) {
              setDuration(Math.round(audio.duration));
            }
            audio.currentTime = 0;
          };
          audio.addEventListener('timeupdate', onSeekFix);
        }
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(Math.round(audio.currentTime));
      if (duration === 0 && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(Math.round(audio.duration));
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('canplay', updateDuration);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('canplay', updateDuration);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audioRef.current = null;
      if (resolvedUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(resolvedUrl);
        } catch {}
      }
    };
  }, [resolvedUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const formatSecs = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '0:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const barHeights = [40, 70, 90, 50, 80, 100, 60, 45, 85, 95, 75, 55, 90, 65, 40, 80, 100, 60];

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-xl max-w-xs select-none border transition-colors ${
        isSelf
          ? 'bg-[var(--accent-dial)] text-white border-transparent'
          : 'bg-[var(--accent-stranger)] text-[var(--accent-stranger-ink)] border-[var(--border-line)]'
      }`}
    >
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 cursor-pointer ${
          isSelf
            ? 'bg-white text-[var(--accent-dial)] hover:bg-zinc-100'
            : 'bg-[var(--text-ink)] text-[var(--bg-paper)] hover:opacity-90'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      {/* Waveform bars */}
      <div className="flex-1 flex items-center gap-1 h-7">
        {barHeights.map((h, i) => {
          const barRatio = i / barHeights.length;
          const isPassed = barRatio <= progressRatio;
          return (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className={`w-1 rounded-full transition-colors duration-150 ${
                isSelf
                  ? isPassed
                    ? 'bg-white'
                    : 'bg-white/40'
                  : isPassed
                  ? 'bg-[var(--accent-stranger-ink)]'
                  : 'bg-[var(--accent-stranger-ink)]/25'
              }`}
            />
          );
        })}
      </div>

      <span className="text-[11px] font-mono shrink-0 opacity-90">
        {formatSecs(currentTime > 0 ? currentTime : duration)}
      </span>
    </div>
  );
}
