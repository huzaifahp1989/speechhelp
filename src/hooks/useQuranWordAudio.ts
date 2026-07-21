import { useCallback, useEffect, useRef, useState } from 'react';
import { supportsReciterWordTimestamps } from '@/data/reciters';
import { resolveWordAudioUrl } from '@/lib/quranAudioUrls';
import { stopGlobalQuranAudio } from '@/lib/quranAudio';
import { getWordSegmentForVerse } from '@/lib/quranWordTimestamps';
import type { QuranWord } from '@/types/quranWord';

/** Reliable Quran.com reciter used when wbw clips 404 or EveryAyah has no timestamps. */
const FALLBACK_WORD_RECITER_ID = 7;

type PlayWordOptions = {
  /** Quran.com per-ayah MP3 for the selected reciter (not EveryAyah). */
  ayahAudioUrl?: string;
  /** Index among speakable words (excludes ayah-end marker). */
  wordIndex?: number;
  /** Total speakable words in ayah — validates timestamp segments. */
  speakableWordCount?: number;
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

function sameAudioSrc(audio: HTMLAudioElement, url: string): boolean {
  if (!audio.src) return false;
  try {
    return audio.src === new URL(url, window.location.href).href;
  } catch {
    return audio.src === url || audio.src.endsWith(url);
  }
}

function isQuranComAyahUrl(url?: string): boolean {
  if (!url) return false;
  // EveryAyah CDN must never be paired with Quran.com word timestamps.
  if (/everyayah\.com/i.test(url)) return false;
  return /verses\.quran\.com|qurancdn\.com|quranicaudio\.com/i.test(url);
}

/** Play the tapped word via reciter timestamps (ayah seek) or wbw clip fallback. */
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

      if (!sameAudioSrc(audio, url)) {
        audio.src = url;
        audio.load();
      }

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

  const playClip = useCallback(async (requestId: number, audio: HTMLAudioElement, url: string, wordId: number) => {
    if (requestId !== playRequestRef.current) return;

    audio.pause();
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    // Always reload clip URLs — 404s / stale errors must surface to the caller.
    audio.src = url;
    audio.load();
    await waitForMetadata(audio);
    if (requestId !== playRequestRef.current) return;

    audio.currentTime = 0;
    setPlayingWordId(wordId);
    await audio.play();
  }, []);

  const tryTimestampPlayback = useCallback(
    async (
      requestId: number,
      audio: HTMLAudioElement,
      word: QuranWord,
      options: PlayWordOptions,
      timestampReciterId: number,
      knownAyahUrl?: string
    ) => {
      const verseKey = word.verse_key;
      if (!verseKey || (options.wordIndex ?? -1) < 0) return false;

      const segment = await getWordSegmentForVerse(
        timestampReciterId,
        verseKey,
        options.wordIndex ?? -1,
        word.position,
        options.speakableWordCount,
        undefined,
        knownAyahUrl
      );
      if (requestId !== playRequestRef.current) return true;
      if (!segment) return false;

      await playSegment(
        requestId,
        audio,
        segment.audioUrl,
        segment.startMs,
        segment.endMs,
        word.id
      );
      return true;
    },
    [playSegment]
  );

  const playWord = useCallback(
    async (word: QuranWord, options: PlayWordOptions = {}) => {
      if (word.char_type_name === 'end') return;

      const requestId = ++playRequestRef.current;
      stopGlobalQuranAudio();

      const audio = audioRef.current;
      if (!audio) return;

      const knownAyahUrl = isQuranComAyahUrl(options.ayahAudioUrl)
        ? options.ayahAudioUrl
        : undefined;

      // 1) Quran.com reciter: seek the ayah MP3 using word timestamps (covers broken wbw 404s).
      if (supportsReciterWordTimestamps(reciterId)) {
        try {
          const ok = await tryTimestampPlayback(
            requestId,
            audio,
            word,
            options,
            reciterId,
            knownAyahUrl
          );
          if (ok) return;
        } catch {
          /* try wbw */
        }
      }

      // 2) Isolated wbw clip (EveryAyah / timestamp miss). Many API urls 404 — must fall through.
      const wbwUrl = resolveWordAudioUrl(word);
      if (wbwUrl) {
        try {
          await playClip(requestId, audio, wbwUrl, word.id);
          return;
        } catch {
          /* fall through */
        }
      }

      // 3) Last resort: Alafasy ayah timestamps (fixes missing wbw files on EveryAyah too).
      try {
        await tryTimestampPlayback(
          requestId,
          audio,
          word,
          options,
          FALLBACK_WORD_RECITER_ID,
          reciterId === FALLBACK_WORD_RECITER_ID ? knownAyahUrl : undefined
        );
      } catch {
        if (requestId === playRequestRef.current) setPlayingWordId(null);
      }
    },
    [playClip, reciterId, tryTimestampPlayback]
  );

  return { playWord, stopWord, playingWordId };
}
