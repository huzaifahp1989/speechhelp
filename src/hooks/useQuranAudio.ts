import { useState, useEffect, useRef, useCallback } from 'react';

type Ayah = {
  verse_key: string;
  audio: { url: string };
  text_uthmani?: string; // For MediaSession metadata
};

type AudioSettings = {
  repeatCount: number; // 1 = play once (default), 3, 5, Infinity
  autoScroll: boolean;
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
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentRepeatRef = useRef(0);

  // Helper to get index
  const getAyahIndex = (key: string) => ayahs.findIndex(a => a.verse_key === key);

  const play = useCallback((verseKey: string) => {
    // If clicking the same ayah that is already playing
    if (playingAyahKey === verseKey && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(e => console.error("Resume error", e));
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    // Stop previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const ayah = ayahs.find(a => a.verse_key === verseKey);
    if (!ayah || !ayah.audio.url) return;

    const audioUrl = ayah.audio.url.startsWith('http') 
      ? ayah.audio.url 
      : `https://verses.quran.com/${ayah.audio.url}`;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
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
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
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
    playNext(currentKey);
  };

  const playNext = (currentKey: string) => {
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
    play(nextAyah.verse_key);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return {
    playingAyahKey,
    isPlaying,
    play,
    pause,
    settings,
    setSettings,
  };
}
