'use client';

import { useEffect, useState, useRef, type MouseEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Play, Pause, Copy, Bookmark, Share2, Info, X, ChevronLeft, Repeat, Eye, EyeOff, ScrollText, Zap, ArrowUp } from 'lucide-react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useQuranAudio } from '@/hooks/useQuranAudio';
import { useQuranWordAudio } from '@/hooks/useQuranWordAudio';
import UnifiedSearch from '@/components/UnifiedSearch';
import { RECITERS } from '@/data/reciters';
import ReciterPicker from '@/components/quran/ReciterPicker';
import { getStoredReciterId, storeReciterId } from '@/lib/reciterAudio';
import { navigateToAyah, parseVerseKeyFromHash } from '@/lib/quranNavigation';
import { mapApiAudioFiles, resolveAyahAudio } from '@/lib/quranAudioUrls';
import {
  shouldAutoplayFromUrl,
  stopGlobalQuranAudio,
  stripAutoplayFromUrl,
} from '@/lib/quranAudio';
import TajweedText from '@/components/quran/TajweedText';
import TajweedToggle from '@/components/quran/TajweedToggle';
import TajweedLegend from '@/components/quran/TajweedLegend';
import WordByWordAyah from '@/components/quran/WordByWordAyah';
import WordDetailInline from '@/components/quran/WordDetailInline';
import { getStoredTajweedEnabled, storeTajweedEnabled } from '@/data/tajweedRules';
import { buildChapterWordsFetchUrls, fetchVersesWithWords } from '@/lib/quranWords';
import type { AyahWithWords, QuranWord } from '@/types/quranWord';

type Ayah = AyahWithWords & { text_imlaei_simple?: string };

type SurahInfo = {
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  bismillah_pre: boolean;
  revelation_place: string;
};

export default function SurahClient({ surahId }: { surahId: string }) {
  const searchParams = useSearchParams();
  const autoplayRequested = searchParams.get('autoplay') === 'true';
  const reciterParam = searchParams.get('reciter');
  const startingVerse = searchParams.get('startingVerse');
  const verseOnly = searchParams.get('verse'); // fallback like ?verse=255
  const safeStartingVerse = startingVerse && /^\d+:\d+$/.test(startingVerse) ? startingVerse : null;
  const derivedStartingVerse = !safeStartingVerse && verseOnly && /^\d+$/.test(verseOnly) ? `${surahId}:${verseOnly}` : safeStartingVerse;
  
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [surahInfo, setSurahInfo] = useState<SurahInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReciter, setSelectedReciter] = useState(() =>
    reciterParam ? Number(reciterParam) : getStoredReciterId()
  );
  const [isMemorizeMode, setIsMemorizeMode] = useState(false);
  const [tajweedEnabled, setTajweedEnabled] = useState(true);
  const [selectedWord, setSelectedWord] = useState<QuranWord | null>(null);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const { 
    playingAyahKey, 
    isPlaying, 
    play, 
    pause, 
    settings, 
    setSettings 
  } = useQuranAudio({ ayahs, reciterId: selectedReciter });

  const { playWord, playingWordId } = useQuranWordAudio(selectedReciter);

  // Tafseer State
  const [selectedAyahForTafseer, setSelectedAyahForTafseer] = useState<string | null>(null);
  const [selectedTafsirId, setSelectedTafsirId] = useState<number>(168); // Default to Ma'arif al-Qur'an
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirContent, setTafsirContent] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const initialNavDone = useRef(false);
  const playRef = useRef(play);
  playRef.current = play;

  useEffect(() => {
    initialNavDone.current = false;
  }, [surahId, derivedStartingVerse, autoplayRequested]);

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
    const handleScroll = () => {
        if (window.scrollY > 400) {
            setShowBackToTop(true);
        } else {
            setShowBackToTop(false);
        }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  useEffect(() => {
    if (surahId) {
      fetchSurahData();
    }
    return () => {
        stopGlobalQuranAudio();
    };
  }, [surahId, selectedReciter]);

  // Deep-link: scroll to ayah; play only when ?autoplay=true on fresh navigation
  useEffect(() => {
    if (loading || ayahs.length === 0 || initialNavDone.current) return;

    const hashKey = parseVerseKeyFromHash(window.location.hash);
    const targetKey = derivedStartingVerse || hashKey;
    const allowAutoplay = autoplayRequested && shouldAutoplayFromUrl();

    if (targetKey) {
      const inSurah = ayahs.some((a) => a.verse_key === targetKey);
      if (inSurah) {
        initialNavDone.current = true;
        navigateToAyah(targetKey, {
          shouldPlay: allowAutoplay,
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
  }, [loading, ayahs, autoplayRequested, derivedStartingVerse]);

  // Hash changes — scroll only (no autoplay on back)
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
    playWord(word, { ayahAudioUrl: ayah?.audio?.url || ayah?.audio?.backupUrl });
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

  async function fetchSurahData() {
    try {
      setLoading(true);
      setError(null);
      pause();
      const infoRes = await fetch(`https://api.quran.com/api/v4/chapters/${surahId}`);
      if (!infoRes.ok) {
        if (infoRes.status === 404) throw new Error('Surah not found.');
        throw new Error('Failed to fetch surah info');
      }
      const infoData = await infoRes.json();
      setSurahInfo(infoData.chapter);

      const reciter = RECITERS.find(r => r.id === selectedReciter);
      const isCustomReciter = !!reciter?.urlPrefix;

      const mergedAyahs = await fetchVersesWithWords(buildChapterWordsFetchUrls(surahId));

      let audioMap = new Map<string, string>();
      if (!isCustomReciter) {
        try {
          const audioRes = await fetch(
            `https://api.quran.com/api/v4/recitations/${selectedReciter}/by_chapter/${surahId}?per_page=300`
          );
          if (audioRes.ok) {
            const audioData = await audioRes.json();
            audioMap = mapApiAudioFiles(audioData.audio_files);
          }
        } catch (e) {
          console.warn('Failed to parse audio data', e);
        }
      }

      setAyahs(
        mergedAyahs.map((verse) => ({
          ...verse,
          audio: resolveAyahAudio(
            verse.verse_key,
            isCustomReciter ? reciter : undefined,
            audioMap.get(verse.verse_key)
          ),
        }))
      );
      
    } catch (error: any) {
      console.error('Error fetching surah:', error);
      setError(error.message || 'Failed to load Surah. Please check your internet connection.');
    } finally {
      setLoading(false);
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

  const openTafseer = (verseKey: string) => {
    setSelectedAyahForTafseer(verseKey);
    fetchTafsir(verseKey, selectedTafsirId);
  };

  async function fetchTafsir(verseKey: string, tafsirId: number) {
    try {
      setTafsirLoading(true);
      setTafsirContent('');
      
      // Direct API call to avoid backend dependency for static export
      const res = await fetch(`https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_ayah/${verseKey}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch tafseer');
      }

      const data = await res.json();
      if (data.tafsir && data.tafsir.text) {
        setTafsirContent(data.tafsir.text);
      } else {
         setTafsirContent(''); // Ensure it's empty to trigger the "No content" message
      }
    } catch (error) {
      console.error('Error fetching tafsir:', error);
      setTafsirContent(''); // Fallback
    } finally {
      setTafsirLoading(false);
    }
  }

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <p className="text-xs text-slate-400 font-mono bg-slate-100 px-3 py-1 rounded">
            Surah ID: {surahId || 'undefined'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 w-full">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-12">
      
      {/* Top Controls - Sticky */}
      <div className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur-sm py-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-slate-200 mb-8 transition-all shadow-sm">
      <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/quran" className="flex items-center justify-center sm:justify-start text-slate-500 hover:text-emerald-600 transition-colors py-2 sm:py-0">
                <ChevronLeft className="w-5 h-5 mr-1" />
                <span className="font-medium">Back to Index</span>
            </Link>

            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-full sm:w-auto justify-center overflow-x-auto">
                {/* Auto Scroll Toggle */}
                <button
                    onClick={() => setSettings(s => ({ ...s, autoScroll: !s.autoScroll }))}
                    className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
                        settings.autoScroll 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-50'
                    }`}
                    title="Auto-Scroll (Follow)"
                >
                    <ScrollText className="w-4 h-4" />
                    <span className="text-xs font-bold hidden sm:inline">Follow</span>
                </button>

                {/* Repeat Mode Cycle */}
                <button
                    onClick={cycleRepeatMode}
                    className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
                        settings.repeatCount !== 1 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-50'
                    }`}
                    title={`Repeat Mode: ${getRepeatLabel()}`}
                >
                    <Repeat className="w-4 h-4" />
                    <span className="text-xs font-bold">{getRepeatLabel()}</span>
                </button>

                {/* Speed Toggle */}
                <button
                    onClick={cycleSpeed}
                    className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
                        (settings.playbackSpeed || 1) > 1 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-50'
                    }`}
                    title="Playback Speed"
                >
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-bold">{settings.playbackSpeed || 1}x</span>
                </button>

                <button
                    onClick={() => setIsMemorizeMode(!isMemorizeMode)}
                    className={`p-2 rounded-md transition-colors ${
                        isMemorizeMode 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-50'
                    }`}
                    title={isMemorizeMode ? "Disable Memorization Mode" : "Enable Memorization Mode"}
                >
                    {isMemorizeMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <TajweedToggle
                    enabled={tajweedEnabled}
                    onChange={setTajweedEnabled}
                />
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <ReciterPicker
                    value={selectedReciter}
                    onChange={setSelectedReciter}
                    variant="inline"
                />
            </div>
          </div>
            
          <div id="unified-search-root">
          <UnifiedSearch 
              ayahs={ayahs}
              currentReciterId={selectedReciter}
              onAyahFound={handleAyahJump}
              onReciterChange={setSelectedReciter}
              className="w-full md:max-w-2xl md:mx-auto"
          />
          </div>
      </div>
      </div>

      {/* Header */}
      {surahInfo && (
        <div className="text-center mb-8 md:mb-16 relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <div className="w-64 h-64 bg-emerald-500 rounded-full blur-3xl"></div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-slate-900 mb-2 md:mb-4 relative z-10 drop-shadow-sm">{surahInfo.name_simple}</h1>
          <p className="text-2xl sm:text-3xl md:text-4xl font-arabic text-emerald-700 mb-3 md:mb-6 relative z-10">{surahInfo.name_arabic}</p>
          <div className="inline-flex items-center gap-2 md:gap-3 px-3 md:px-5 py-1.5 md:py-2.5 bg-emerald-50 rounded-full text-emerald-900 text-xs md:text-sm font-bold relative z-10 border border-emerald-100">
            <span className="uppercase tracking-wider text-xs md:text-sm">{surahInfo.revelation_place}</span>
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
            <span className="text-xs md:text-sm">{surahInfo.verses_count} Ayahs</span>
          </div>
        </div>
      )}

      {tajweedEnabled && <TajweedLegend className="max-w-4xl mx-auto mb-8" layout="strip" />}

      {/* Bismillah */}
      {surahInfo?.bismillah_pre && (
        <div className="text-center mb-8 md:mb-16">
          <p className="font-arabic text-3xl sm:text-4xl md:text-6xl text-slate-900 leading-loose drop-shadow-sm">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
        </div>
      )}

      {/* Verses List */}
      <div className="space-y-4 md:space-y-8">
        {ayahs.map((ayah) => {
          const isCurrentAyah = playingAyahKey === ayah.verse_key;
          
          return (
          <div 
            key={ayah.id} 
            id={`verse-${ayah.verse_key}`} 
            onClick={(e) => handleAyahCardClick(e, ayah.verse_key)}
            className={`rounded-2xl md:rounded-3xl shadow-sm border overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer ${
                isCurrentAyah 
                ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' 
                : 'bg-white border-slate-200'
            }`}
          >
            
            <div className="p-4 sm:p-6 md:p-8 lg:p-10 space-y-4 md:space-y-8">
              {/* Arabic */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-6">
                 <div className="flex-shrink-0 w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold text-sm sm:text-base border border-slate-200">
                    {ayah.verse_key.split(':')[1]}
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

            {/* Actions Bar */}
            <div className="flex items-center gap-2 border-t border-slate-100 pt-4 mt-4 sm:pt-6 sm:mt-6">
               <button 
                 onClick={(e) => { e.stopPropagation(); play(ayah.verse_key); }}
                 className={`p-2 sm:p-2.5 rounded-xl transition-colors ${playingAyahKey === ayah.verse_key && isPlaying ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-emerald-100 hover:text-emerald-800'}`} 
                 title={playingAyahKey === ayah.verse_key && isPlaying ? "Pause" : "Play"}
               >
                  {playingAyahKey === ayah.verse_key && isPlaying ? <Pause className="w-4 sm:w-5 h-4 sm:h-5" /> : <Play className="w-4 sm:w-5 h-4 sm:h-5" />}
               </button>
               <button 
                 onClick={(e) => {
                     e.stopPropagation();
                     setSettings(s => ({ ...s, repeatCount: Infinity }));
                     play(ayah.verse_key);
                 }}
                 className={`p-2 sm:p-2.5 rounded-xl hover:bg-emerald-100 hover:text-emerald-800 transition-colors ${playingAyahKey === ayah.verse_key && settings.repeatCount === Infinity ? 'text-emerald-700 bg-emerald-100 ring-1 ring-emerald-500' : 'text-slate-500'}`} 
                 title="Loop This Ayah"
               >
                  <Repeat className="w-4 sm:w-5 h-4 sm:h-5" />
               </button>
               <button 
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 sm:p-2.5 text-slate-500 hover:text-emerald-800 hover:bg-emerald-100 rounded-xl transition-colors" title="Copy Text">
                  <Copy className="w-4 sm:w-5 h-4 sm:h-5" />
               </button>
               <button 
                  onClick={(e) => { e.stopPropagation(); toggleBookmark('surah', surahId, ayah.verse_key); }}
                  className={`p-2 sm:p-2.5 rounded-xl hover:bg-amber-100 hover:text-amber-800 transition-colors ${isBookmarked(ayah.verse_key) ? 'text-amber-600 bg-amber-50' : 'text-slate-500'}`}
                  title="Bookmark"
               >
                  <Bookmark className={`w-4 sm:w-5 h-4 sm:h-5 ${isBookmarked(ayah.verse_key) ? 'fill-current' : ''}`} />
               </button>
               <button 
                  onClick={(e) => { e.stopPropagation(); openTafseer(ayah.verse_key); }}
                  className="p-2 sm:p-2.5 text-slate-500 hover:text-emerald-800 hover:bg-emerald-100 rounded-xl transition-colors" 
                  title="View Tafseer"
               >
                  <Info className="w-4 sm:w-5 h-4 sm:h-5" />
               </button>
            </div>

          </div>
          );
        })}
      </div>

      {/* Tafseer Modal */}
      {selectedAyahForTafseer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedAyahForTafseer(null)}>
          <div className="bg-white rounded-2xl md:rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-start md:items-center bg-slate-50 gap-3">
              <div className="flex-1">
                <h3 className="text-lg md:text-2xl font-bold text-slate-900">Tafseer</h3>
                <p className="text-slate-500 font-medium mt-1 text-xs md:text-base">
                  Surah {surahInfo?.name_simple} • Ayah {selectedAyahForTafseer.split(':')[1]}
                </p>
              </div>
              <button 
                onClick={() => setSelectedAyahForTafseer(null)} 
                className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200 transition-all flex-shrink-0"
              >
                 <X className="w-5 md:w-6 h-5 md:h-6" />
              </button>
            </div>
            
            {/* Tafseer Selector */}
            <div className="px-4 md:px-6 py-3 md:py-4 bg-white border-b border-slate-100 flex gap-2 md:gap-3 overflow-x-auto no-scrollbar">
              <button 
                 onClick={() => { setSelectedTafsirId(168); fetchTafsir(selectedAyahForTafseer, 168); }}
                 className={`px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap border ${selectedTafsirId === 168 ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
              >
                 Ma'arif al-Qur'an
              </button>
              <button 
                 onClick={() => { setSelectedTafsirId(169); fetchTafsir(selectedAyahForTafseer, 169); }}
                 className={`px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap border ${selectedTafsirId === 169 ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
              >
                 Ibn Kathir (Traditional)
              </button>
            </div>

            {/* Tafseer Content */}
             <div className="p-4 md:p-8 overflow-y-auto flex-1 bg-white custom-scrollbar">
               {tafsirLoading ? (
                  <div className="flex justify-center py-20">
                     <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                  </div>
               ) : (
                  <div className="text-base md:text-lg text-slate-800 font-medium leading-loose [&_p]:mb-4 md:[&_p]:mb-6 [&_h1]:text-xl md:[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 md:[&_h1]:mb-4 [&_h2]:text-lg md:[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 md:[&_h2]:mb-3">
                     {tafsirContent ? (
                       <div dangerouslySetInnerHTML={{ __html: tafsirContent }} />
                     ) : (
                       <p className="text-center text-slate-500 italic">No Tafseer available for this Ayah.</p>
                     )}
                  </div>
               )}
             </div>
          </div>
        </div>
      )}

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-3 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all z-50 hover:scale-110"
          aria-label="Back to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}

    </div>
    </div>
  );
}
