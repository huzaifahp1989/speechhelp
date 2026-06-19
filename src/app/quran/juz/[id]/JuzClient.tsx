'use client';

import { useEffect, useState, useRef, type MouseEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Play, Pause, X, ArrowUp, ChevronLeft, Repeat, Bookmark, ScrollText, Zap, BookOpen, Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import QuranNavigation from '@/components/QuranNavigation';
import JuzAyahSearch from '@/components/quran/JuzAyahSearch';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useQuranAudio } from '@/hooks/useQuranAudio';
import { useQuranWordAudio } from '@/hooks/useQuranWordAudio';
import { RECITERS } from '@/data/reciters';
import { filterAyahsByJuz, getJuzBoundary } from '@/lib/juzBoundaries';
import { resolveAyahAudio, fetchReciterAudioByChapters, getUniqueSurahIds } from '@/lib/quranAudioUrls';
import { getStoredReciterId, storeReciterId } from '@/lib/reciterAudio';
import { navigateToAyah, parseVerseKeyFromHash } from '@/lib/quranNavigation';
import {
  shouldAutoplayFromUrl,
  stopGlobalQuranAudio,
  stripAutoplayFromUrl,
} from '@/lib/quranAudio';
import ReciterPicker from '@/components/quran/ReciterPicker';
import MobileBottomSheet from '@/components/ui/MobileBottomSheet';
import TajweedText from '@/components/quran/TajweedText';
import TajweedToggle from '@/components/quran/TajweedToggle';
import TajweedLegend from '@/components/quran/TajweedLegend';
import WordByWordAyah from '@/components/quran/WordByWordAyah';
import WordDetailInline from '@/components/quran/WordDetailInline';
import { getStoredTajweedEnabled, storeTajweedEnabled } from '@/data/tajweedRules';
import { buildJuzWordsFetchUrls, fetchVersesWithWords, getSpeakableWordIndex, countSpeakableWords } from '@/lib/quranWords';
import type { AyahWithWords, QuranWord } from '@/types/quranWord';

type Ayah = AyahWithWords & { text_imlaei_simple?: string };

export default function JuzClient({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const autoplayRequested = searchParams.get('autoplay') === 'true';
  const reciterParam = searchParams.get('reciter');
  const ayahIndexParam = searchParams.get('ayahIndex');
  const startingVerse = searchParams.get('startingVerse');
  const safeStartingVerse = startingVerse && /^\d+:\d+$/.test(startingVerse) ? startingVerse : null;

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReciter, setSelectedReciter] = useState(() =>
    reciterParam ? Number(reciterParam) : getStoredReciterId()
  );
  const [isMemorizeMode, setIsMemorizeMode] = useState(false);
  const [tajweedEnabled, setTajweedEnabled] = useState(true);
  const [selectedWord, setSelectedWord] = useState<QuranWord | null>(null);
  const juzNum = Number(id);
  const juzBoundary = getJuzBoundary(juzNum);
  
  // Audio State & Hook
  const { 
    playingAyahKey, 
    isPlaying, 
    play, 
    pause, 
    settings, 
    setSettings 
  } = useQuranAudio({ ayahs, reciterId: selectedReciter, range: null });

  const { playWord, playingWordId } = useQuranWordAudio(selectedReciter);

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const initialNavDone = useRef(false);
  const playRef = useRef(play);
  playRef.current = play;

  useEffect(() => {
    initialNavDone.current = false;
  }, [id, safeStartingVerse, ayahIndexParam, autoplayRequested]);

  useEffect(() => {
    storeReciterId(selectedReciter);
  }, [selectedReciter]);

  useEffect(() => {
    setTajweedEnabled(getStoredTajweedEnabled());
  }, []);

  useEffect(() => {
    storeTajweedEnabled(tajweedEnabled);
  }, [tajweedEnabled]);

  useEffect(() => {
    const controller = new AbortController();
    try {
      localStorage.setItem('lastReadJuz', String(juzNum));
    } catch { /* ignore */ }
    fetchJuzData(controller.signal);
    
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      controller.abort();
      stopGlobalQuranAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, selectedReciter]);
  
  // Handle deep-link scroll + play once ayahs are loaded
  useEffect(() => {
    if (loading || ayahs.length === 0 || initialNavDone.current) return;

    const hashKey = parseVerseKeyFromHash(window.location.hash);
    let targetKey = safeStartingVerse || hashKey;

    if (!targetKey && ayahIndexParam) {
      const idx = parseInt(ayahIndexParam, 10);
      if (idx >= 1 && idx <= ayahs.length) {
        targetKey = ayahs[idx - 1].verse_key;
      }
    }

    const allowAutoplay = autoplayRequested && shouldAutoplayFromUrl();
    const shouldPlay = allowAutoplay;

    if (targetKey) {
      const inJuz = ayahs.some((a) => a.verse_key === targetKey);
      if (inJuz) {
        initialNavDone.current = true;
        navigateToAyah(targetKey, {
          shouldPlay,
          play: (k) => playRef.current(k),
          updateHash: true,
        });
        if (allowAutoplay) stripAutoplayFromUrl();
        return;
      }
    }

    if (allowAutoplay && ayahs.length > 0) {
      initialNavDone.current = true;
      navigateToAyah(ayahs[0].verse_key, {
        shouldPlay: true,
        play: (k) => playRef.current(k),
        updateHash: false,
      });
      stripAutoplayFromUrl();
    }
  }, [loading, ayahs, autoplayRequested, ayahIndexParam, safeStartingVerse]);

  useEffect(() => {
    const onHashChange = () => {
      const key = parseVerseKeyFromHash(window.location.hash);
      if (key) {
        navigateToAyah(key, {
          shouldPlay: false,
          play: (k) => playRef.current(k),
          updateHash: false,
        });
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleWordClick = (word: QuranWord) => {
    const ayah = ayahs.find((a) => a.verse_key === word.verse_key);
    playWord(word, {
      ayahAudioUrl: ayah?.audio?.url || ayah?.audio?.backupUrl,
      wordIndex: getSpeakableWordIndex(ayah?.words, word),
      speakableWordCount: countSpeakableWords(ayah?.words),
    });
    setSelectedWord((prev) =>
      prev?.id === word.id ? null : { ...word, verse_key: word.verse_key }
    );
  };

  const handleAyahCardClick = (e: MouseEvent, verseKey: string) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-quran-word]') || target.closest('button')) return;
    setSelectedWord(null);
    handleAyahJump(verseKey, true);
  };

  async function fetchJuzData(signal?: AbortSignal) {
    try {
      setLoading(true);
      setError(null);
      pause();
      const reciter = RECITERS.find(r => r.id === selectedReciter);
      const isCustomReciter = !!reciter?.urlPrefix;

      let mergedAyahs = await fetchVersesWithWords(buildJuzWordsFetchUrls(id), signal);
      mergedAyahs = filterAyahsByJuz(mergedAyahs, Number(id));

      let audioMap = new Map<string, string>();
      if (!isCustomReciter && mergedAyahs.length > 0) {
        const surahIds = getUniqueSurahIds(mergedAyahs.map((a) => a.verse_key));
        try {
          audioMap = await fetchReciterAudioByChapters(selectedReciter, surahIds, signal);
        } catch (e) {
          if ((e as Error).name !== 'AbortError') {
            console.warn('Failed to fetch chapter audio', e);
          }
        }
      }

      mergedAyahs = mergedAyahs.map((verse) => {
        const audio = resolveAyahAudio(
          verse.verse_key,
          isCustomReciter ? reciter : undefined,
          audioMap.get(verse.verse_key)
        );
        return { ...verse, audio };
      });

      if (!signal?.aborted) {
        setAyahs(mergedAyahs);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Error fetching Juz:', err);
      setError(err.message || 'Failed to load Juz.');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }

  // Helper to cycle repeat modes
  const cycleRepeatMode = () => {
    const modes = [1, 3, 5, Infinity];
    const currentIndex = modes.indexOf(settings.repeatCount);
    const nextIndex = (currentIndex + 1) % modes.length;
    setSettings(prev => ({ ...prev, repeatCount: modes[nextIndex] }));
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(settings.playbackSpeed || 1);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setSettings(prev => ({ ...prev, playbackSpeed: speeds[nextIndex] }));
  };

  const getRepeatLabel = () => {
      if (settings.repeatCount === Infinity) return "Loop";
      if (settings.repeatCount === 1) return "Off";
      return `${settings.repeatCount}x`;
  };

  const renderAudioControls = (compact?: boolean, hideReciter?: boolean) => (
    <div className={`flex items-center gap-1.5 bg-white p-1.5 sm:p-2 rounded-lg border border-slate-200 shadow-sm overflow-x-auto ${compact ? 'w-full' : 'w-full sm:w-auto'}`}>
      <button
        onClick={() => setIsMemorizeMode((v) => !v)}
        className={`p-2 rounded-md transition-colors flex items-center gap-1 shrink-0 ${
          isMemorizeMode ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-50'
        }`}
        title={isMemorizeMode ? 'Show translation' : 'Hide translation (Hifz mode)'}
      >
        {isMemorizeMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        {!compact && <span className="text-xs font-bold hidden sm:inline">Hifz</span>}
      </button>
      <div className="w-px h-4 bg-slate-200 shrink-0" />
      <button
        onClick={() => setSettings(s => ({ ...s, autoScroll: !s.autoScroll }))}
        className={`p-2 rounded-md transition-colors flex items-center gap-1 shrink-0 ${
          settings.autoScroll ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-50'
        }`}
        title="Auto-Scroll (Follow)"
      >
        <ScrollText className="w-4 h-4" />
        {!compact && <span className="text-xs font-bold hidden sm:inline">Follow</span>}
      </button>
      <div className="w-px h-4 bg-slate-200 shrink-0" />
      <button
        onClick={cycleRepeatMode}
        className={`p-2 rounded-md transition-colors flex items-center gap-1 shrink-0 ${
          settings.repeatCount > 1 ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-50'
        }`}
        title="Repeat Ayah"
      >
        <Repeat className="w-4 h-4" />
        <span className="text-xs font-bold">{getRepeatLabel()}</span>
      </button>
      <div className="w-px h-4 bg-slate-200 shrink-0" />
      <button
        onClick={cycleSpeed}
        className={`p-2 rounded-md transition-colors flex items-center gap-1 shrink-0 ${
          (settings.playbackSpeed || 1) > 1 ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-50'
        }`}
        title="Playback Speed"
      >
        <Zap className="w-4 h-4" />
        <span className="text-xs font-bold">{settings.playbackSpeed || 1}x</span>
      </button>
      <div className="w-px h-4 bg-slate-200 shrink-0" />
      <TajweedToggle
        enabled={tajweedEnabled}
        onChange={setTajweedEnabled}
        compact={compact}
      />
      {!hideReciter && (
        <>
          <div className="w-px h-4 bg-slate-200 shrink-0" />
          <ReciterPicker
            value={selectedReciter}
            onChange={setSelectedReciter}
            variant={compact ? 'toolbar' : 'inline'}
            className={compact ? 'shrink-0' : 'min-w-[140px]'}
          />
        </>
      )}
    </div>
  );

  const handleAyahJump = (verseKey: string, shouldPlay = true) => {
    navigateToAyah(verseKey, {
      shouldPlay,
      play: (k) => playRef.current(k),
      updateHash: true,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <X className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-slate-600 mb-6 max-w-md">{error}</p>
        <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
            Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 w-full">
      {/* Navigation Sidebar */}
      <QuranNavigation />

      {/* Main Content - Add margin-left for desktop sidebar */}
      <div className="flex-1 w-full md:pl-72 transition-all duration-300">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-12">
        
        {/* Header — compact sticky bar on mobile; full panel on desktop */}
        <div className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-sm -mx-3 sm:-mx-4 md:-mx-8 px-3 sm:px-4 md:px-8 mb-4 md:mb-12 overflow-visible pt-[env(safe-area-inset-top,0px)]">
          {/* Mobile: slim toolbar — tools open in bottom sheet */}
          <div className="flex md:hidden items-center gap-1 sm:gap-2 py-2 min-w-0">
            <Link
              href="/quran/juz"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-white"
              aria-label="Back to Juz index"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-sm font-bold text-slate-900 leading-tight">Juz {id}</p>
              {juzBoundary && (
                <p className="text-[10px] text-slate-500 truncate">
                  {juzBoundary.startVerse} → {juzBoundary.endVerse}
                </p>
              )}
            </div>
            <ReciterPicker
              value={selectedReciter}
              onChange={setSelectedReciter}
              variant="toolbar"
            />
            {playingAyahKey && (
              <button
                type="button"
                onClick={() => (isPlaying ? pause() : play(playingAyahKey))}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileToolsOpen((v) => !v)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                mobileToolsOpen
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
              aria-label={mobileToolsOpen ? 'Close tools' : 'Open tools'}
              aria-expanded={mobileToolsOpen}
            >
              {mobileToolsOpen ? <X className="w-5 h-5" /> : <SlidersHorizontal className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile: voice + text search scoped to this juz */}
          <div className="md:hidden pb-3 min-w-0">
            <JuzAyahSearch
              ayahs={ayahs}
              juzId={id}
              defaultExpanded={false}
              onAyahFound={(key, shouldPlay) => handleAyahJump(key, shouldPlay)}
            />
          </div>

          {/* Desktop: full header */}
          <div className="hidden md:block py-4 space-y-6">
            <div className="flex flex-row items-center justify-between gap-4">
              <Link href="/quran/juz" className="flex items-center text-slate-500 hover:text-emerald-600 transition-colors">
                <ChevronLeft className="w-5 h-5 mr-1" />
                <span className="font-medium">Back to Juz Index</span>
              </Link>
              {renderAudioControls()}
            </div>

            <div id="unified-search-root">
              <JuzAyahSearch
                ayahs={ayahs}
                juzId={id}
                onAyahFound={handleAyahJump}
                className="w-full max-w-none"
              />
            </div>

            {tajweedEnabled && <TajweedLegend className="max-w-4xl mx-auto" layout="strip" />}

            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-2">Juz {id}</h1>
              {juzBoundary && (
                <p className="text-sm text-slate-500 mb-3 px-2 leading-relaxed">
                  <span className="font-semibold text-emerald-700">{juzBoundary.startVerse}</span>
                  {' → '}
                  <span className="font-semibold text-emerald-700">{juzBoundary.endVerse}</span>
                  <span className="text-slate-400"> · {juzBoundary.startDescription} → {juzBoundary.endDescription}</span>
                </p>
              )}
              <p className="text-xs text-slate-400 mb-4">{ayahs.length} ayahs in this juz</p>
              <Link
                href={`/hifz-planner?juz=${id}`}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200/50 hover:shadow-2xl transition-all mb-6 border border-white/20"
              >
                <BookOpen className="w-6 h-6" />
                Start Hifz From This Juz
              </Link>
              <p className="text-sm text-slate-500 mb-4">Tip: recite or search by Arabic, English, or Urdu (e.g. 2:255, light, نور)</p>
              <div className="relative w-full max-w-xs mx-auto">
                <select
                  onChange={(e) => {
                    handleAyahJump(e.target.value, true);
                    e.target.value = '';
                  }}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-3 px-4 pr-8 rounded-xl font-medium text-center cursor-pointer hover:border-emerald-300"
                  defaultValue=""
                >
                  <option value="" disabled>Jump to Ayah...</option>
                  {ayahs.map((ayah) => (
                    <option key={ayah.verse_key} value={ayah.verse_key}>
                      Ayah {ayah.verse_key.split(':')[1]} ({ayah.verse_key})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Verses List */}
        <div className="space-y-4 md:space-y-8 pb-24 md:pb-8">
          {ayahs.map((ayah) => {
             const isCurrentAyah = playingAyahKey === ayah.verse_key;
             
             return (
              <div 
                key={ayah.id} 
                id={`verse-${ayah.verse_key}`}
                onClick={(e) => handleAyahCardClick(e, ayah.verse_key)}
                className={`cursor-pointer rounded-2xl md:rounded-3xl shadow-sm border overflow-hidden group transition-all duration-300 ${
                    isCurrentAyah 
                        ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' 
                        : 'bg-white border-slate-200 hover:shadow-lg'
                }`}
              >
                <div className="p-4 sm:p-6 md:p-8 lg:p-10 space-y-4 md:space-y-8">
                  {/* Arabic Text */}
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-6">
                     <div className="flex-shrink-0 flex flex-col gap-2">
                         <span className="w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold text-sm sm:text-base border border-slate-200">
                            {ayah.verse_key.split(':')[1]}
                         </span>
                         <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                play(ayah.verse_key);
                            }}
                            className={`w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center rounded-full transition-colors ${
                                isCurrentAyah && isPlaying ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'
                            }`}
                            title={isCurrentAyah && isPlaying ? "Pause" : "Play"}
                         >
                            {isCurrentAyah && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                         </button>
                         <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSettings(s => ({ ...s, repeatCount: Infinity }));
                                play(ayah.verse_key);
                            }}
                            className={`w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center rounded-full transition-colors ${
                                isCurrentAyah && settings.repeatCount === Infinity ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'
                            }`}
                            title="Loop This Ayah"
                         >
                            <Repeat className="w-4 h-4" />
                         </button>
                         <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleBookmark('juz', id, ayah.verse_key);
                            }}
                            className={`w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center rounded-full transition-colors ${
                                isBookmarked(ayah.verse_key) ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                            }`}
                            title="Bookmark"
                         >
                            <Bookmark className={`w-4 h-4 ${isBookmarked(ayah.verse_key) ? 'fill-current' : ''}`} />
                         </button>
                     </div>
                     <div 
                        className={`text-right font-arabic text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-[1.8] md:leading-[2.4] w-full drop-shadow-sm transition-all duration-300 ${
                            isMemorizeMode ? 'blur-md hover:blur-none select-none' : ''
                        } ${tajweedEnabled ? 'text-slate-800' : 'text-slate-900'}`}
                     >
                        {ayah.words?.length ? (
                          <WordByWordAyah
                            words={ayah.words.map((w) => ({ ...w, verse_key: ayah.verse_key }))}
                            tajweedEnabled={tajweedEnabled}
                            showWordTranslations={false}
                            selectedWordId={selectedWord?.verse_key === ayah.verse_key ? selectedWord.id : null}
                            playingWordId={playingWordId}
                            onWordClick={handleWordClick}
                          />
                        ) : tajweedEnabled ? (
                          <TajweedText
                            html={ayah.text_uthmani_tajweed}
                            fallback={ayah.text_uthmani}
                          />
                        ) : (
                          ayah.text_uthmani
                        )}
                     </div>
                  </div>

                  {selectedWord?.verse_key === ayah.verse_key && (
                    <WordDetailInline
                      word={selectedWord}
                      tajweedEnabled={tajweedEnabled}
                      onClose={() => setSelectedWord(null)}
                    />
                  )}
                  
                  {/* Translation */}
                  <div className="space-y-2 md:pl-16 lg:pl-20">
                    <div className="text-slate-900 text-base sm:text-lg md:text-xl leading-relaxed font-semibold">
                      {ayah.translations?.[0]?.text?.replace(/<sup.*?<\/sup>/g, '')}
                    </div>
                    {ayah.translationUr && (
                      <div className="text-slate-800 text-base sm:text-lg leading-relaxed font-medium font-indopak" dir="rtl">
                        {ayah.translationUr}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile tools — portaled to body so sticky header doesn't trap fixed positioning */}
        <MobileBottomSheet
          open={mobileToolsOpen}
          onClose={() => setMobileToolsOpen(false)}
          title={`Juz ${id} tools`}
        >
          <div className="space-y-3">
            {renderAudioControls(true, true)}
            <ReciterPicker
              value={selectedReciter}
              onChange={setSelectedReciter}
              variant="panel"
            />
            <select
              onChange={(e) => {
                handleAyahJump(e.target.value, true);
                e.target.value = '';
                setMobileToolsOpen(false);
              }}
              className="w-full bg-white border border-slate-200 text-slate-700 py-2.5 px-4 rounded-xl text-sm font-medium"
              defaultValue=""
            >
              <option value="" disabled>Jump to ayah…</option>
              {ayahs.map((ayah) => (
                <option key={ayah.verse_key} value={ayah.verse_key}>
                  {ayah.verse_key}
                </option>
              ))}
            </select>
            {tajweedEnabled && <TajweedLegend layout="strip" />}
            <Link
              href={`/hifz-planner?juz=${id}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold"
              onClick={() => setMobileToolsOpen(false)}
            >
              <BookOpen className="w-4 h-4" />
              Start Hifz
            </Link>
            <p className="text-[11px] text-center text-slate-400">{ayahs.length} ayahs · tap a word for meaning · tap ayah to play</p>
          </div>
        </MobileBottomSheet>

        {/* Back to Top Button */}
        {showBackToTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 p-3 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all z-40 hover:scale-110"
            aria-label="Back to top"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
    </div>
  );
}
