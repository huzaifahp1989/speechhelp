'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Headphones, Loader2, Pause, Play, Search } from 'lucide-react';
import { RECITERS, getReciterById } from '@/data/reciters';
import {
  getReciterPreviewUrl,
  getStoredReciterId,
  storeReciterId,
} from '@/lib/reciterAudio';
import clsx from 'clsx';

type Props = {
  lastReadSurahId?: number | null;
  lastJuz?: number | null;
};

export default function ReciterBrowser({ lastReadSurahId, lastJuz }: Props) {
  const [query, setQuery] = useState('');
  const [preferredId, setPreferredId] = useState(7);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [errorId, setErrorId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setPreferredId(getStoredReciterId());
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RECITERS;
    return RECITERS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.shortName?.toLowerCase().includes(q) ||
        String(r.id) === q
    );
  }, [query]);

  const stopPreview = useCallback(() => {
    audioRef.current?.pause();
    setPlayingId(null);
    setLoadingId(null);
  }, []);

  const selectReciter = useCallback((reciterId: number) => {
    setPreferredId(reciterId);
    storeReciterId(reciterId);
    setErrorId(null);
  }, []);

  const togglePreview = useCallback(
    async (reciterId: number) => {
      if (playingId === reciterId) {
        stopPreview();
        return;
      }

      stopPreview();
      setLoadingId(reciterId);
      setErrorId(null);

      const url = await getReciterPreviewUrl(reciterId);
      if (!url) {
        setLoadingId(null);
        setErrorId(reciterId);
        return;
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        setPlayingId(null);
        setLoadingId(null);
        setErrorId(reciterId);
      };

      try {
        await audio.play();
        setPlayingId(reciterId);
        setPreferredId(reciterId);
        storeReciterId(reciterId);
      } catch {
        setErrorId(reciterId);
      } finally {
        setLoadingId(null);
      }
    },
    [playingId, stopPreview]
  );

  const readHref = (reciterId: number) => {
    const base = lastReadSurahId
      ? `/quran/${lastReadSurahId}`
      : lastJuz
        ? `/quran/juz/${lastJuz}`
        : '/quran/1';
    return `${base}?reciter=${reciterId}`;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Headphones className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-foreground">Listen on the Quran page</h2>
            <p className="text-sm text-muted mt-1">
              Tap a reciter to select, or ▶ to preview Al-Fatiha (1:1). Your choice is saved for Juz and Surah reading.
            </p>
            {preferredId && (
              <p className="text-xs text-primary font-semibold mt-2">
                Selected: {getReciterById(preferredId)?.name}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reciters…"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {filtered.map((reciter) => {
          const isPlaying = playingId === reciter.id;
          const isLoading = loadingId === reciter.id;
          const isPreferred = preferredId === reciter.id;
          const failed = errorId === reciter.id;

          return (
            <article
              key={reciter.id}
              className={clsx(
                'flex items-center gap-2 p-3 rounded-xl border bg-surface transition-colors',
                isPlaying ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/40'
              )}
            >
              <button
                type="button"
                onClick={() => togglePreview(reciter.id)}
                disabled={isLoading}
                className={clsx(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
                  isPlaying
                    ? 'bg-primary text-white'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                )}
                aria-label={isPlaying ? `Pause ${reciter.name}` : `Preview ${reciter.name}`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => selectReciter(reciter.id)}
                className="min-w-0 flex-1 text-left touch-manipulation rounded-lg -my-1 py-1 hover:bg-primary/5"
              >
                <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
                  {reciter.shortName || reciter.name}
                  {isPreferred && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </p>
                <p className="text-[11px] text-muted truncate">{reciter.name}</p>
                {failed && (
                  <p className="text-[10px] text-red-500 mt-0.5">Preview unavailable — tap name to select anyway</p>
                )}
              </button>

              <Link
                href={readHref(reciter.id)}
                onClick={() => {
                  selectReciter(reciter.id);
                  stopPreview();
                }}
                className="shrink-0 min-h-[36px] px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-primary hover:bg-primary/10 border border-primary/20"
              >
                Open
              </Link>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-12 text-muted">No reciters match your search.</p>
      )}
    </div>
  );
}
