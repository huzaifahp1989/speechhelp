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
      className="w-full text-left p-3 hover:bg-emerald-50 active:bg-emerald-100 transition-colors touch-manipulation"
    >
      <span className="inline-block text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md mb-1">
        {hit.verse_key}
      </span>
      <p className="font-arabic text-right text-base sm:text-lg text-slate-800 leading-[1.85] break-words whitespace-normal" dir="rtl">
        {hit.arabic}
      </p>
      {hit.english && (
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">{hit.english}</p>
      )}
      {hit.urdu && (
        <p className="text-xs sm:text-sm text-slate-700 font-indopak text-right mt-0.5 leading-relaxed" dir="rtl">
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
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<JuzAyahSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceLang, setVoiceLang] = useState<'ar-SA' | 'en-US'>('ar-SA');

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

  if (!expanded) {
    return (
      <div className={clsx('w-full min-w-0', className)}>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/60 transition-colors touch-manipulation min-h-[44px] min-w-0"
          aria-label={`Search ayahs in Juz ${juzId}`}
          aria-expanded={false}
        >
          <Search className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="text-sm font-medium text-slate-700 truncate">Search this juz</span>
          <ChevronDown className="w-4 h-4 shrink-0 ml-auto text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div className={clsx('w-full min-w-0', className)}>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[11px] sm:text-xs text-slate-500 flex-1 min-w-0 leading-snug">
            Arabic, English, Urdu, or reference (2:255)
          </p>
          <button
            type="button"
            onClick={minimize}
            className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors touch-manipulation"
            aria-label="Minimize search"
            title="Minimize"
          >
            <ChevronUp className="w-4 h-4" />
            <span className="hidden sm:inline">Minimize</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <button
            type="button"
            onClick={() => setVoiceLang('ar-SA')}
            className={clsx(
              'text-xs font-semibold px-2 py-2 rounded-full border transition-colors touch-manipulation min-h-[40px]',
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
              'text-xs font-semibold px-2 py-2 rounded-full border transition-colors touch-manipulation min-h-[40px]',
              voiceLang === 'en-US'
                ? 'bg-blue-100 border-blue-300 text-blue-800'
                : 'bg-white border-slate-200 text-slate-500'
            )}
          >
            Voice: English
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
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
              className="w-full min-w-0 px-3 py-2.5 pr-10 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-base min-h-[44px]"
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
                  'flex-1 sm:flex-none flex h-11 min-h-[44px] sm:w-11 items-center justify-center gap-1.5 rounded-xl border transition-colors touch-manipulation',
                  isListening
                    ? 'bg-red-500 border-red-500 text-white animate-pulse'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                )}
                aria-label={isListening ? 'Stop listening' : 'Voice search'}
              >
                <Mic className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium sm:hidden">Voice</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => runSearch(query, hits.length === 1)}
              disabled={loading || !query.trim()}
              className="flex-1 sm:flex-none flex h-11 min-h-[44px] sm:w-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 touch-manipulation"
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

        {hits.length > 0 && (
          <ul className="mt-2 rounded-lg border border-slate-100 divide-y divide-slate-100">
            <li className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Juz {juzId} · {langLabel} · {hits.length} match{hits.length === 1 ? '' : 'es'}
            </li>
            {hits.map((hit) => (
              <li key={hit.verse_key}>
                <HitListItem hit={hit} onSelect={selectHit} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
