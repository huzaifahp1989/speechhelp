'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Mic, Search, X } from 'lucide-react';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import {
  detectSearchLanguage,
  matchJuzAyahByVoice,
  mergeJuzSearchHits,
  searchJuzAyahsApi,
  searchJuzAyahsLocal,
  type JuzAyahSearchHit,
} from '@/lib/juzAyahSearch';
import type { AyahWithWords } from '@/types/quranWord';
import MobileBottomSheet from '@/components/ui/MobileBottomSheet';
import clsx from 'clsx';

type Props = {
  ayahs: AyahWithWords[];
  juzId: string;
  onAyahFound: (verseKey: string, shouldPlay?: boolean) => void;
  className?: string;
  /** When false, search starts minimized until the user expands it. */
  defaultExpanded?: boolean;
};

function HitListItem({
  hit,
  onSelect,
}: {
  hit: JuzAyahSearchHit;
  onSelect: (verseKey: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(hit.verse_key)}
      className="w-full text-left p-3 sm:p-3 hover:bg-emerald-50 active:bg-emerald-100 transition-colors touch-manipulation"
    >
      <span className="inline-block text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md mb-1">
        {hit.verse_key}
      </span>
      <p className="font-arabic text-right text-base sm:text-lg text-slate-800 leading-relaxed" dir="rtl">
        {hit.arabic}
      </p>
      {hit.english && (
        <p className="text-xs text-slate-600 line-clamp-2 mt-1">{hit.english}</p>
      )}
      {hit.urdu && (
        <p className="text-xs text-slate-700 font-indopak text-right line-clamp-2 mt-0.5" dir="rtl">
          {hit.urdu}
        </p>
      )}
    </button>
  );
}

export default function JuzAyahSearch({
  ayahs,
  juzId,
  onAyahFound,
  className = '',
  defaultExpanded = true,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [isMobile, setIsMobile] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<JuzAyahSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceLang, setVoiceLang] = useState<'ar-SA' | 'en-US'>('ar-SA');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const runSearch = useCallback(
    async (text: string, autoNavigate = false) => {
      const q = text.trim();
      if (!q || ayahs.length === 0) {
        setHits([]);
        return;
      }

      setError(null);
      setLoading(true);

      try {
        const voiceKey = matchJuzAyahByVoice(ayahs, q);
        if (voiceKey && autoNavigate) {
          onAyahFound(voiceKey, true);
          setQuery('');
          setHits([]);
          setExpanded(false);
          return;
        }

        const local = searchJuzAyahsLocal(ayahs, q);
        let api: JuzAyahSearchHit[] = [];
        if (q.length >= 2) {
          api = await searchJuzAyahsApi(ayahs, q);
        }
        const merged = mergeJuzSearchHits(local, api);
        setHits(merged);

        if (autoNavigate && merged.length > 0) {
          const top = merged[0];
          const confident =
            top.score >= 0.55 || (merged.length === 1 && top.score >= 0.48);
          if (confident) {
            onAyahFound(top.verse_key, true);
            setQuery('');
            setHits([]);
            setExpanded(false);
          } else {
            setHits(merged);
            setError('Multiple possible matches — tap the correct ayah below.');
          }
        } else if (autoNavigate && merged.length === 0) {
          setError(`No ayah in Juz ${juzId} matched. Try English, Urdu, or Arabic words.`);
        }
      } catch {
        setError('Search failed. Check your connection.');
      } finally {
        setLoading(false);
      }
    },
    [ayahs, juzId, onAyahFound]
  );

  const { isListening, isSupported, toggleListening, stopListening } = useVoiceSearch({
    lang: voiceLang,
    onStart: () => {
      setError(null);
      setHits([]);
    },
    onResult: (text, isFinal) => {
      setQuery(text);
      if (isFinal) runSearch(text, true);
    },
    onError: (msg) => setError(msg),
  });

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void runSearch(q, false);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [query, runSearch]);

  const selectHit = (verseKey: string) => {
    onAyahFound(verseKey, true);
    setQuery('');
    setHits([]);
    setExpanded(false);
  };

  const langHint = detectSearchLanguage(query);
  const langLabel = langHint === 'ar' ? 'Arabic' : langHint === 'ur' ? 'Urdu' : 'English';

  const minimize = () => {
    if (isListening) void stopListening();
    setQuery('');
    setHits([]);
    setError(null);
    setExpanded(false);
  };

  const clearResults = () => {
    setHits([]);
    setError(null);
  };

  if (!expanded) {
    return (
      <div className={clsx('w-full min-w-0', className)}>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:gap-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/60 transition-colors touch-manipulation min-h-[44px]"
          aria-label={`Search ayahs in Juz ${juzId}`}
          aria-expanded={false}
        >
          <Search className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="text-sm font-medium text-slate-700 truncate">Search this juz</span>
          <span className="text-xs text-slate-400 hidden min-[400px]:inline truncate">
            Arabic · English · Urdu
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 ml-auto text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div className={clsx('relative w-full min-w-0', className)}>
      <div className="flex items-start gap-1.5 sm:gap-2 mb-2">
        <p className="text-[11px] sm:text-xs text-slate-500 flex-1 min-w-0 leading-snug">
          <span className="md:hidden">Search by reference (2:255), Arabic, English, or Urdu.</span>
          <span className="hidden md:inline">
            Search this juz by reciting an ayah or typing Arabic, English, or Urdu (e.g. 2:255, نور, light)
          </span>
        </p>
        <button
          type="button"
          onClick={minimize}
          className="shrink-0 flex items-center justify-center gap-1 min-h-[36px] min-w-[36px] sm:min-w-0 px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors touch-manipulation"
          aria-label="Minimize search"
          title="Minimize search"
        >
          <ChevronUp className="w-4 h-4" />
          <span className="hidden sm:inline">Minimize</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-2 sm:flex sm:gap-1.5">
        <button
          type="button"
          onClick={() => setVoiceLang('ar-SA')}
          className={clsx(
            'text-xs font-semibold px-2 py-2 sm:px-2.5 sm:py-1 rounded-full border transition-colors touch-manipulation min-h-[40px] sm:min-h-0',
            voiceLang === 'ar-SA'
              ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
              : 'bg-white border-slate-200 text-slate-500'
          )}
        >
          Voice: Arabic
        </button>
        <button
          type="button"
          onClick={() => setVoiceLang('en-US')}
          className={clsx(
            'text-xs font-semibold px-2 py-2 sm:px-2.5 sm:py-1 rounded-full border transition-colors touch-manipulation min-h-[40px] sm:min-h-0',
            voiceLang === 'en-US'
              ? 'bg-blue-100 border-blue-300 text-blue-800'
              : 'bg-white border-slate-200 text-slate-500'
          )}
        >
          Voice: English
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hits.length > 0) {
                selectHit(hits[0].verse_key);
              }
            }}
            placeholder="Search or recite…"
            className="w-full px-3 sm:px-4 py-2.5 pr-10 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-base shadow-sm min-h-[44px]"
            dir="auto"
            aria-label="Search ayahs in this juz"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setHits([]);
                setError(null);
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 touch-manipulation"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 sm:shrink-0">
          {isSupported && (
            <button
              type="button"
              onClick={toggleListening}
              className={clsx(
                'flex-1 sm:flex-none flex h-11 min-h-[44px] sm:w-11 items-center justify-center gap-2 sm:gap-0 rounded-xl border transition-colors touch-manipulation',
                isListening
                  ? 'bg-red-500 border-red-500 text-white animate-pulse'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              )}
              aria-label={isListening ? 'Stop listening' : 'Voice search'}
              title={isListening ? 'Listening…' : 'Recite to find ayah'}
            >
              <Mic className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium sm:hidden">Voice</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => runSearch(query, hits.length === 1)}
            disabled={loading || !query.trim()}
            className="flex-1 sm:flex-none flex h-11 min-h-[44px] sm:w-11 items-center justify-center gap-2 sm:gap-0 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 touch-manipulation"
            aria-label="Search"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium sm:hidden">Search</span>
          </button>
        </div>
      </div>

      {isListening && (
        <p className="mt-2 text-xs font-medium text-red-600">Listening — recite an ayah from this juz…</p>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg leading-relaxed">{error}</p>
      )}

      {/* Desktop: inline dropdown */}
      {hits.length > 0 && (
        <ul className="hidden md:block absolute left-0 right-0 top-full mt-2 z-50 max-h-[50vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
          <li className="px-3 py-2 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500 sticky top-0">
            In Juz {juzId} · {langLabel} match
          </li>
          {hits.map((hit) => (
            <li key={hit.verse_key}>
              <HitListItem hit={hit} onSelect={selectHit} />
            </li>
          ))}
        </ul>
      )}

      {/* Mobile: bottom sheet so results are not clipped by sticky header */}
      {isMobile && (
        <MobileBottomSheet
          open={hits.length > 0}
          onClose={clearResults}
          title={`Juz ${juzId} · ${langLabel}`}
        >
          <p className="text-xs text-slate-500 mb-3">
            {hits.length} match{hits.length === 1 ? '' : 'es'} in this juz
          </p>
          <ul className="divide-y divide-slate-100 -mx-4">
            {hits.map((hit) => (
              <li key={hit.verse_key}>
                <HitListItem hit={hit} onSelect={selectHit} />
              </li>
            ))}
          </ul>
        </MobileBottomSheet>
      )}
    </div>
  );
}
