'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LoaderCircle,
  Pause,
  Play,
  Repeat,
  Search,
  Volume2,
} from 'lucide-react';
import HifzPlayer from '@/components/hifz/HifzPlayer';
import RecitationPracticePanel from '@/components/quran/RecitationPracticePanel';
import { useQuranAudio } from '@/hooks/useQuranAudio';
import { useQuranWordAudio } from '@/hooks/useQuranWordAudio';
import { useRecitationCheck } from '@/hooks/useRecitationCheck';
import { RECITERS } from '@/data/reciters';
import { getDefaultHifzReciterId, setDefaultHifzReciterId } from '@/lib/hifzReciters';
import { getJuzBoundary } from '@/lib/juzBoundaries';
import { recordHifzSession } from '@/lib/hifzSessions';
import { isAyahMemorized, recordAyahRecall, toggleAyahMemorized } from '@/lib/hifzRangeProgress';

type MushafWord = {
  id: number | null;
  location: string | null;
  verseKey: string | null;
  position: number | null;
  kind: 'word' | 'end' | 'marker';
  text: string;
};

type MushafLine = {
  lineNumber: number;
  lineType: 'surah_name' | 'bismillah' | 'ayah';
  centered: boolean;
  surahNumber: number | null;
  words: MushafWord[];
  text: string;
};

type MushafPageData = {
  pageNumber: number;
  totalPages: number;
  lines: MushafLine[];
  verseKeys: string[];
  firstVerse: string | null;
  lastVerse: string | null;
  surahNumber: number | null;
  surahNameEn: string | null;
  surahNameAr: string | null;
  juzNumber: number | null;
  hizbNumber: number | null;
  source: string;
  sourceUrl: string;
};

type MushafAyah = {
  id: number;
  verse_key: string;
  text_uthmani: string;
  audio: { url: string };
  translations?: { text: string }[];
};

type Chapter = { id: number; name_simple: string; name_arabic: string; verses_count: number };
type RepeatScope = 'ayah' | 'line' | 'lines' | 'page' | 'pages' | 'range';
type HiddenScope = 'ayah' | 'line' | 'page';

const TOTAL_PAGES = 849;
const SAVED_PAGE_KEY = 'islam_media_indopak_13_last_page';
const PAGE_CACHE = new Map<number, MushafPageData>();
const PAGE_REQUESTS = new Map<number, Promise<MushafPageData>>();
const REPEAT_COUNTS = [1, 2, 3, 5, 10, 20, Infinity] as const;

function readSavedPage(): number {
  if (typeof window === 'undefined') return 1;
  const value = Number(localStorage.getItem(SAVED_PAGE_KEY));
  return Number.isInteger(value) && value >= 1 && value <= TOTAL_PAGES ? value : 1;
}

function compareVerseKeys(a: string, b: string): number {
  const [aSurah, aAyah] = a.split(':').map(Number);
  const [bSurah, bAyah] = b.split(':').map(Number);
  return aSurah - bSurah || aAyah - bAyah;
}

function groupWordsByAyah(words: MushafWord[]) {
  const groups: { key: string; verseKey: string | null; words: MushafWord[] }[] = [];
  words.forEach((word, index) => {
    const previous = groups[groups.length - 1];
    if (word.verseKey && previous?.verseKey === word.verseKey) {
      previous.words.push(word);
    } else {
      groups.push({ key: `${word.verseKey ?? 'unkeyed'}-${index}`, verseKey: word.verseKey, words: [word] });
    }
  });
  return groups;
}

function cachePage(page: number, data: MushafPageData): void {
  PAGE_CACHE.delete(page);
  PAGE_CACHE.set(page, data);
  while (PAGE_CACHE.size > 6) PAGE_CACHE.delete(PAGE_CACHE.keys().next().value as number);
}

async function fetchMushafPage(page: number, signal?: AbortSignal): Promise<MushafPageData> {
  const cached = PAGE_CACHE.get(page);
  if (cached) return cached;
  const pending = PAGE_REQUESTS.get(page);
  if (pending) return pending;

  const request = fetch(`/api/mushaf-13/page/${page}`, { signal })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load Mushaf page.');
      const result = data as MushafPageData;
      cachePage(page, result);
      return result;
    })
    .finally(() => PAGE_REQUESTS.delete(page));

  PAGE_REQUESTS.set(page, request);
  return request;
}

export default function Mushaf13Reader() {
  const [pageNumber, setPageNumber] = useState(1);
  const [initialized, setInitialized] = useState(false);
  const [pageData, setPageData] = useState<MushafPageData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [ayahs, setAyahs] = useState<MushafAyah[]>([]);
  const [reciterId, setReciterId] = useState(getDefaultHifzReciterId);
  const [repeatCount, setRepeatCount] = useState<number>(1);
  const [repeatScope, setRepeatScope] = useState<RepeatScope>('ayah');
  const [selectedLineStart, setSelectedLineStart] = useState(1);
  const [selectedLineEnd, setSelectedLineEnd] = useState(13);
  const [selectedPageStart, setSelectedPageStart] = useState(1);
  const [selectedPageEnd, setSelectedPageEnd] = useState(1);
  const [selectedPageVerseKeys, setSelectedPageVerseKeys] = useState<string[]>([]);
  const [sectionRepeat, setSectionRepeat] = useState<number>(1);
  const [sectionIteration, setSectionIteration] = useState(1);
  const [isTestMode, setIsTestMode] = useState(false);
  const [hiddenScope, setHiddenScope] = useState<HiddenScope>('ayah');
  const [hiddenVerseKeys, setHiddenVerseKeys] = useState<string[]>([]);
  const [hiddenLineNumbers, setHiddenLineNumbers] = useState<number[]>([]);
  const [pageHidden, setPageHidden] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [surahJump, setSurahJump] = useState('');
  const [juzJump, setJuzJump] = useState('');
  const [pageJump, setPageJump] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ verseKey: string; text: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sessionSetupOpen, setSessionSetupOpen] = useState(false);
  const [sessionSurah, setSessionSurah] = useState(1);
  const [sessionStartAyah, setSessionStartAyah] = useState(1);
  const [sessionEndAyah, setSessionEndAyah] = useState(5);
  const [sessionRepeatCount, setSessionRepeatCount] = useState<number>(10);
  const [sessionRangeId, setSessionRangeId] = useState<string | null>(null);
  const [sessionStartKey, setSessionStartKey] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionVerseKeys, setSessionVerseKeys] = useState<string[]>([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const repeatIterationRef = useRef(1);
  const repeatStartRef = useRef<(verseKey: string) => void>(() => {});
  const pauseRef = useRef<() => void>(() => {});
  const finishHifzSessionRef = useRef<() => void>(() => {});
  const sessionStartedAt = useRef(Date.now());

  const { playWord } = useQuranWordAudio(reciterId);
  const recitation = useRecitationCheck({ playWord });
  const playbackVerseKeys = useMemo(
    () => sessionActive && sessionVerseKeys.length > 0
      ? sessionVerseKeys
      : repeatScope === 'pages' && selectedPageVerseKeys.length > 0
        ? selectedPageVerseKeys
        : pageData?.verseKeys ?? [],
    [sessionActive, sessionVerseKeys, repeatScope, selectedPageVerseKeys, pageData],
  );

  useEffect(() => {
    if (repeatScope !== 'pages') return;
    let cancelled = false;
    const start = Math.max(1, Math.min(TOTAL_PAGES, Math.min(selectedPageStart, selectedPageEnd)));
    const end = Math.max(start, Math.min(TOTAL_PAGES, Math.max(selectedPageStart, selectedPageEnd)));
    const pageNumbers = Array.from({ length: end - start + 1 }, (_, index) => start + index);
    const loadSelectedPages = async () => {
      try {
        const pages: MushafPageData[] = [];
        for (let index = 0; index < pageNumbers.length; index += 6) {
          pages.push(...await Promise.all(pageNumbers.slice(index, index + 6).map((page) => fetchMushafPage(page))));
        }
        if (!cancelled) setSelectedPageVerseKeys(Array.from(new Set(pages.flatMap((page) => page.verseKeys))).sort(compareVerseKeys));
      } catch {
        if (!cancelled) setSelectedPageVerseKeys([]);
      }
    };
    void loadSelectedPages();
    return () => { cancelled = true; };
  }, [repeatScope, selectedPageStart, selectedPageEnd]);

  useEffect(() => {
    setPageNumber(readSavedPage());
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;
    const controller = new AbortController();
    setPageLoading(true);
    setPageError(null);
    setAyahs([]);

    void fetchMushafPage(pageNumber, controller.signal)
      .then((data) => {
        if (cancelled) return;
        setPageData(data);
        setPageLoading(false);
        localStorage.setItem(SAVED_PAGE_KEY, String(pageNumber));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPageError(error instanceof Error ? error.message : 'Could not load this Mushaf page.');
        setPageLoading(false);
      });

    if (pageNumber < TOTAL_PAGES) void fetchMushafPage(pageNumber + 1).catch(() => {});
    if (pageNumber > 1) void fetchMushafPage(pageNumber - 1).catch(() => {});
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [initialized, pageNumber]);

  useEffect(() => {
    let cancelled = false;
    if (!playbackVerseKeys.length) return;

    const loadAyahs = async () => {
      try {
        const verseKeys = new Set(playbackVerseKeys);
        const chapterIds = Array.from(new Set(playbackVerseKeys.map((key) => Number(key.split(':')[0]))));
        const results = await Promise.all(chapterIds.map(async (chapterId) => {
          const response = await fetch(
            `https://api.quran.com/api/v4/verses/by_chapter/${chapterId}?language=en&words=false&translations=20&fields=text_uthmani&per_page=300`,
          );
          if (!response.ok) throw new Error('Could not load Quran audio mapping.');
          const data = await response.json();
          return (data.verses ?? []).filter((verse: MushafAyah) => verseKeys.has(verse.verse_key));
        }));
        if (!cancelled) {
          const ordered = results.flat().sort((a, b) => compareVerseKeys(a.verse_key, b.verse_key));
          setAyahs(ordered.map((ayah) => ({ ...ayah, audio: { url: '' } })));
        }
      } catch {
        if (!cancelled) setAyahs([]);
      }
    };

    void loadAyahs();
    return () => { cancelled = true; };
  }, [playbackVerseKeys]);

  useEffect(() => {
    let cancelled = false;
    fetch('https://api.quran.com/api/v4/chapters')
      .then((response) => response.json())
      .then((data) => { if (!cancelled) setChapters(data.chapters ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const currentVerseKey = useRef<string | null>(null);
  const activeVerseKey = useRef<string | null>(null);
  const audioRange = useMemo(() => {
    const start = playbackVerseKeys[0];
    const end = playbackVerseKeys.at(-1);
    return start && end ? { start, end } : null;
  }, [playbackVerseKeys]);

  const pageRepeatEnd = audioRange?.end ?? null;
  const scopeKeys = useMemo(() => {
    if (!pageData) return [];
    if (repeatScope === 'range' && sessionActive) return sessionVerseKeys;
    if (repeatScope === 'pages') return selectedPageVerseKeys;
    const active = activeVerseKey.current ?? pageData.firstVerse;
    if (repeatScope === 'page') return pageData.verseKeys;
    if (repeatScope === 'line' || repeatScope === 'lines') {
      const lineNumbers = repeatScope === 'line'
        ? [pageData.lines.find((line) => line.words.some((word) => word.verseKey === active))?.lineNumber ?? 0]
        : Array.from({ length: selectedLineEnd - selectedLineStart + 1 }, (_, index) => selectedLineStart + index);
      const lineWords = pageData.lines
        .filter((line) => lineNumbers.includes(line.lineNumber))
        .flatMap((line) => line.words);
      return lineWords.map((word) => word.verseKey)
        .filter((key): key is string => Boolean(key))
        .filter((key, index, values) => values.indexOf(key) === index);
    }
    return active ? [active] : [];
  }, [pageData, repeatScope, currentVerseKey.current, sessionActive, sessionVerseKeys, selectedPageVerseKeys, selectedLineStart, selectedLineEnd]);

  const scopeStart = scopeKeys[0];
  const scopeEnd = scopeKeys.at(-1);

  const handleScopeEnd = useCallback((verseKey: string) => {
    if (repeatScope === 'ayah' || !scopeEnd || !scopeStart || verseKey !== scopeEnd) return;
    const nextIteration = repeatIterationRef.current + 1;
    if (sectionRepeat === Infinity || nextIteration <= sectionRepeat) {
      repeatIterationRef.current = nextIteration;
      setSectionIteration(nextIteration);
      repeatStartRef.current(scopeStart);
      return false;
    }
    if (sessionActive && repeatScope === 'range') {
      setTimeout(() => finishHifzSessionRef.current(), 0);
      return false;
    }
    setTimeout(() => pauseRef.current(), 0);
    return false;
  }, [repeatScope, scopeEnd, scopeStart, sectionRepeat, sessionActive]);

  const {
    playingAyahKey,
    isPlaying,
    repeatIteration,
    play,
    pause,
    playNext,
    playPrevious,
    settings,
    setSettings,
  } = useQuranAudio({
    ayahs,
    reciterId,
    range: audioRange,
    onAyahEnd: repeatScope === 'ayah' ? undefined : handleScopeEnd,
  });

  repeatStartRef.current = (verseKey) => { void play(verseKey); };
  pauseRef.current = pause;
  currentVerseKey.current = playingAyahKey;
  activeVerseKey.current = playingAyahKey ?? pageData?.firstVerse ?? null;

  useEffect(() => {
    if (!sessionStartKey || !ayahs.some((ayah) => ayah.verse_key === sessionStartKey)) return;
    setSessionStartKey(null);
    void play(sessionStartKey);
  }, [sessionStartKey, ayahs, play]);

  const finishHifzSession = () => {
    if (!sessionActive) return;
    pause();
    setSessionActive(false);
    setSessionComplete(true);
    const firstKey = sessionVerseKeys[0];
    const lastKey = sessionVerseKeys.at(-1);
    void recordHifzSession({
      session_type: 'recited',
      minutes: Math.max(1, Math.ceil((Date.now() - sessionStartedAt.current) / 60_000)),
      ayat_count: sessionVerseKeys.length,
      coverage_text: `${firstKey}–${lastKey} · Mushaf pages`,
      notes: '13-Line Indo-Pak Mushaf Hifz session',
    });
  };
  finishHifzSessionRef.current = finishHifzSession;

  const rateCompletedSession = (rating: 'easy' | 'good' | 'needed_help' | 'difficult') => {
    if (sessionRangeId) {
      for (const verseKey of sessionVerseKeys) recordAyahRecall(sessionRangeId, verseKey, rating);
    }
    setSessionComplete(false);
  };

  const markSessionMemorized = () => {
    if (sessionRangeId) {
      for (const verseKey of sessionVerseKeys) {
        if (!isAyahMemorized(sessionRangeId, verseKey)) toggleAyahMemorized(sessionRangeId, verseKey);
      }
    }
    setSessionComplete(false);
  };

  useEffect(() => {
    if ((!sessionActive && repeatScope !== 'pages') || !playingAyahKey || pageData?.verseKeys.includes(playingAyahKey)) return;
    let cancelled = false;
    void findPageForVerse(playingAyahKey).then((nextPage) => {
      if (!cancelled && nextPage && nextPage !== pageNumber) goToPage(nextPage);
    });
    return () => { cancelled = true; };
  }, [sessionActive, repeatScope, playingAyahKey, pageData, pageNumber]);

  const goToPage = (nextPage: number) => {
    setPageNumber(Math.max(1, Math.min(TOTAL_PAGES, Math.trunc(nextPage) || 1)));
    setHiddenVerseKeys([]);
    setHiddenLineNumbers([]);
    setPageHidden(false);
    if (!sessionActive) {
      setSectionIteration(1);
      repeatIterationRef.current = 1;
    }
  };

  const selectRepeatCount = (value: string) => {
    const count = value === 'continuous' ? Infinity : Number(value);
    setRepeatCount(count);
    setSectionRepeat(count);
    repeatIterationRef.current = 1;
    setSectionIteration(1);
    setSettings((current) => ({ ...current, repeatCount: repeatScope === 'ayah' ? count : 1 }));
  };

  const selectRepeatScope = (scope: RepeatScope) => {
    setRepeatScope(scope);
    repeatIterationRef.current = 1;
    setSectionIteration(1);
    if (scope === 'lines') {
      const activeLine = pageData?.lines.find((line) => line.words.some((word) => word.verseKey === playingAyahKey))?.lineNumber ?? 1;
      setSelectedLineStart(activeLine);
      setSelectedLineEnd(activeLine);
    }
    if (scope === 'pages') {
      setSelectedPageStart(pageNumber);
      setSelectedPageEnd(pageNumber);
    }
    setSettings((current) => ({ ...current, repeatCount: scope === 'ayah' ? repeatCount : 1 }));
  };

  const findPageForVerse = useCallback(async (verseKey: string): Promise<number | null> => {
    let low = 1;
    let high = TOTAL_PAGES;
    let found: number | null = null;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candidate = await fetchMushafPage(mid);
      if (candidate.firstVerse && compareVerseKeys(verseKey, candidate.firstVerse) < 0) {
        high = mid - 1;
      } else if (candidate.lastVerse && compareVerseKeys(verseKey, candidate.lastVerse) > 0) {
        low = mid + 1;
      } else {
        found = mid;
        high = mid - 1;
      }
    }
    return found;
  }, []);

  const startHifzSession = async () => {
    const chapter = chapters.find((item) => item.id === sessionSurah);
    if (!chapter || sessionStartAyah < 1 || sessionEndAyah < sessionStartAyah || sessionEndAyah > chapter.verses_count) {
      setSessionError(`Choose ayahs between 1 and ${chapter?.verses_count ?? 'the end of the Surah'}.`);
      return;
    }

    setSessionLoading(true);
    setSessionError(null);
    try {
      const startKey = `${sessionSurah}:${sessionStartAyah}`;
      const endKey = `${sessionSurah}:${sessionEndAyah}`;
      const [firstPage, lastPage] = await Promise.all([findPageForVerse(startKey), findPageForVerse(endKey)]);
      if (!firstPage || !lastPage || lastPage < firstPage) throw new Error('Could not map the selected ayahs to Mushaf pages.');

      const pageNumbers = Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index);
      const pageDataList: MushafPageData[] = [];
      for (let index = 0; index < pageNumbers.length; index += 6) {
        const batch = pageNumbers.slice(index, index + 6);
        pageDataList.push(...await Promise.all(batch.map((page) => fetchMushafPage(page))));
      }

      const selectedKeys = Array.from(new Set(pageDataList.flatMap((item) => item.verseKeys)))
        .filter((key) => compareVerseKeys(key, startKey) >= 0 && compareVerseKeys(key, endKey) <= 0)
        .sort(compareVerseKeys);
      const expectedCount = sessionEndAyah - sessionStartAyah + 1;
      if (selectedKeys.length !== expectedCount) throw new Error('The selected page mapping was incomplete. Please retry.');

      const id = `mushaf13-${sessionSurah}-${sessionStartAyah}-${sessionEndAyah}`;
      const sessionRange = {
        id,
        juz: pageDataList[0]?.juzNumber ?? 1,
        surah: { id: sessionSurah, name_simple: chapter.name_simple, verses_count: chapter.verses_count },
        startAyah: sessionStartAyah,
        endAyah: sessionEndAyah,
        createdAt: Date.now(),
        label: '13-Line Mushaf Hifz session',
      };
      const savedRanges: unknown = JSON.parse(localStorage.getItem('hifz_ranges') || '[]');
      const ranges = Array.isArray(savedRanges) ? savedRanges.filter((item: { id?: string }) => item.id !== id) : [];
      localStorage.setItem('hifz_ranges', JSON.stringify([sessionRange, ...ranges]));
      window.dispatchEvent(new Event('hifz-range-progress-updated'));

      setSessionRangeId(id);
      setSessionVerseKeys(selectedKeys);
      setSessionStartKey(selectedKeys[0]);
      setSessionActive(true);
      setSessionComplete(false);
      setRepeatScope('range');
      setRepeatCount(1);
      setSectionRepeat(sessionRepeatCount);
      setSectionIteration(1);
      repeatIterationRef.current = 1;
      setSettings((current) => ({ ...current, repeatCount: 1 }));
      sessionStartedAt.current = Date.now();
      goToPage(firstPage);
      setSessionSetupOpen(false);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : 'Could not start the Hifz session.');
    } finally {
      setSessionLoading(false);
    }
  };

  const jumpToVerse = async (verseKey: string) => {
    const nextPage = await findPageForVerse(verseKey);
    if (nextPage) goToPage(nextPage);
  };

  const jumpToSurah = (surahNumber: number) => {
    if (Number.isInteger(surahNumber) && surahNumber >= 1 && surahNumber <= 114) {
      void jumpToVerse(`${surahNumber}:1`);
    }
  };

  const jumpToJuz = (juzNumber: number) => {
    const boundary = getJuzBoundary(juzNumber);
    if (boundary) void jumpToVerse(boundary.startVerse);
  };

  const jumpToHizb = async (hizbNumber: number) => {
    if (!Number.isInteger(hizbNumber) || hizbNumber < 1 || hizbNumber > 60) return;
    try {
      const response = await fetch(`https://api.quran.com/api/v4/verses/by_hizb/${hizbNumber}?words=false&per_page=1`);
      if (!response.ok) throw new Error('Could not load Hizb boundary.');
      const data = await response.json();
      const verseKey = data.verses?.[0]?.verse_key;
      if (verseKey) await jumpToVerse(verseKey);
    } catch {
      setPageError('Could not locate that Hizb. Please retry.');
    }
  };

  const runSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const response = await fetch(`https://api.quran.com/api/v4/search?q=${encodeURIComponent(query)}&size=10&language=en`);
      if (!response.ok) throw new Error('Search is unavailable right now.');
      const data = await response.json();
      const results = (data.search?.results ?? []).map((result: { verse_key?: string; text?: string }) => ({
        verseKey: result.verse_key ?? '',
        text: (result.text ?? '').replace(/<[^>]+>/g, '').trim(),
      })).filter((result: { verseKey: string }) => result.verseKey);
      setSearchResults(results);
      if (results.length === 0) setSearchError('No matching ayahs were found.');
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed. Please retry.');
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleHiddenCurrent = () => {
    const verseKey = playingAyahKey ?? pageData?.firstVerse;
    if (!verseKey || !pageData) return;
    setIsTestMode(true);
    if (hiddenScope === 'page') {
      setPageHidden((hidden) => !hidden);
    } else if (hiddenScope === 'line') {
      const line = pageData.lines.find((item) => item.words.some((word) => word.verseKey === verseKey));
      if (line) setHiddenLineNumbers((current) => current.includes(line.lineNumber)
        ? current.filter((number) => number !== line.lineNumber)
        : [...current, line.lineNumber]);
    } else {
      setHiddenVerseKeys((current) => current.includes(verseKey)
        ? current.filter((key) => key !== verseKey)
        : [...current, verseKey]);
    }
  };

  const currentLineNumber = pageData?.lines.find((line) => line.words.some((word) => word.verseKey === playingAyahKey))?.lineNumber;

  return (
    <main className="min-h-screen bg-[#e6eef7] px-3 pb-10 pt-4 sm:px-5 sm:pt-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/quran" aria-label="Back to current Quran reader" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 text-blue-900 hover:bg-blue-50">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold text-blue-950 sm:text-xl">13-Line Indo-Pak Mushaf</h1>
              <p className="text-xs text-slate-600">Qudratullah edition · Quranic Universal Library</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-blue-50 p-1 text-xs font-bold">
            <span className="rounded-md bg-blue-900 px-3 py-2 text-white">13-Line Indo-Pak</span>
            <button type="button" onClick={() => sessionActive ? finishHifzSession() : setSessionSetupOpen((open) => !open)} className={`rounded-md px-3 py-2 ${sessionActive ? 'bg-red-700 text-white' : 'text-blue-900 hover:bg-white'}`}>
              {sessionActive ? 'Stop Hifz Session' : 'Start Hifz Session'}
            </button>
            <Link href="/quran" className="rounded-md px-3 py-2 text-blue-900 hover:bg-white">Current reader</Link>
          </div>
        </header>

        {sessionSetupOpen && (
          <section className="rounded-xl border border-blue-200 bg-white p-3 shadow-sm sm:p-4">
            <h2 className="text-base font-extrabold text-blue-950">Start Hifz Session</h2>
            <p className="mt-1 text-xs text-slate-600">Select a verified Quran range. The Mushaf page will follow the playing ayah.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="space-y-1 text-xs font-bold text-slate-600">Surah
                <select value={sessionSurah} onChange={(event) => { setSessionSurah(Number(event.target.value)); setSessionStartAyah(1); setSessionEndAyah(5); setSessionError(null); }} className="block min-h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm font-normal text-slate-800">
                  {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.id}. {chapter.name_simple}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">Starting ayah
                <input type="number" min={1} max={chapters.find((chapter) => chapter.id === sessionSurah)?.verses_count ?? 300} value={sessionStartAyah} onChange={(event) => setSessionStartAyah(Number(event.target.value))} className="block min-h-10 w-full rounded-lg border border-blue-200 px-3 text-sm font-normal text-slate-800" />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">Ending ayah
                <input type="number" min={sessionStartAyah} max={chapters.find((chapter) => chapter.id === sessionSurah)?.verses_count ?? 300} value={sessionEndAyah} onChange={(event) => setSessionEndAyah(Number(event.target.value))} className="block min-h-10 w-full rounded-lg border border-blue-200 px-3 text-sm font-normal text-slate-800" />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">Range repeats
                <select value={sessionRepeatCount === Infinity ? 'continuous' : sessionRepeatCount} onChange={(event) => setSessionRepeatCount(event.target.value === 'continuous' ? Infinity : Number(event.target.value))} className="block min-h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm font-normal text-slate-800">
                  {[1, 2, 3, 5, 10, 20].map((count) => <option key={count} value={count}>{count}x</option>)}
                  <option value="continuous">Unlimited</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">Reciter
                <select value={reciterId} onChange={(event) => { const id = Number(event.target.value); setReciterId(id); setDefaultHifzReciterId(id); }} className="block min-h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm font-normal text-slate-800">
                  {RECITERS.map((reciter) => <option key={reciter.id} value={reciter.id}>{reciter.name}</option>)}
                </select>
              </label>
            </div>
            {sessionError && <p role="alert" className="mt-3 text-sm text-red-700">{sessionError}</p>}
            <button type="button" disabled={sessionLoading || chapters.length === 0} onClick={() => void startHifzSession()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-900 px-4 text-sm font-bold text-white disabled:opacity-50">
              {sessionLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}{sessionLoading ? 'Preparing Mushaf pages…' : 'Start selected Hifz range'}
            </button>
          </section>
        )}

        {sessionActive && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-950">
            <span className="font-semibold">Hifz session · {sessionVerseKeys[0]}–{sessionVerseKeys.at(-1)} · range repeat {sectionIteration}/{sectionRepeat === Infinity ? '∞' : sectionRepeat}</span>
            <button type="button" onClick={finishHifzSession} className="min-h-9 rounded-md border border-blue-300 px-3 text-xs font-bold">Stop session</button>
          </div>
        )}

        <section className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-blue-200 bg-white p-3 shadow-sm sm:grid-cols-2 sm:p-4 xl:grid-cols-[minmax(14rem,2fr)_repeat(4,minmax(8rem,1fr))] xl:items-end">
          <form onSubmit={(event) => { event.preventDefault(); void runSearch(); }} className="min-w-0 w-full space-y-1 sm:col-span-2 xl:col-span-1">
            <label htmlFor="mushaf-search" className="text-xs font-bold text-slate-600">Search Quran</label>
            <div className="flex gap-2">
              <input id="mushaf-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-lg border border-blue-200 px-3 text-sm" placeholder="Search ayahs" />
              <button type="submit" disabled={searchLoading} className="flex min-h-10 items-center gap-1 rounded-lg bg-blue-900 px-3 text-sm font-bold text-white disabled:opacity-50">
                {searchLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
              </button>
            </div>
          </form>
          <form onSubmit={(event) => { event.preventDefault(); goToPage(Number(pageJump)); }} className="min-w-0 w-full space-y-1">
            <label htmlFor="mushaf-page-jump" className="text-xs font-bold text-slate-600">Jump to page</label>
            <div className="flex gap-2">
              <input id="mushaf-page-jump" type="number" min={1} max={TOTAL_PAGES} value={pageJump} onChange={(event) => setPageJump(event.target.value)} placeholder="1–849" className="min-h-10 min-w-0 w-full rounded-lg border border-blue-200 px-3 text-sm" />
              <button className="min-h-10 rounded-lg border border-blue-200 px-3 text-sm font-bold text-blue-950 hover:bg-blue-50">Go</button>
            </div>
          </form>
          <label className="min-w-0 w-full space-y-1 text-xs font-bold text-slate-600">
            Jump to Surah
            <select defaultValue="" onChange={(event) => { if (event.target.value) jumpToSurah(Number(event.target.value)); }} className="block min-h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm font-normal text-slate-800">
              <option value="" disabled>Select Surah</option>
              {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.id}. {chapter.name_simple}</option>)}
            </select>
          </label>
          <label className="min-w-0 w-full space-y-1 text-xs font-bold text-slate-600">
            Jump to Juz
            <select defaultValue="" onChange={(event) => { if (event.target.value) jumpToJuz(Number(event.target.value)); }} className="block min-h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm font-normal text-slate-800">
              <option value="" disabled>Select Juz</option>
              {Array.from({ length: 30 }, (_, index) => index + 1).map((juz) => <option key={juz} value={juz}>Juz {juz}</option>)}
            </select>
          </label>
          <label className="min-w-0 w-full space-y-1 text-xs font-bold text-slate-600">
            Jump to Hizb
            <select defaultValue="" onChange={(event) => { if (event.target.value) void jumpToHizb(Number(event.target.value)); }} className="block min-h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm font-normal text-slate-800">
              <option value="" disabled>Select Hizb</option>
              {Array.from({ length: 60 }, (_, index) => index + 1).map((hizb) => <option key={hizb} value={hizb}>Hizb {hizb}</option>)}
            </select>
          </label>
          {(searchResults.length > 0 || searchError) && (
            <div className="col-span-full space-y-1">
              {searchError && <p role="status" className="text-sm text-amber-700">{searchError}</p>}
              {searchResults.map((result) => (
                <button key={result.verseKey} type="button" onClick={() => { void jumpToVerse(result.verseKey); setSearchResults([]); }} className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-blue-50">
                  <span className="mr-2 font-bold text-blue-900">{result.verseKey}</span>{result.text}
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white px-3 py-2.5 shadow-sm">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-blue-950">
              Page {pageNumber} / {TOTAL_PAGES} · {pageData?.surahNameEn ?? 'Loading'}
              {pageData?.surahNameAr ? ` · ${pageData.surahNameAr}` : ''}
            </p>
            <p className="text-xs text-slate-600">Juz {pageData?.juzNumber ?? '—'} · Hizb {pageData?.hizbNumber ?? '—'} · {pageData?.firstVerse ?? ''}–{pageData?.lastVerse ?? ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={pageNumber <= 1} onClick={() => goToPage(pageNumber - 1)} aria-label="Previous Mushaf page" className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 text-blue-950 disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button>
            <span className="min-w-8 text-center text-sm font-bold tabular-nums text-blue-950">{pageNumber}</span>
            <button type="button" disabled={pageNumber >= TOTAL_PAGES} onClick={() => goToPage(pageNumber + 1)} aria-label="Next Mushaf page" className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 text-blue-950 disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="flex justify-center overflow-hidden rounded-xl border border-blue-200 bg-[#d6dfeb] px-2 py-4 shadow-inner sm:px-5 sm:py-6">
          {pageLoading ? (
            <div className="flex min-h-64 items-center gap-3 text-sm font-semibold text-blue-950"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading verified Mushaf page…</div>
          ) : pageError ? (
            <div role="alert" className="space-y-3 py-16 text-center text-sm text-red-700"><p>{pageError}</p><button type="button" onClick={() => goToPage(pageNumber)} className="rounded-lg border border-red-300 px-4 py-2 font-bold">Retry</button></div>
          ) : pageData ? (
            <div
              className="mushaf13-page"
              dir="rtl"
              onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
              onTouchEnd={(event) => {
                if (touchStartX.current === null) return;
                const delta = event.changedTouches[0].clientX - touchStartX.current;
                if (Math.abs(delta) > 55) goToPage(pageNumber + (delta < 0 ? 1 : -1));
                touchStartX.current = null;
              }}
              aria-label={`13-line Indo-Pak Mushaf page ${pageNumber}`}
            >
              {pageData.lines.map((line) => {
                const lineVerseKeys = Array.from(new Set(line.words.map((word) => word.verseKey).filter((key): key is string => Boolean(key))));
                const lineHidden = pageHidden || hiddenLineNumbers.includes(line.lineNumber);
                return (
                  <div key={line.lineNumber} className={`mushaf13-line ${line.centered ? 'mushaf13-line--center' : ''}`} data-line={line.lineNumber}>
                    {line.lineType === 'surah_name' ? (
                      <span className="mushaf13-surah-heading">سُورَةُ {pageData.surahNameAr || ''}</span>
                    ) : lineHidden ? (
                      <button type="button" onClick={() => { setPageHidden(false); setHiddenLineNumbers((lines) => lines.filter((number) => number !== line.lineNumber)); setHiddenVerseKeys((keys) => keys.filter((key) => !lineVerseKeys.includes(key))); }} className="mushaf13-reveal">Reveal</button>
                    ) : line.lineType === 'bismillah' ? (
                      <span className="mushaf13-bismillah">{line.text}</span>
                    ) : (
                      groupWordsByAyah(line.words).map((group) => {
                        const active = Boolean(group.verseKey && group.verseKey === playingAyahKey);
                        return (
                          <span key={group.key} className={`mushaf13-ayah-block ${active ? 'mushaf13-ayah-block--active' : ''}`} style={{ flexGrow: group.words.length }}>
                            {group.words.map((word, index) => {
                              if (!word.text) return null;
                              const isHidden = Boolean(word.verseKey && hiddenVerseKeys.includes(word.verseKey));
                              return (
                                <span key={`${word.location ?? line.lineNumber}-${index}`} className={`mushaf13-word ${word.kind === 'end' ? 'mushaf13-end-marker' : ''}`}>
                                  {isHidden ? (
                                    <button type="button" onClick={() => setHiddenVerseKeys((keys) => keys.filter((key) => key !== word.verseKey))} className="mushaf13-reveal-word">Reveal</button>
                                  ) : (
                                    <button type="button" disabled={!word.verseKey} onClick={() => { if (word.verseKey) { currentVerseKey.current = word.verseKey; void play(word.verseKey); } }} aria-label={word.verseKey ? `Play ayah ${word.verseKey}` : undefined}>
                                      {word.text}
                                    </button>
                                  )}
                                </span>
                              );
                            })}
                          </span>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {isTestMode && <p className="text-center text-sm font-semibold text-blue-950">Hifz test mode · hidden content reveals when tapped</p>}

        <section className="space-y-3 rounded-xl border border-blue-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { if (playingAyahKey && isPlaying) pause(); else void play(playingAyahKey ?? scopeStart ?? pageData?.firstVerse ?? ''); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-900 px-4 text-sm font-bold text-white hover:bg-blue-800">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
            </button>
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-blue-200 px-3 text-xs font-semibold text-slate-700">
              <Repeat className="h-4 w-4 text-blue-900" /> Repeat
              <select value={repeatCount === Infinity ? 'continuous' : repeatCount} onChange={(event) => selectRepeatCount(event.target.value)} className="bg-transparent text-sm font-bold text-blue-950">
                <option value={1}>1x</option><option value={2}>2x</option><option value={3}>3x</option><option value={5}>5x</option><option value={10}>10x</option><option value={20}>20x</option><option value="continuous">Unlimited</option>
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-blue-200 px-3 text-xs font-semibold text-slate-700">Repeat scope
              <select value={repeatScope} onChange={(event) => selectRepeatScope(event.target.value as RepeatScope)} className="bg-transparent text-sm font-bold text-blue-950"><option value="ayah">Current ayah</option><option value="line">Current line</option><option value="lines">Selected lines</option><option value="page">Current page</option><option value="pages">Selected pages</option>{sessionActive && <option value="range">Selected range</option>}</select>
            </label>
            {repeatScope === 'lines' && (
              <div className="flex min-h-11 items-center gap-2 rounded-lg border border-blue-200 px-3 text-xs font-semibold text-slate-700">
                Lines
                <select aria-label="First line to repeat" value={selectedLineStart} onChange={(event) => setSelectedLineStart(Number(event.target.value))} className="bg-transparent text-sm font-bold text-blue-950">
                  {Array.from({ length: 13 }, (_, index) => index + 1).map((line) => <option key={line} value={line}>{line}</option>)}
                </select>
                to
                <select aria-label="Last line to repeat" value={selectedLineEnd} onChange={(event) => setSelectedLineEnd(Number(event.target.value))} className="bg-transparent text-sm font-bold text-blue-950">
                  {Array.from({ length: 13 }, (_, index) => index + 1).map((line) => <option key={line} value={line}>{line}</option>)}
                </select>
              </div>
            )}
            {repeatScope === 'pages' && (
              <div className="flex min-h-11 items-center gap-2 rounded-lg border border-blue-200 px-3 text-xs font-semibold text-slate-700">
                Pages
                <input aria-label="First page to repeat" type="number" min={1} max={TOTAL_PAGES} value={selectedPageStart} onChange={(event) => setSelectedPageStart(Number(event.target.value))} className="w-16 bg-transparent text-sm font-bold text-blue-950" />
                to
                <input aria-label="Last page to repeat" type="number" min={1} max={TOTAL_PAGES} value={selectedPageEnd} onChange={(event) => setSelectedPageEnd(Number(event.target.value))} className="w-16 bg-transparent text-sm font-bold text-blue-950" />
              </div>
            )}
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-blue-200 px-3 text-xs font-semibold text-slate-700">Hide scope
              <select value={hiddenScope} onChange={(event) => setHiddenScope(event.target.value as HiddenScope)} className="bg-transparent text-sm font-bold text-blue-950"><option value="ayah">Current ayah</option><option value="line">Current line</option><option value="page">Whole page</option></select>
            </label>
            <button type="button" onClick={toggleHiddenCurrent} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-blue-200 px-4 text-sm font-bold text-blue-950 hover:bg-blue-50"><EyeOff className="h-4 w-4" /> Hide</button>
            <button type="button" onClick={() => { setIsTestMode(true); setPageHidden(true); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-blue-200 px-4 text-sm font-bold text-blue-950 hover:bg-blue-50"><Eye className="h-4 w-4" /> Test Me</button>
            <select aria-label="Reciter" value={reciterId} onChange={(event) => { const id = Number(event.target.value); setReciterId(id); setDefaultHifzReciterId(id); }} className="min-h-11 max-w-full rounded-lg border border-blue-200 bg-white px-3 text-sm text-blue-950">
              {RECITERS.map((reciter) => <option key={reciter.id} value={reciter.id}>{reciter.name}</option>)}
            </select>
            <select aria-label="Playback speed" value={settings.playbackSpeed} onChange={(event) => setSettings((current) => ({ ...current, playbackSpeed: Number(event.target.value) }))} className="min-h-11 rounded-lg border border-blue-200 bg-white px-3 text-sm text-blue-950">
              {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => <option key={speed} value={speed}>{speed}x</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-blue-100 pt-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-950">
              <Volume2 className="h-4 w-4" /> {playingAyahKey ?? 'Tap a word or Play'}
              {repeatScope === 'ayah' ? ` · ${repeatIteration}/${repeatCount === Infinity ? '∞' : repeatCount}` : ` · Section ${sectionIteration}/${sectionRepeat === Infinity ? '∞' : sectionRepeat}`}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => playPrevious()} aria-label="Previous ayah" className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 text-blue-950"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => playNext()} aria-label="Next ayah" className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 text-blue-950"><ChevronRight className="h-5 w-5" /></button>
              <button type="button" onClick={() => goToPage(pageNumber - 1)} aria-label="Previous page" disabled={pageNumber <= 1} className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 text-blue-950 disabled:opacity-40"><ChevronLeft className="h-5 w-5" /><ChevronLeft className="-ml-3 h-3 w-3" /></button>
              <button type="button" onClick={() => goToPage(pageNumber + 1)} aria-label="Next page" disabled={pageNumber >= TOTAL_PAGES} className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 text-blue-950 disabled:opacity-40"><ChevronRight className="h-5 w-5" /><ChevronRight className="-ml-3 h-3 w-3" /></button>
            </div>
          </div>
          <RecitationPracticePanel recitation={recitation} practiceVerseKey={playingAyahKey} surahId={pageData?.surahNumber ?? undefined} surahName={pageData?.surahNameEn ?? undefined} juz={pageData?.juzNumber ?? undefined} showRecording={false} />
          <div className="text-center text-[11px] text-slate-500">Fixed 13-line page from QUL Qudratullah layout · {pageData?.sourceUrl && <a href={pageData.sourceUrl} target="_blank" rel="noreferrer" className="underline">Source</a>}</div>
        </section>

        {sessionComplete && sessionRangeId && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="mushaf-session-complete" className="w-full max-w-md space-y-4 rounded-xl border border-blue-200 bg-white p-5 shadow-2xl">
              <div>
                <h2 id="mushaf-session-complete" className="text-xl font-extrabold text-blue-950">Hifz session complete</h2>
                <p className="mt-1 text-sm text-slate-600">How well did you remember {sessionVerseKeys[0]}–{sessionVerseKeys.at(-1)}?</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['easy', 'Easy'], ['good', 'Good'], ['needed_help', 'Needed help'], ['difficult', 'Difficult'],
                ] as const).map(([rating, label]) => (
                  <button key={rating} type="button" onClick={() => rateCompletedSession(rating)} className="min-h-11 rounded-lg border border-blue-200 px-3 text-sm font-bold text-blue-950 hover:bg-blue-50">{label}</button>
                ))}
              </div>
              <button type="button" onClick={markSessionMemorized} className="min-h-11 w-full rounded-lg bg-blue-900 px-4 text-sm font-bold text-white hover:bg-blue-800">Mark selected range memorised</button>
              <button type="button" onClick={() => setSessionComplete(false)} className="min-h-9 w-full text-sm font-semibold text-slate-500">Close</button>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}