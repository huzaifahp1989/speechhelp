import { useCallback, useEffect, useRef, useState } from 'react';
import { isCustomReciter } from '@/data/reciters';
import { stopGlobalQuranAudio } from '@/lib/quranAudio';
import { getWordSegmentForVerse } from '@/lib/quranWordTimestamps';
import type { QuranWord } from '@/types/quranWord';

type PlayWordOptions = {
  ayahAudioUrl?: string;
  /** Index among speakable words (excludes ayah-end marker). */
  wordIndex?: number;
};

function waitForMetadata(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('word audio metadata failed'));
    };
    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onReady);
      audio.removeEventListener('error', onError);
    };
    audio.addEventListener('loadedmetadata', onReady);
    audio.addEventListener('error', onError);
  });
}

async function seekTo(audio: HTMLAudioElement, timeSec: number): Promise<void> {
  if (Math.abs(audio.currentTime - timeSec) < 0.02) return;
  audio.currentTime = timeSec;
  await new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('word audio seek failed'));
    };
    const cleanup = () => {
      audio.removeEventListener('seeked', onSeeked);
      audio.removeEventListener('error', onError);
    };
    audio.addEventListener('seeked', onSeeked);
    audio.addEventListener('error', onError);
  });
}

/** Play word clips from the selected reciter's ayah audio (accurate), wbw fallback otherwise. */
export function useQuranWordAudio(reciterId: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playRequestRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playingWordId, setPlayingWordId] = useState<number | null>(null);

  useEffect(() => {
    const audio = document.createElement('audio');
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    audio.setAttribute('aria-hidden', 'true');
    audio.style.position = 'fixed';
    audio.style.width = '0';
    audio.style.height = '0';
    audio.style.opacity = '0';
    audio.style.pointerEvents = 'none';
    document.body.appendChild(audio);
    audioRef.current = audio;

    const clearPlaying = () => setPlayingWordId(null);
    audio.addEventListener('ended', clearPlaying);
    audio.addEventListener('error', clearPlaying);

    return () => {
      audio.removeEventListener('ended', clearPlaying);
      audio.removeEventListener('error', clearPlaying);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      audio.pause();
      audio.removeAttribute('src');
      audio.remove();
      audioRef.current = null;
    };
  }, []);

  const stopWord = useCallback(() => {
    const audio = audioRef.current;
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    setPlayingWordId(null);
  }, []);

  useEffect(() => {
    const onAyahPlay = (e: Event) => {
      const g = globalThis as typeof globalThis & { __SPEECHHELP_AUDIO__?: HTMLAudioElement };
      if (e.target === g.__SPEECHHELP_AUDIO__) stopWord();
    };
    document.addEventListener('play', onAyahPlay, true);
    return () => document.removeEventListener('play', onAyahPlay, true);
  }, [stopWord]);

  const playSegment = useCallback(
    async (
      requestId: number,
      audio: HTMLAudioElement,
      url: string,
      startMs: number,
      endMs: number,
      wordId: number
    ) => {
      if (requestId !== playRequestRef.current) return;

      audio.pause();
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);

      audio.src = url;
      audio.load();

      await waitForMetadata(audio);
      if (requestId !== playRequestRef.current) return;

      const startSec = startMs / 1000;
      setPlayingWordId(wordId);

      await seekTo(audio, startSec);
      if (requestId !== playRequestRef.current) return;

      await audio.play();
      if (requestId !== playRequestRef.current) return;

      const durationMs = Math.max(50, endMs - startMs);
      stopTimerRef.current = setTimeout(() => {
        if (requestId !== playRequestRef.current) return;
        audio.pause();
        setPlayingWordId(null);
        stopTimerRef.current = null;
      }, durationMs + 40);
    },
    []
  );

  const playWord = useCallback(
    async (word: QuranWord, options: PlayWordOptions = {}) => {
      if (word.char_type_name === 'end') return;

      const requestId = ++playRequestRef.current;
      stopGlobalQuranAudio();

      const audio = audioRef.current;
      if (!audio) return;

      const verseKey = word.verse_key;
      const canUseTimestamps =
        verseKey && !isCustomReciter(reciterId) && Boolean(options.ayahAudioUrl);

      if (canUseTimestamps && verseKey) {
        try {
          const segment = await getWordSegmentForVerse(
            reciterId,
            verseKey,
            options.wordIndex ?? -1,
            word.position
          );
          if (requestId !== playRequestRef.current) return;

          if (segment && options.ayahAudioUrl) {
            await playSegment(
              requestId,
              audio,
              options.ayahAudioUrl,
              segment.startMs,
              segment.endMs,
              word.id
            );
            return;
          }
        } catch {
          /* fall through to wbw */
        }
      }

      if (!word.audioUrl) return;
      if (requestId !== playRequestRef.current) return;

      audio.pause();
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      audio.src = word.audioUrl;
      setPlayingWordId(word.id);
      audio.play().catch(() => {
        if (requestId === playRequestRef.current) setPlayingWordId(null);
      });
    },
    [playSegment, reciterId]
  );

  return { playWord, stopWord, playingWordId };
};
