import { useState, useEffect, useRef, useCallback } from 'react';

type Ayah = {
  verse_key: string;
  audio: { url: string };
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
};

export function useQuranAudio({ ayahs, range }: UseQuranAudioProps) {
  const [playingAyahKey, setPlayingAyahKey] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [settings, setSettings] = useState<AudioSettings>({
    repeatCount: 1,
    autoScroll: true,
    playbackSpeed: 1,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioBlobUrlRef = useRef<string | null>(null);
  const currentRepeatRef = useRef(0);

  useEffect(() => {
    // Initialize audio object once
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ''; // Release memory
      }
      if (nextAudioBlobUrlRef.current) {
        URL.revokeObjectURL(nextAudioBlobUrlRef.current);
      }
    };
  }, []);

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

    // Clean up previous blob
    if (nextAudioBlobUrlRef.current) {
        URL.revokeObjectURL(nextAudioBlobUrlRef.current);
        nextAudioBlobUrlRef.current = null;
    }

    // Fetch and create blob
    fetch(nextUrl)
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        nextAudioBlobUrlRef.current = blobUrl;
      })
      .catch(err => console.error("Preload error", err));
      
  }, [playingAyahKey, ayahs, range, isPlaying]);

  // Helper to get index
  const getAyahIndex = (key: string) => ayahs.findIndex(a => a.verse_key === key);

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

    // New track setup
    const ayah = ayahs.find(a => a.verse_key === verseKey);
    if (!ayah || !ayah.audio.url) return;

    let audioUrl = ayah.audio.url.startsWith('http') 
      ? ayah.audio.url 
      : `https://verses.quran.com/${ayah.audio.url}`;

    // Use preloaded blob if available and matching
    if (usePreloaded && nextAudioBlobUrlRef.current) {
       audioUrl = nextAudioBlobUrlRef.current;
       // Clear ref so we don't reuse it inappropriately
       nextAudioBlobUrlRef.current = null;
    }

    // Update audio source
    audio.src = audioUrl;
    audio.playbackRate = settings.playbackSpeed;
    
    // Reset repeat counter for new track
    currentRepeatRef.current = 0;
    
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
          playPrevious(verseKey);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
          // Force skip repeat logic on manual next
          currentRepeatRef.current = settings.repeatCount; 
          playNext(verseKey);
      });
    }

    audio.play().catch(e => console.error("Play error", e));

    // Event handlers
    audio.onended = () => {
      handleAyahEnd(verseKey);
    };

    // Update play state on actual events (in case of buffering/errors)
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);

  }, [ayahs, playingAyahKey, settings]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleAyahEnd = (currentKey: string) => {
    currentRepeatRef.current += 1;

    // Check repeat count
    if (settings.repeatCount !== Infinity && currentRepeatRef.current < settings.repeatCount) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error("Replay error", e));
      }
      return;
    }

    // Finished repeats, move to next
    playNext(currentKey, true); // Pass true to use preloaded
  };

  const playNext = (currentKey: string, usePreloaded = false) => {
    // Check range end
    if (range && currentKey === range.end) {
      setPlayingAyahKey(null);
      setIsPlaying(false);
      return;
    }

    const idx = getAyahIndex(currentKey);
    if (idx === -1 || idx === ayahs.length - 1) {
      setPlayingAyahKey(null);
      setIsPlaying(false);
      return;
    }

    const nextAyah = ayahs[idx + 1];
    play(nextAyah.verse_key, usePreloaded);
  };

  const playPrevious = (currentKey: string) => {
      // Check range start
      if (range && currentKey === range.start) return;

      const idx = getAyahIndex(currentKey);
      if (idx <= 0) return;

      const prevAyah = ayahs[idx - 1];
      play(prevAyah.verse_key);
  };

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

  return {
    playingAyahKey,
    isPlaying,
    play,
    pause,
    settings,
    setSettings,
  };
}
