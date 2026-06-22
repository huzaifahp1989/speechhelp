import { useCallback, useEffect, useRef, useState } from 'react';
import type { HifzRecordingMeta } from '@/types/hifzRecording';
import { saveHifzRecording } from '@/lib/hifzRecordingStore';

export type RecordingContext = {
  verseKey: string;
  surahId?: number;
  surahName?: string;
  juz?: number;
  mistakeCount?: number;
  wordsCompleted?: number;
  wordsTotal?: number;
};

type Options = {
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onSaved?: (meta: HifzRecordingMeta) => void;
};

export function useHifzVoiceRecorder({ onRecordingStart, onRecordingStop, onSaved }: Options = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [lastSaved, setLastSaved] = useState<HifzRecordingMeta | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);
  const contextRef = useRef<RecordingContext | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
      clearPreview();
    };
  }, [clearPreview]);

  const startRecording = useCallback(
    async (context: RecordingContext) => {
      if (isRecording) return;
      setError(null);
      clearPreview();
      contextRef.current = context;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunksRef.current, { type: mimeType });
          chunksRef.current = [];
          const ctx = contextRef.current;
          if (!ctx || blob.size === 0) return;

          setIsSaving(true);
          try {
            const meta: HifzRecordingMeta = {
              id: Math.random().toString(36).slice(2, 11),
              verseKey: ctx.verseKey,
              surahId: ctx.surahId,
              surahName: ctx.surahName,
              juz: ctx.juz,
              durationSec: durationRef.current,
              mistakeCount: ctx.mistakeCount ?? 0,
              wordsCompleted: ctx.wordsCompleted ?? 0,
              wordsTotal: ctx.wordsTotal ?? 0,
              createdAt: Date.now(),
            };
            await saveHifzRecording(meta, blob);
            setLastSaved(meta);
            const url = URL.createObjectURL(blob);
            previewUrlRef.current = url;
            setPreviewUrl(url);
            onSaved?.(meta);
          } catch (e) {
            setError((e as Error).message || 'Failed to save recording');
          } finally {
            setIsSaving(false);
          }
        };

        recorder.start(1000);
        setIsRecording(true);
        durationRef.current = 0;
        setDurationSec(0);
        onRecordingStart?.();

        timerRef.current = setInterval(() => {
          durationRef.current += 1;
          setDurationSec(durationRef.current);
        }, 1000);
      } catch {
        setError('Microphone access denied. Allow mic permission to record.');
      }
    },
    [clearPreview, isRecording, onRecordingStart, onSaved]
  );

  const stopRecording = useCallback(
    (patch?: Partial<RecordingContext>) => {
      if (!mediaRecorderRef.current || !isRecording) return;
      if (patch && contextRef.current) {
        contextRef.current = { ...contextRef.current, ...patch };
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onRecordingStop?.();
    },
    [isRecording, onRecordingStop]
  );

  const discardPreview = useCallback(() => {
    clearPreview();
    setLastSaved(null);
  }, [clearPreview]);

  return {
    isRecording,
    durationSec,
    lastSaved,
    previewUrl,
    error,
    isSaving,
    isSupported: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
    startRecording,
    stopRecording,
    discardPreview,
  };
}
