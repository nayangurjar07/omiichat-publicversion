'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Loader2 } from 'lucide-react';
import { getApiBase } from '@/lib/endpoints';

interface VoiceNoteRecorderProps {
  onAudioReady: (audioUrl: string) => void;
  onCancel: () => void;
}

const MAX_RECORDING_SECONDS = 30;

export function VoiceNoteRecorder({ onAudioReady, onCancel }: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');

  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch {}
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setIsRecording(false);
      };

      recorder.start(250);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= MAX_RECORDING_SECONDS - 1) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setError('Microphone access denied or not supported in this browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const uploadAndSend = async (blobToSend?: Blob) => {
    const blob = blobToSend || audioBlob;
    if (!blob) return;

    setIsUploading(true);
    try {
      const ext = mimeTypeRef.current.includes('mp4') ? 'm4a' : mimeTypeRef.current.includes('ogg') ? 'ogg' : 'webm';
      const formData = new FormData();
      formData.append('file', blob, `voicenote.${ext}`);

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
          const text = await res.text().catch(() => '');
          if (text) errMsg = text.slice(0, 100);
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      onAudioReady(data.url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send audio note';
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStopAndSend = () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
          uploadAndSend(blob);
        };
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    } else if (audioBlob) {
      uploadAndSend(audioBlob);
    }
  };

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-between p-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400">
        <span>{error}</span>
        <button
          onClick={onCancel}
          className="ml-3 font-semibold hover:underline cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 p-2 px-3 rounded-2xl bg-zinc-800/95 border border-zinc-700 animate-in fade-in duration-200 w-full max-w-md">
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
        </span>
        <span className="text-xs font-semibold text-rose-400">
          Recording Voice Note
        </span>
        <span className="text-xs font-mono font-bold text-zinc-200 ml-1">
          {formatSecs(seconds)} / 0:30
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => {
            cleanup();
            onCancel();
          }}
          title="Cancel recording"
          className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {isRecording && (
          <button
            onClick={stopRecording}
            title="Stop recording"
            className="p-2 rounded-xl text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        )}

        <button
          onClick={handleStopAndSend}
          disabled={isUploading}
          title="Send voice note"
          className="p-2 px-3.5 rounded-xl bg-[var(--accent-dial)] hover:opacity-90 text-white font-medium text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
