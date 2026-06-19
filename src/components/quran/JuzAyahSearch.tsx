'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Mic, Search, X } from 'lucide-react';
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
};

export default function JuzAyahSearch({ ayahs, juzId, onAyahFound, className = '' }: Props) {
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
          onAyahFound(merged[0].verse_key, true);
          setQuery('');
          setHits([]);
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

  const { isListening, isSupported, toggleListening } = useVoiceSearch({
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
  };

  const langHint = detectSearchLanguage(query);

  return (
    <div className={clsx('relative w-full', className)}>
      <p className="text-xs text-slate-500 mb-2">
        Search this juz by reciting an ayah or typing Arabic, English, or Urdu (e.g. 2:255, نور, light)
      </p>

      <div className="flex gap-1.5 mb-2">
        <button
          type="button"
          onClick={() => setVoiceLang('ar-SA')}
          className={clsx(
            'text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors',
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
            'text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors',
            voiceLang === 'en-US'
              ? 'bg-blue-100 border-blue-300 text-blue-800'
              : 'bg-white border-slate-200 text-slate-500'
          )}
        >
          Voice: English
        </button>
      </div>

      <div className="relative flex gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hits.length > 0) {
                selectHit(hits[0].verse_key);
              }
            }}
            placeholder="Search or recite…"
            className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-base shadow-sm"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isSupported && (
          <button
            type="button"
            onClick={toggleListening}
            className={clsx(
              'shrink-0 flex h-11 w-11 items-center justify-center rounded-xl border transition-colors touch-manipulation',
              isListening
                ? 'bg-red-500 border-red-500 text-white animate-pulse'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            )}
            aria-label={isListening ? 'Stop listening' : 'Voice search'}
            title={isListening ? 'Listening…' : 'Recite to find ayah'}
          >
            <Mic className="w-5 h-5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => runSearch(query, hits.length === 1)}
          disabled={loading || !query.trim()}
          className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          aria-label="Search"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        </button>
      </div>

      {isListening && (
        <p className="mt-2 text-xs font-medium text-red-600">Listening — recite an ayah from this juz…</p>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {hits.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-2 z-50 max-h-[50vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
          <li className="px-3 py-2 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500 sticky top-0">
            In Juz {juzId} · {langHint === 'ar' ? 'Arabic' : langHint === 'ur' ? 'Urdu' : 'English'} match
          </li>
          {hits.map((hit) => (
            <li key={hit.verse_key}>
              <button
                type="button"
                onClick={() => selectHit(hit.verse_key)}
                className="w-full text-left p-3 hover:bg-emerald-50 transition-colors touch-manipulation"
              >
                <span className="inline-block text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md mb-1">
                  {hit.verse_key}
                </span>
                <p className="font-arabic text-right text-lg text-slate-800 leading-relaxed" dir="rtl">
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
