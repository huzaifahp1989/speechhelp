import { useState, useEffect, useRef, useCallback } from 'react';

type Ayah = {
  verse_key: string;
  audio: { url: string; backupUrl?: string };
  text_uthmani?: string; // For MediaSession metadata
};

type AudioSettings = {
  repeatCount: number; // 1 = play once (default), 3, 5, Infinity
  autoScroll: boolean;
  playbackSpeed: number; // 1 = normal, 1.25, 1.5, 2 etc.
};

type UseQuranAudioProps = {
  ayahs: Ayah[];
  range?: { start: string; end: string } | null;
  onAyahEnd?: (verseKey: string) => boolean | void; // Return false to prevent auto-next
};

export function useQuranAudio({ ayahs, range, onAyahEnd }: UseQuranAudioProps) {
  const [playingAyahKey, setPlayingAyahKey] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [settings, setSettings] = useState<AudioSettings>({
    repeatCount: 1,
    autoScroll: true,
    playbackSpeed: 1,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextPreloadRef = useRef<{ verseKey: string; blobUrl: string } | null>(null);
  const lastUsedBlobUrlRef = useRef<string | null>(null);
  const preloadControllerRef = useRef<AbortController | null>(null);
  const preloadRequestIdRef = useRef(0);
  const currentRepeatRef = useRef(0);
  const fallbackTriedRef = useRef<Set<string>>(new Set());
  const actionsRef = useRef<{
    playNext: (key: string, usePreloaded?: boolean) => void;
    playPrevious: (key: string) => void;
    handleAyahEnd: (key: string) => void;
  }>({
    playNext: () => {},
    playPrevious: () => {},
    handleAyahEnd: () => {},
  });

  useEffect(() => {
    // Initialize audio object once
    if (!audioRef.current) {
      const g: any = globalThis as any;
      if (g.__SPEECHHELP_AUDIO__) {
        audioRef.current = g.__SPEECHHELP_AUDIO__ as HTMLAudioElement;
      } else {
        audioRef.current = new Audio();
        audioRef.current.preload = 'auto';
        audioRef.current.crossOrigin = 'anonymous';
        // @ts-expect-error playsInline exists in browsers
        audioRef.current.playsInline = true;
        audioRef.current.autoplay = true;
        g.__SPEECHHELP_AUDIO__ = audioRef.current;
      }
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ''; // Release memory
      }
      preloadControllerRef.current?.abort();
      if (nextPreloadRef.current) URL.revokeObjectURL(nextPreloadRef.current.blobUrl);
      if (lastUsedBlobUrlRef.current) URL.revokeObjectURL(lastUsedBlobUrlRef.current);
    };
  }, []);

  // Helper to get index
  const getAyahIndex = useCallback((key: string) => ayahs.findIndex(a => a.verse_key === key), [ayahs]);

  // Preload next ayah
  useEffect(() => {
    if (!playingAyahKey || !isPlaying) return;

    const idx = getAyahIndex(playingAyahKey);
    if (idx === -1 || idx === ayahs.length - 1) return;

    const nextAyah = ayahs[idx + 1];
    if (!nextAyah?.audio.url) return;

    // Check if range ended
    if (range && playingAyahKey === range.end) return;

    const nextUrl = nextAyah.audio.url.startsWith('http') 
      ? nextAyah.audio.url 
      : `https://verses.quran.com/${nextAyah.audio.url}`;

    preloadControllerRef.current?.abort();
    const controller = new AbortController();
    preloadControllerRef.current = controller;
    const requestId = ++preloadRequestIdRef.current;

    fetch(nextUrl, { signal: controller.signal })
      .then(res => res.blob())
      .then(blob => {
        if (controller.signal.aborted) return;
        if (requestId !== preloadRequestIdRef.current) return;
        const blobUrl = URL.createObjectURL(blob);
        if (nextPreloadRef.current) URL.revokeObjectURL(nextPreloadRef.current.blobUrl);
        nextPreloadRef.current = { verseKey: nextAyah.verse_key, blobUrl };
      })
      .catch(err => {
        if (err?.name === 'AbortError') return;
        console.error("Preload error", err);
      });
      
  }, [playingAyahKey, ayahs, range, isPlaying, getAyahIndex]);

  const play = useCallback((verseKey: string, usePreloaded = false) => {
    const audio = audioRef.current;
    if (!audio) return;

    // If clicking the same ayah that is already playing
    if (playingAyahKey === verseKey) {
      if (audio.paused) {
        audio.play().catch(e => console.error("Resume error", e));
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
      return;
    }

    preloadControllerRef.current?.abort();
    preloadControllerRef.current = null;
    preloadRequestIdRef.current += 1;
    if (nextPreloadRef.current) {
      const isMatchingPreload = usePreloaded && nextPreloadRef.current.verseKey === verseKey;
      if (!isMatchingPreload) {
        URL.revokeObjectURL(nextPreloadRef.current.blobUrl);
        nextPreloadRef.current = null;
      }
    }
    if (lastUsedBlobUrlRef.current) {
      URL.revokeObjectURL(lastUsedBlobUrlRef.current);
      lastUsedBlobUrlRef.current = null;
    }

    // New track setup
    const ayah = ayahs.find(a => a.verse_key === verseKey);
    if (!ayah || !ayah.audio.url) return;

    let audioUrl = ayah.audio.url.startsWith('http') 
      ? ayah.audio.url 
      : `https://verses.quran.com/${ayah.audio.url}`;

    // Use preloaded blob if available and matching
    if (usePreloaded && nextPreloadRef.current?.verseKey === verseKey) {
      audioUrl = nextPreloadRef.current.blobUrl;
      lastUsedBlobUrlRef.current = nextPreloadRef.current.blobUrl;
      nextPreloadRef.current = null;
    }

    // Update audio source
    audio.src = audioUrl;
    audio.playbackRate = settings.playbackSpeed;
    
    // Reset repeat counter for new track
    currentRepeatRef.current = 0;
    fallbackTriedRef.current.delete(verseKey);
    
    setPlayingAyahKey(verseKey);
    setIsPlaying(true);

    // Setup Media Session
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Ayah ${verseKey}`,
        artist: 'Quran Recitation',
        album: 'SpeechHelp',
        artwork: [
            { src: '/globe.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audio.play();
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audio.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
          actionsRef.current.playPrevious(verseKey);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
          // Force skip repeat logic on manual next
          currentRepeatRef.current = settings.repeatCount; 
          actionsRef.current.playNext(verseKey);
      });
      
      // Keep audio session active for mobile/background
      try {
        // @ts-expect-error - audioTracks is non-standard but supported in some browsers
        if (audio.audioTracks) {
             // @ts-expect-error - audioTracks is non-standard
             audio.audioTracks.addEventListener('change', () => {
                 // Keep alive
             });
        }
      } catch {}
    }

    audio.play().catch(e => console.error("Play error", e));

    // Event handlers
    audio.onended = () => {
      actionsRef.current.handleAyahEnd(verseKey);
    };
    audio.onerror = () => {
      const ayah = ayahs.find(a => a.verse_key === verseKey);
      const backup = ayah?.audio?.backupUrl;
      if (backup && !fallbackTriedRef.current.has(verseKey)) {
        fallbackTriedRef.current.add(verseKey);
        audio.src = backup;
        audio.play().catch(e => console.error("Play error", e));
        return;
      }
      actionsRef.current.handleAyahEnd(verseKey);
    };
    let nearTriggered = false;
    audio.ontimeupdate = () => {
      if (!audio.duration || Number.isNaN(audio.duration)) return;
      const remaining = audio.duration - audio.currentTime;
      if (!nearTriggered && remaining <= 0.2) {
        nearTriggered = true;
        setTimeout(() => {
          if (!audio.paused && audio.currentTime >= (audio.duration || 0) - 0.15) {
            actionsRef.current.handleAyahEnd(verseKey);
          }
          nearTriggered = false;
        }, 1200);
      }
    };

    // Update play state on actual events (in case of buffering/errors)
    audio.onplay = () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'playing'; } catch {}
      }
    };
    audio.onpause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'paused'; } catch {}
      }
    };

  }, [ayahs, playingAyahKey, settings]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    preloadControllerRef.current?.abort();
    preloadControllerRef.current = null;
    preloadRequestIdRef.current += 1;
    if (nextPreloadRef.current) {
      URL.revokeObjectURL(nextPreloadRef.current.blobUrl);
      nextPreloadRef.current = null;
    }
  }, []);

  const handleAyahEnd = useCallback((currentKey: string) => {
    currentRepeatRef.current += 1;

    // Check repeat count
    if (settings.repeatCount !== Infinity && currentRepeatRef.current < settings.repeatCount) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error("Replay error", e));
      }
      return;
    }

    // Custom handler: if it returns false, stop here (don't play next)
    if (onAyahEnd) {
        const shouldContinue = onAyahEnd(currentKey);
        if (shouldContinue === false) return;
    }

    // Finished repeats, move to next
    actionsRef.current.playNext(currentKey, false);
  }, [settings.repeatCount, onAyahEnd]);

  const playNext = useCallback((currentKey: string | null = playingAyahKey, usePreloaded = false) => {
    const key = currentKey || playingAyahKey;
    if (!key) return;

    // Check range end
    if (range && key === range.end) {
      setPlayingAyahKey(null);
      setIsPlaying(false);
      return;
    }

    const idx = getAyahIndex(key);
    if (idx === -1 || idx === ayahs.length - 1) {
      setPlayingAyahKey(null);
      setIsPlaying(false);
      return;
    }

    const nextAyah = ayahs[idx + 1];
    play(nextAyah.verse_key, usePreloaded);
  }, [playingAyahKey, range, ayahs, getAyahIndex, play]);

  const playPrevious = useCallback((currentKey: string | null = playingAyahKey) => {
      const key = currentKey || playingAyahKey;
      if (!key) return;

      // Check range start
      if (range && key === range.start) return;

      const idx = getAyahIndex(key);
      if (idx <= 0) return;

      const prevAyah = ayahs[idx - 1];
      play(prevAyah.verse_key);
  }, [playingAyahKey, range, ayahs, getAyahIndex, play]);

  // Auto-scroll effect
  useEffect(() => {
    if (playingAyahKey && settings.autoScroll) {
      const element = document.getElementById(`verse-${playingAyahKey}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [playingAyahKey, settings.autoScroll]);

  // Handle playback speed changes dynamically
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.playbackRate = settings.playbackSpeed;
    }
  }, [settings.playbackSpeed]);

  useEffect(() => {
    actionsRef.current = { playNext, playPrevious, handleAyahEnd };
  }, [playNext, playPrevious, handleAyahEnd]);

  return {
    playingAyahKey,
    isPlaying,
    play,
    pause,
    playNext,
    playPrevious,
    settings,
    setSettings,
  };
}
