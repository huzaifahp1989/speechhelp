'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  BookOpen,
  ChevronLeft,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  Trash2,
} from 'lucide-react';
import { RECITERS, type Reciter } from '@/data/reciters';
import { surahs } from '@/data/surahs';
import { getAllJuzBoundaries, getJuzBoundary, isVerseInRange } from '@/lib/juzBoundaries';
import { buildEveryAyahAudioUrl, fetchReciterAudioByChapters } from '@/lib/quranAudioUrls';
import { startBackgroundAudio, stopBackgroundAudio } from '@/lib/backgroundAudio';
import KidsZonePanel from '@/components/kids/KidsZonePanel';
import QuranListeningActivityTracker from '@/components/kids/QuranListeningActivityTracker';

type ListenMode = 'surah' | 'juz' | 'quran';

type Moshaf = {
  id: number;
  name: string;
  server: string;
  surah_list: string;
};

type CatalogReciter = {
  id: number;
  name: string;
  moshaf: Moshaf[];
};

type Track = {
  title: string;
  url: string;
  verseKey?: string;
  surahId?: number;
};

type Selection = {
  mode: ListenMode;
  surahId: number;
  juzId: number;
  reciterId: number;
  moshafId: number;
};

type Checkpoint = Selection & {
  trackIndex: number;
  currentTime: number;
  savedAt: number;
};

type SavedRecitation = Selection & {
  id: string;
  name: string;
  savedAt: number;
};

const CHECKPOINT_KEY = 'speechhelp_quran_listen_checkpoint_v1';
const SAVED_KEY = 'speechhelp_quran_listen_saved_v1';
const DEFAULT_JUZ_RECITER_ID = 7;
const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
const juzReciters = [...RECITERS].sort(byName);

function filterByName<T extends { id: number; name: string }>(
  list: T[],
  query: string,
  selectedId: number,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((item) => item.id === selectedId || item.name.toLowerCase().includes(q));
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    return value === null ? fallback : (value as T);
  } catch {
    return fallback;
  }
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getSelectionLabel(selection: Selection, catalog: CatalogReciter[]): string {
  const portion =
    selection.mode === 'quran'
      ? 'Full Quran'
      : selection.mode === 'juz'
        ? `Juz ${selection.juzId}`
        : surahs.find((surah) => surah.id === selection.surahId)?.name_simple ?? 'Surah';
  const reciter =
    selection.mode === 'juz'
      ? juzReciters.find((item) => item.id === selection.reciterId)?.name
      : catalog.find((item) => item.id === selection.reciterId)?.name;
  return `${portion}${reciter ? ` · ${reciter}` : ''}`;
}

async function fetchChapterVerseCounts(chapterIds: number[]): Promise<Map<number, number>> {
  const response = await fetch('https://api.quran.com/api/v4/chapters?language=en');
  if (!response.ok) throw new Error('Surah verse counts could not be loaded for Juz playback.');
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== 'object' ||
    !Array.isArray((data as { chapters?: unknown }).chapters)
  ) {
    throw new Error('The Surah verse-count response was not valid.');
  }

  const counts = new Map<number, number>();
  for (const chapter of (data as { chapters: unknown[] }).chapters) {
    if (!chapter || typeof chapter !== 'object') continue;
    const { id, verses_count: versesCount } = chapter as {
      id?: unknown;
      verses_count?: unknown;
    };
    if (typeof id === 'number' && typeof versesCount === 'number') {
      counts.set(id, versesCount);
    }
  }

  if (chapterIds.some((chapterId) => !counts.has(chapterId))) {
    throw new Error('Some Surah verse counts are missing from the chapter response.');
  }
  return counts;
}

export default function QuranListenPage() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playlistRef = useRef<Track[]>([]);
  const checkpointRef = useRef<Checkpoint | null>(null);
  const mediaActionsRef = useRef<{ play: () => void; pause: () => void; next: () => void; previous: () => void }>({
    play: () => {},
    pause: () => {},
    next: () => {},
    previous: () => {},
  });
  const [catalog, setCatalog] = useState<CatalogReciter[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [mode, setMode] = useState<ListenMode>('surah');
  const [surahId, setSurahId] = useState(1);
  const [juzId, setJuzId] = useState(1);
  const [reciterId, setReciterId] = useState(DEFAULT_JUZ_RECITER_ID);
  const [reciterQuery, setReciterQuery] = useState('');
  const [moshafId, setMoshafId] = useState(0);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Elapsed time across the whole playlist (e.g. every ayah in a Juz), so the
  // displayed clock keeps counting up instead of resetting to 0:00 each time
  // playback auto-advances to the next track/ayah.
  const [cumulativeElapsed, setCumulativeElapsed] = useState(0);
  const cumulativeElapsedRef = useRef(0);
  const lastTrackTimeRef = useRef(0);
  const [playbackError, setPlaybackError] = useState('');
  const [savedRecitations, setSavedRecitations] = useState<SavedRecitation[]>([]);
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [search, setSearch] = useState('');
  const [ready, setReady] = useState(false);
  const [savedToPlay, setSavedToPlay] = useState<string | null>(null);
  const [activeChildProfileId, setActiveChildProfileId] = useState<string | null>(null);
  const trackIndexRef = useRef(0);
  const handleChildChange = useCallback((childProfileId: string | null) => {
    setActiveChildProfileId(childProfileId);
  }, []);

  const selectedReciter = useMemo(
    () => catalog.find((item) => item.id === reciterId),
    [catalog, reciterId],
  );
  const visibleJuzReciters = useMemo(
    () => filterByName(juzReciters, reciterQuery, reciterId),
    [reciterQuery, reciterId],
  );
  const visibleCatalog = useMemo(
    () => filterByName(catalog, reciterQuery, reciterId),
    [catalog, reciterQuery, reciterId],
  );
  const selectedMoshaf = selectedReciter?.moshaf.find((item) => item.id === moshafId)
    ?? selectedReciter?.moshaf[0];
  const selectedJuzReciter: Reciter | undefined =
    juzReciters.find((item) => item.id === reciterId) ?? juzReciters[0];

  useEffect(() => {
    let cancelled = false;
    fetch('https://www.mp3quran.net/api/v3/reciters?language=eng')
      .then(async (response) => {
        if (!response.ok) throw new Error('The reciter catalogue could not be loaded.');
        const data: unknown = await response.json();
        if (
          !data ||
          typeof data !== 'object' ||
          !Array.isArray((data as { reciters?: unknown }).reciters)
        ) {
          throw new Error('The reciter catalogue returned an unexpected response.');
        }
        const parsed = (data as { reciters: CatalogReciter[] }).reciters.filter(
          (reciter) =>
            typeof reciter.id === 'number' &&
            typeof reciter.name === 'string' &&
            Array.isArray(reciter.moshaf) &&
            reciter.moshaf.some(
              (moshaf) =>
                typeof moshaf.id === 'number' &&
                typeof moshaf.server === 'string' &&
                typeof moshaf.surah_list === 'string',
            ),
        ).sort(byName);
        if (parsed.length === 0) throw new Error('No reciters were found in the catalogue.');
        if (cancelled) return;
        setCatalog(parsed);
        const savedCheckpoint = readStored<Checkpoint | null>(CHECKPOINT_KEY, null);
        const preferredReciter = savedCheckpoint && savedCheckpoint.mode !== 'juz'
          ? parsed.find((item) => item.id === savedCheckpoint.reciterId)
          : undefined;
        const initialReciter = preferredReciter ?? parsed[0];
        if (!savedCheckpoint) setReciterId(initialReciter.id);
        setMoshafId(
          preferredReciter?.moshaf.find((item) => item.id === savedCheckpoint?.moshafId)?.id
            ?? initialReciter.moshaf[0]?.id
            ?? 0,
        );
        setCatalogError('');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCatalogError(
          error instanceof Error ? error.message : 'Could not load the reciter catalogue.',
        );
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const storedCheckpoint = readStored<Checkpoint | null>(CHECKPOINT_KEY, null);
    const storedSaved = readStored<SavedRecitation[]>(SAVED_KEY, []);
    if (Array.isArray(storedSaved)) setSavedRecitations(storedSaved);
    if (storedCheckpoint && typeof storedCheckpoint.mode === 'string') {
      checkpointRef.current = storedCheckpoint;
      setCheckpoint(storedCheckpoint);
      setMode(storedCheckpoint.mode);
      setSurahId(storedCheckpoint.surahId);
      setJuzId(storedCheckpoint.juzId);
      setReciterId(storedCheckpoint.reciterId);
      setMoshafId(storedCheckpoint.moshafId);
    }
    setReady(true);
  }, []);

  useEffect(() => () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    void stopBackgroundAudio().catch((error: unknown) => {
      console.error('Could not stop background audio after leaving the player.', error);
    });
    if ('mediaSession' in navigator) {
      for (const action of ['play', 'pause', 'nexttrack', 'previoustrack'] as const) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (error) {
          console.error(`Could not clear media-session action "${action}".`, error);
        }
      }
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
  }, []);

  const selection = useMemo<Selection>(
    () => ({ mode, surahId, juzId, reciterId, moshafId }),
    [juzId, mode, moshafId, reciterId, surahId],
  );
  const availableSurahs = selectedMoshaf
    ? new Set(selectedMoshaf.surah_list.split(',').map(Number))
    : new Set<number>();

  const clearPlaylist = useCallback(() => {
    audioRef.current?.pause();
    void stopBackgroundAudio().catch((error: unknown) => {
      console.error('Could not stop native background audio service.', error);
    });
    playlistRef.current = [];
    setTracks([]);
    setTrackIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    cumulativeElapsedRef.current = 0;
    lastTrackTimeRef.current = 0;
    setCumulativeElapsed(0);
  }, []);

  const updateCheckpoint = useCallback((index: number, time: number) => {
    const next: Checkpoint = {
      mode,
      surahId,
      juzId,
      reciterId,
      moshafId,
      trackIndex: index,
      currentTime: time,
      savedAt: Date.now(),
    };
    checkpointRef.current = next;
    setCheckpoint(next);
    try {
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Could not save Quran listening progress.', error);
      setPlaybackError('Listening progress could not be saved on this device.');
    }
  }, [juzId, mode, moshafId, reciterId, surahId]);

  const playTrackAt = useCallback((index: number, list = playlistRef.current, offset = 0) => {
    const track = list[index];
    const audio = audioRef.current;
    if (!track || !audio) return;

    setPlaybackError('');
    setTrackIndex(index);
    setCurrentTime(offset);
    setDuration(0);
    // Each track (ayah/Surah) is its own audio file, so `currentTime` restarts
    // at `offset` here; track that baseline separately from the running
    // cumulative counter so the latter never resets mid-playlist.
    lastTrackTimeRef.current = offset;
    updateCheckpoint(index, offset);
    if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: mode === 'juz'
          ? juzReciters.find((reciter) => reciter.id === reciterId)?.name ?? 'Qur’an recitation'
          : selectedReciter?.name ?? 'Qur’an recitation',
        album: 'SpeechHelp Qur’an Audio',
        artwork: [{ src: '/globe.svg', sizes: '512x512', type: 'image/svg+xml' }],
      });
    }
    trackIndexRef.current = index;
    if (offset <= 0) {
      // Swap the source and play synchronously so the browser keeps the media
      // session alive when the page is hidden or the screen is locked.
      audio.onloadedmetadata = null;
      audio.src = track.url;
      audio.play().then(
        () => setIsPlaying(true),
        (error: unknown) => {
          console.error('Quran audio playback could not start.', error);
          setIsPlaying(false);
          setPlaybackError('Playback could not start. Check your connection and try again.');
        },
      );
      void startBackgroundAudio().catch((error: unknown) => {
        console.error('Could not start native background audio service.', error);
      });
      return;
    }
    audio.pause();
    audio.src = track.url;
    audio.load();
    audio.onloadedmetadata = () => {
      if (offset > 0 && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(offset, Math.max(0, audio.duration - 0.25));
      }
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      void startBackgroundAudio()
        .catch((error: unknown) => {
          console.error('Could not start native background audio service.', error);
        })
        .then(() => audio.play())
        .then(
          () => setIsPlaying(true),
          (error: unknown) => {
            console.error('Quran audio playback could not start.', error);
            setIsPlaying(false);
            setPlaybackError('Playback could not start. Check your connection and try again.');
          },
        );
    };
  }, [mode, reciterId, selectedReciter, updateCheckpoint]);

  const loadTracks = useCallback(async (): Promise<Track[]> => {
    if (mode === 'juz') {
      if (!selectedJuzReciter) {
        throw new Error('Choose a reciter that supports Juz-by-Juz playback.');
      }
      const boundary = getJuzBoundary(juzId);
      if (!boundary) throw new Error(`Juz ${juzId} does not have a valid boundary.`);
      const [startSurah] = boundary.startVerse.split(':').map(Number);
      const [endSurah] = boundary.endVerse.split(':').map(Number);
      const chapterIds = Array.from(
        { length: endSurah - startSurah + 1 },
        (_, index) => startSurah + index,
      );
      let juzAudio: [string, string][];
      if (selectedJuzReciter.source === 'everyayah') {
        const urlPrefix = selectedJuzReciter.urlPrefix;
        if (!urlPrefix) throw new Error('This reciter does not have ayah-by-ayah audio configured.');
        const startAyah = Number(boundary.startVerse.split(':')[1]);
        const endAyah = Number(boundary.endVerse.split(':')[1]);
        const verseCounts = await fetchChapterVerseCounts(chapterIds);
        juzAudio = Array.from({ length: endSurah - startSurah + 1 }, (_, index) => startSurah + index)
          .flatMap((chapterId) => {
            const firstAyah = chapterId === startSurah ? startAyah : 1;
            const lastAyah = chapterId === endSurah ? endAyah : verseCounts.get(chapterId);
            if (!lastAyah) throw new Error(`Verse count for Surah ${chapterId} is unavailable.`);
            return Array.from({ length: lastAyah - firstAyah + 1 }, (_, verseIndex) => {
              const verseKey = `${chapterId}:${firstAyah + verseIndex}`;
              return [verseKey, buildEveryAyahAudioUrl(urlPrefix, verseKey)] as [string, string];
            });
          });
      } else {
        const audioMap = await fetchReciterAudioByChapters(selectedJuzReciter.id, chapterIds);
        juzAudio = Array.from(audioMap.entries())
          .filter(([verseKey]) => isVerseInRange(verseKey, boundary.startVerse, boundary.endVerse))
          .sort(([a], [b]) => {
            const [aSurah, aAyah] = a.split(':').map(Number);
            const [bSurah, bAyah] = b.split(':').map(Number);
            return aSurah - bSurah || aAyah - bAyah;
          });
      }
      if (juzAudio.length === 0) {
        throw new Error(`No ayah audio was found for Juz ${juzId} with this reciter.`);
      }
      return juzAudio.map(([verseKey, url]) => ({
        title: `Juz ${juzId} · Ayah ${verseKey}`,
        verseKey,
        surahId: Number(verseKey.split(':')[0]),
        url,
      }));
    }

    if (!selectedMoshaf) throw new Error('Choose a reciter to begin listening.');
    const supportedIds = new Set(selectedMoshaf.surah_list.split(',').map(Number));
    const startAt = mode === 'quran' ? 1 : surahId;
    const ids = surahs
      .map((surah) => surah.id)
      .filter((id) => id >= startAt && supportedIds.has(id));
    if (ids.length === 0) throw new Error('This recitation has no audio for the selected Surah.');
    return ids.map((id) => {
      const surah = surahs.find((item) => item.id === id)!;
      return {
        title: `${surah.name_simple} · ${surah.name_arabic}`,
        surahId: id,
        url: `${selectedMoshaf.server.replace(/\/?$/, '/')}${String(id).padStart(3, '0')}.mp3`,
      };
    });
  }, [juzId, mode, selectedJuzReciter, selectedMoshaf, surahId]);

  const startListening = useCallback(async (resume = false) => {
    setPlaybackError('');
    setIsPlaying(false);
    cumulativeElapsedRef.current = 0;
    lastTrackTimeRef.current = 0;
    setCumulativeElapsed(0);
    try {
      const list = await loadTracks();
      const saved = resume ? checkpointRef.current : null;
      const index = saved && saved.mode === mode && saved.reciterId === reciterId
        ? Math.min(saved.trackIndex, list.length - 1)
        : 0;
      const offset = saved && index === saved.trackIndex ? saved.currentTime : 0;
      playlistRef.current = list;
      setTracks(list);
      playTrackAt(index, list, offset);
    } catch (error) {
      console.error('Could not prepare Quran playback.', error);
      setPlaybackError(
        error instanceof Error ? error.message : 'Could not prepare this recitation.',
      );
    }
  }, [loadTracks, mode, playTrackAt, reciterId]);

  useEffect(() => {
    if (!savedToPlay) return;
    setSavedToPlay(null);
    void startListening(false);
  }, [savedToPlay, startListening]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      void stopBackgroundAudio().catch((error: unknown) => {
        console.error('Could not stop native background audio service.', error);
      });
      updateCheckpoint(trackIndex, audio.currentTime);
      setIsPlaying(false);
    } else if (audio.src && playlistRef.current.length > 0) {
      void startBackgroundAudio()
        .catch((error: unknown) => {
          console.error('Could not start native background audio service.', error);
        })
        .then(() => audio.play())
        .then(
        () => setIsPlaying(true),
        (error: unknown) => {
          console.error('Quran audio playback could not resume.', error);
          setPlaybackError('Playback could not resume. Check your connection and try again.');
        },
      );
    } else {
      void startListening(Boolean(checkpointRef.current));
    }
  }, [isPlaying, startListening, trackIndex, updateCheckpoint]);

  const changeSelection = useCallback((next: Partial<Selection>) => {
    clearPlaylist();
    const updated = { ...selection, ...next };
    setMode(updated.mode);
    setSurahId(updated.surahId);
    setJuzId(updated.juzId);
    setReciterId(updated.reciterId);
    setMoshafId(updated.moshafId);
    checkpointRef.current = null;
    setCheckpoint(null);
    try {
      localStorage.removeItem(CHECKPOINT_KEY);
    } catch (error) {
      console.error('Could not clear the saved listening position.', error);
    }
  }, [clearPlaylist, selection]);

  const saveRecitation = useCallback(() => {
    const record: SavedRecitation = {
      ...selection,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: getSelectionLabel(selection, catalog),
      savedAt: Date.now(),
    };
    const next = [record, ...savedRecitations];
    setSavedRecitations(next);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Could not save this recitation.', error);
      setPlaybackError('This recitation could not be saved on this device.');
    }
  }, [catalog, savedRecitations, selection]);

  const removeSaved = useCallback((id: string) => {
    const next = savedRecitations.filter((item) => item.id !== id);
    setSavedRecitations(next);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Could not update saved recitations.', error);
      setPlaybackError('Saved recitations could not be updated on this device.');
    }
  }, [savedRecitations]);

  const jumpTo = useCallback((index: number) => {
    if (index < 0 || index >= playlistRef.current.length) return;
    playTrackAt(index);
  }, [playTrackAt]);
  mediaActionsRef.current = {
    play: () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.src && playlistRef.current.length > 0) {
        void startBackgroundAudio()
          .catch((error: unknown) => {
            console.error('Could not start native background audio service.', error);
          })
          .then(() => audio.play())
          .catch((error: unknown) => {
            console.error('Quran audio playback could not resume.', error);
            setPlaybackError('Playback could not resume. Check your connection and try again.');
          });
      } else {
        void startListening(Boolean(checkpointRef.current));
      }
    },
    pause: togglePlayback,
    next: () => jumpTo(trackIndex + 1),
    previous: () => jumpTo(trackIndex - 1),
  };

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const handlers: [MediaSessionAction, () => void][] = [
      ['play', () => mediaActionsRef.current.play()],
      ['pause', () => mediaActionsRef.current.pause()],
      ['nexttrack', () => mediaActionsRef.current.next()],
      ['previoustrack', () => mediaActionsRef.current.previous()],
    ];
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.error(`Could not register media-session action "${action}".`, error);
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (error) {
          console.error(`Could not clear media-session action "${action}".`, error);
        }
      }
    };
  }, []);

  const currentTrack = tracks[trackIndex];
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const filteredSurahs = useMemo(
    () => surahs.filter((surah) =>
      `${surah.id} ${surah.name_simple} ${surah.name_arabic}`.toLowerCase().includes(search.toLowerCase()),
    ),
    [search],
  );
  const savedCheckpointLabel = checkpoint ? getSelectionLabel(checkpoint, catalog) : '';

  return (
    <div className="min-h-screen bg-background pb-28">
      <section className="border-b border-white/10 bg-gradient-to-br from-[#0c2549] via-[#12336b] to-[#17685f] text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <Link href="/quran" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white">
            <ChevronLeft className="h-4 w-4" /> Back to Qur’an
          </Link>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <Headphones className="h-4 w-4" /> Listen & continue anytime
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Qur’an Audio Library</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                Listen to a Surah, continue through the full Qur’an, or play a complete Juz.
                Your listening position is saved on this device.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <div className="text-2xl font-extrabold">{catalogLoading ? '…' : `${catalog.length}+`}</div>
              <div className="text-xs font-medium text-white/70">Surah reciters</div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-3 pt-4 sm:px-6 sm:pt-6">
        <KidsZonePanel mode="quran" onChildChange={handleChildChange} />
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-4 px-3 py-4 sm:gap-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="contents lg:col-start-1 lg:row-start-1 lg:block lg:space-y-6">
          {ready && checkpoint && (
            <section className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Continue listening</p>
                <p className="mt-1 font-bold text-emerald-950">{savedCheckpointLabel}</p>
                <p className="mt-0.5 text-xs text-emerald-800">
                  {checkpoint.mode === 'juz' ? `Juz ${checkpoint.juzId}` : `Surah ${checkpoint.surahId}`}
                  {' · '}{formatTime(checkpoint.currentTime)} saved
                </p>
              </div>
              <button
                type="button"
                onClick={() => void startListening(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
              >
                <Play className="h-4 w-4" /> Resume
              </button>
            </section>
          )}

          <section className="order-1 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Choose your recitation</h2>
                <p className="text-xs text-muted">{catalogLoading ? 'Loading reciters…' : `${catalog.length} reciters for Surah and full-Qur’an listening`}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted">Listening mode</span>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['surah', 'By Surah'],
                    ['juz', 'By Juz'],
                    ['quran', 'Full Qur’an'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        const nextReciterId = value === 'juz'
                          ? DEFAULT_JUZ_RECITER_ID
                          : mode === 'juz'
                            ? catalog[0]?.id
                            : undefined;
                        const nextMoshafId = value !== 'juz' && mode === 'juz'
                          ? catalog[0]?.moshaf[0]?.id
                          : undefined;
                        changeSelection({
                          mode: value,
                          ...(nextReciterId !== undefined ? { reciterId: nextReciterId } : {}),
                          ...(nextMoshafId !== undefined ? { moshafId: nextMoshafId } : {}),
                        });
                      }}
                      className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-bold sm:text-sm ${
                        mode === value
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-background text-foreground hover:border-primary/50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'juz' ? (
                <>
                  <label className="text-xs font-bold text-muted">
                    Juz
                    <select
                      value={juzId}
                      onChange={(event) => {
                        changeSelection({ juzId: Number(event.target.value) });
                        setSavedToPlay('auto');
                      }}
                      className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground"
                    >
                      {getAllJuzBoundaries().map((juz) => (
                        <option key={juz.juz} value={juz.juz}>
                          {juz.label} · {juz.startVerse}–{juz.endVerse}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-muted">
                    Search reciters
                    <input
                      type="search"
                      value={reciterQuery}
                      onChange={(event) => setReciterQuery(event.target.value)}
                      placeholder="Type a reciter name"
                      className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground"
                    />
                  </label>
                  <label className="text-xs font-bold text-muted">
                    Juz reciter ({visibleJuzReciters.length})
                    <select
                      value={reciterId}
                      onChange={(event) => changeSelection({ reciterId: Number(event.target.value) })}
                      className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground"
                    >
                      {visibleJuzReciters.map((reciter) => (
                        <option key={reciter.id} value={reciter.id}>{reciter.name}</option>
                      ))}
                    </select>
                  </label>
                  <p className="sm:col-span-2 -mt-1 text-xs leading-5 text-muted">
                    Juz playback follows the exact ayah boundaries. {juzReciters.length} verified
                    ayah-by-ayah audio profiles are available, including different styles and qualities.
                  </p>
                </>
              ) : (
                <>
                  <label className="text-xs font-bold text-muted">
                    Search reciters
                    <input
                      type="search"
                      value={reciterQuery}
                      onChange={(event) => setReciterQuery(event.target.value)}
                      placeholder="Type a reciter name"
                      className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground"
                    />
                  </label>
                  <label className="text-xs font-bold text-muted">
                    Reciter ({visibleCatalog.length})
                    <select
                      value={reciterId}
                      onChange={(event) => {
                        const nextReciter = catalog.find((item) => item.id === Number(event.target.value));
                        changeSelection({
                          reciterId: Number(event.target.value),
                          moshafId: nextReciter?.moshaf[0]?.id ?? 0,
                        });
                      }}
                      disabled={catalogLoading || catalog.length === 0}
                      className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground disabled:opacity-60"
                    >
                      {visibleCatalog.map((reciter) => (
                        <option key={reciter.id} value={reciter.id}>{reciter.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-muted">
                    Recitation
                    <select
                      value={selectedMoshaf?.id ?? ''}
                      onChange={(event) => changeSelection({ moshafId: Number(event.target.value) })}
                      disabled={!selectedReciter}
                      className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground disabled:opacity-60"
                    >
                      {selectedReciter?.moshaf.map((moshaf) => (
                        <option key={moshaf.id} value={moshaf.id}>{moshaf.name}</option>
                      ))}
                    </select>
                  </label>
                  {mode === 'surah' && (
                    <div className="sm:col-span-2">
                      <label htmlFor="surah-search" className="mb-2 block text-xs font-bold text-muted">
                        Choose a Surah
                      </label>
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <input
                          id="surah-search"
                          type="search"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search Surah name or number"
                          className="min-h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground"
                        />
                      </div>
                      <select
                        value={surahId}
                        onChange={(event) => {
                          changeSelection({ surahId: Number(event.target.value) });
                          if (selectedReciter) setSavedToPlay('auto');
                        }}
                        className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground"
                      >
                        {filteredSurahs.map((surah) => (
                          <option key={surah.id} value={surah.id} disabled={!availableSurahs.has(surah.id)}>
                            {surah.id}. {surah.name_simple} · {surah.name_arabic}
                            {!availableSurahs.has(surah.id) ? ' (not available)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {mode === 'quran' && (
                    <p className="sm:col-span-2 -mt-1 text-xs leading-5 text-muted">
                      Full Qur’an playback starts from Al-Fatiha and automatically continues
                      through each available Surah.
                    </p>
                  )}
                </>
              )}
            </div>

            {catalogError && mode !== 'juz' && (
              <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {catalogError}
              </p>
            )}
            {playbackError && (
              <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {playbackError}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                disabled={(mode !== 'juz' && (catalogLoading || catalog.length === 0)) || (mode === 'juz' && !selectedJuzReciter)}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white shadow-sm hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                {isPlaying ? 'Pause' : tracks.length > 0 ? 'Play' : 'Listen now'}
              </button>
              <button
                type="button"
                onClick={saveRecitation}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold text-foreground hover:bg-background"
              >
                <Bookmark className="h-4 w-4" /> Save recitation
              </button>
            </div>
          </section>

          <section className="order-3 rounded-2xl border border-border bg-surface p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-foreground">Saved recitations</h2>
                <p className="mt-1 text-xs text-muted">Keep your favourite reciter and listening selection close.</p>
              </div>
              <Bookmark className="h-5 w-5 text-primary" />
            </div>
            {savedRecitations.length === 0 ? (
              <p className="rounded-xl bg-background px-4 py-5 text-center text-sm text-muted">
                Save a reciter and Surah or Juz to see it here.
              </p>
            ) : (
              <ul className="space-y-2">
                {savedRecitations.map((saved) => (
                  <li key={saved.id} className="flex items-center gap-2 rounded-xl border border-border p-3">
                    <button
                      type="button"
                      onClick={() => {
                        changeSelection(saved);
                        setSavedToPlay(saved.id);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-bold text-foreground">{saved.name}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {saved.mode === 'juz' ? `Juz ${saved.juzId}` : saved.mode === 'quran' ? 'Full Qur’an' : `Surah ${saved.surahId}`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSaved(saved.id)}
                      className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-700"
                      aria-label={`Remove ${saved.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="order-2 space-y-4 lg:col-start-2 lg:row-start-1">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-bold text-foreground">Your player</h2>
            <p className="mt-1 text-xs text-muted">Playback controls stay ready while you listen.</p>
            <div className="mt-5 rounded-2xl bg-gradient-to-br from-[#102b59] to-[#17685f] p-5 text-white">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Headphones className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold text-white/70">
                {mode === 'juz' ? `Juz ${juzId}` : mode === 'quran' ? 'Full Qur’an' : 'Now selected'}
              </p>
              <h3 className="mt-1 min-h-12 font-bold leading-6">
                {currentTrack?.title ?? getSelectionLabel(selection, catalog)}
              </h3>
              <p className="mt-1 truncate text-xs text-white/70">
                {mode === 'juz'
                  ? selectedJuzReciter?.name
                  : selectedReciter?.name ?? (catalogLoading ? 'Loading reciters…' : 'Select a reciter')}
              </p>

              <label className="mt-5 block">
                <span className="sr-only">Playback position</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 1}
                  step="0.1"
                  value={Math.min(currentTime, duration || currentTime)}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (audioRef.current) audioRef.current.currentTime = value;
                    setCurrentTime(value);
                    updateCheckpoint(trackIndex, value);
                  }}
                  className="w-full accent-white"
                  disabled={!currentTrack}
                />
              </label>
              <div className="-mt-1 flex justify-between text-[11px] text-white/70">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div className="mt-4 flex items-center justify-center gap-5">
                <button
                  type="button"
                  onClick={() => jumpTo(trackIndex - 1)}
                  disabled={tracks.length === 0 || trackIndex <= 0}
                  className="rounded-full p-2 text-white hover:bg-white/15 disabled:opacity-40"
                  aria-label="Previous ayah or Surah"
                  title="Previous ayah or Surah"
                >
                  <SkipBack className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-md hover:bg-blue-50"
                  aria-label={isPlaying ? 'Pause recitation' : 'Play recitation'}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6" />}
                </button>
                <button
                  type="button"
                  onClick={() => jumpTo(trackIndex + 1)}
                  disabled={tracks.length === 0 || trackIndex >= tracks.length - 1}
                  className="rounded-full p-2 text-white hover:bg-white/15 disabled:opacity-40"
                  aria-label="Next ayah or Surah"
                  title="Next ayah or Surah"
                >
                  <SkipForward className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${progress}%` }} />
              </div>
              {tracks.length > 0 && (
                <p className="mt-2 text-center text-[11px] text-white/65">
                  Track {trackIndex + 1} of {tracks.length}
                </p>
              )}
              {tracks.length > 1 && (
                <p className="mt-0.5 text-center text-[11px] text-white/65">
                  Total listened: {formatTime(cumulativeElapsed)}
                </p>
              )}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-background p-3 text-xs leading-5 text-muted">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Pause at any time. Your Surah/Juz, reciter, track and position are saved automatically.
            </div>
          </section>
        </aside>
      </div>

      <audio
        ref={audioRef}
        preload="none"
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          setCurrentTime(audio.currentTime);
          if (Number.isFinite(audio.duration)) setDuration(audio.duration);
          if (playlistRef.current.length > 0) updateCheckpoint(trackIndex, audio.currentTime);
          // Accumulate real playback progress across the whole playlist. Skip
          // negative/large jumps, which happen when a new track starts (its
          // currentTime resets below the previous track's), so the running
          // total keeps counting up instead of resetting per ayah/track.
          const delta = audio.currentTime - lastTrackTimeRef.current;
          lastTrackTimeRef.current = audio.currentTime;
          if (delta > 0 && delta < 2) {
            cumulativeElapsedRef.current += delta;
            setCumulativeElapsed(cumulativeElapsedRef.current);
          }
        }}
        onPause={() => {
          setIsPlaying(false);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        }}
        onPlay={() => {
          setIsPlaying(true);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }}
        onEnded={() => {
          const nextIndex = trackIndexRef.current + 1;
          if (nextIndex < playlistRef.current.length) playTrackAt(nextIndex);
          else {
            setIsPlaying(false);
            updateCheckpoint(trackIndexRef.current, 0);
            void stopBackgroundAudio().catch((error: unknown) => {
              console.error('Could not stop native background audio service.', error);
            });
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
          }
        }}
        onError={() => {
          if (!audioRef.current?.src) return;
          setIsPlaying(false);
          setPlaybackError('This audio track could not be loaded. Try another recitation or check your connection.');
          void stopBackgroundAudio().catch((error: unknown) => {
            console.error('Could not stop native background audio service.', error);
          });
        }}
      />
      <QuranListeningActivityTracker
        audioRef={audioRef}
        childProfileId={activeChildProfileId}
        mode={mode}
        surahNumber={currentTrack?.surahId ?? (mode === 'surah' ? surahId : null)}
        juzNumber={mode === 'juz' ? juzId : null}
        ayahStart={currentTrack?.verseKey ? Number(currentTrack.verseKey.split(':')[1]) : null}
        ayahEnd={currentTrack?.verseKey ? Number(currentTrack.verseKey.split(':')[1]) : null}
        reciterId={String(mode === 'juz' ? selectedJuzReciter?.id ?? reciterId : reciterId)}
        reciterName={mode === 'juz' ? selectedJuzReciter?.name ?? '' : selectedReciter?.name ?? ''}
        trackIdentity={mode === 'juz'
          ? `juz:${juzId}`
          : `${mode}:${trackIndex}:${currentTrack?.title ?? 'idle'}`}
        completeJuzOnEnded={mode === 'juz' && currentTrack?.verseKey === getJuzBoundary(juzId)?.endVerse}
      />
      <div className="sr-only" aria-live="polite">
        {currentTrack ? `Now playing ${currentTrack.title}` : 'No audio playing'}
      </div>
    </div>
  );
}
