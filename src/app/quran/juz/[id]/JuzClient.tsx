'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Play, Pause, X, ArrowUp, ChevronLeft, Headphones, Repeat, Bookmark, ScrollText, Zap, BookOpen } from 'lucide-react';
import juzQuartersData from '@/data/juz-quarters.json';
import QuranNavigation from '@/components/QuranNavigation';
import UnifiedSearch from '@/components/UnifiedSearch';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useQuranAudio } from '@/hooks/useQuranAudio';
import { RECITERS } from '@/data/reciters';

type Ayah = {
  id: number;
  verse_key: string;
  text_uthmani: string;
  text_imlaei_simple: string;
  translations: { text: string }[];
  audio: { url: string };
};

type QuarterData = {
  start: [number, number];
  end: [number, number];
};

type JuzQuarters = {
  [key: string]: {
    [key: string]: QuarterData;
  };
};

export default function JuzClient({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const autoplay = searchParams.get('autoplay') === 'true';
  const reciterParam = searchParams.get('reciter');
  const ayahIndexParam = searchParams.get('ayahIndex');
  const startingVerse = searchParams.get('startingVerse');
  const safeStartingVerse = startingVerse && /^\d+:\d+$/.test(startingVerse) ? startingVerse : null;

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReciter, setSelectedReciter] = useState(reciterParam ? Number(reciterParam) : 7); // Default Mishary
  const [isMemorizeMode] = useState(false);
  
  // Audio State & Hook
  const { 
    playingAyahKey, 
    isPlaying, 
    play, 
    pause, 
    settings, 
    setSettings 
  } = useQuranAudio({ ayahs, range: null });

  const [showBackToTop, setShowBackToTop] = useState(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  useEffect(() => {
    const controller = new AbortController();
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
      pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, selectedReciter]);

  // Handle Hash Scroll and Autoplay on Load
  useEffect(() => {
    if (!loading && ayahs.length > 0) {
      const hash = window.location.hash;
      if (hash) {
        // Wait a bit for rendering
        setTimeout(() => {
          const id = hash.replace('#', '');
          let element = document.getElementById(id);
          if (!element) {
            element = document.getElementById(`verse-${id}`);
          }
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Optional: Highlight effect
            element.classList.add('ring-2', 'ring-emerald-500');
            setTimeout(() => element.classList.remove('ring-2', 'ring-emerald-500'), 2000);
            
            // Handle autoplay for specific ayah
            if (autoplay) {
                const verseKey = safeStartingVerse || id.replace('verse-', '');
                play(verseKey);
            }
          }
        }, 500);
      } else if (safeStartingVerse) {
        setTimeout(() => {
          const element = document.getElementById(`verse-${safeStartingVerse}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-2', 'ring-emerald-500');
            setTimeout(() => element.classList.remove('ring-2', 'ring-emerald-500'), 2000);
          }
          if (autoplay) play(safeStartingVerse);
        }, 500);
      } else if (ayahIndexParam) {
        setTimeout(() => {
            const idx = parseInt(ayahIndexParam);
            if (idx >= 1 && idx <= ayahs.length) {
                const targetAyah = ayahs[idx - 1];
                const element = document.getElementById(`verse-${targetAyah.verse_key}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-emerald-500');
                    setTimeout(() => element.classList.remove('ring-2', 'ring-emerald-500'), 2000);
                    
                    if (autoplay) {
                        play(targetAyah.verse_key);
                    }
                }
            }
        }, 500);
      } else if (autoplay) {
        // Autoplay from start if no specific ayah
        play(ayahs[0].verse_key);
      }
    }
  }, [loading, ayahs, autoplay, ayahIndexParam, searchParams, safeStartingVerse]);

  async function fetchJuzData(signal?: AbortSignal) {
    try {
      setLoading(true);
      setError(null);
      
      const reciter = RECITERS.find(r => r.id === selectedReciter);
      const isCustomReciter = !!reciter?.urlPrefix;

      // Parallel fetch: Verses and Audio (only if not custom)
      const promises: Promise<any>[] = [
        fetch(`https://api.quran.com/api/v4/verses/by_juz/${id}?language=en&words=false&translations=20&fields=text_uthmani,text_imlaei_simple&per_page=1000&mushaf=6`, { signal })
      ];

      if (!isCustomReciter) {
        promises.push(fetch(`https://api.quran.com/api/v4/recitations/${selectedReciter}/by_juz/${id}?per_page=1000`, { signal }));
      }

      const responses = await Promise.all(promises);
      const versesRes = responses[0];
      const audioRes = !isCustomReciter ? responses[1] : null;
      
      if (!versesRes.ok) {
        throw new Error(`Failed to fetch verses: ${versesRes.status} ${versesRes.statusText}`);
      }
      
      const versesData = await versesRes.json();
      let audioMap = new Map();

      if (audioRes && audioRes.ok) {
        try {
            const audioData = await audioRes.json();
            if (audioData.audio_files) {
                audioMap = new Map(audioData.audio_files.map((a: any) => [a.verse_key, a.url]));
            }
        } catch (e) {
            console.warn("Failed to parse audio data", e);
        }
      } else if (audioRes && !audioRes.ok) {
        console.warn(`Audio fetch failed: ${audioRes.status} ${audioRes.statusText}`);
      }
      

      if (versesData.verses) {
        // Merge audio URL into verses
        let mergedAyahs = versesData.verses.map((verse: any) => {
            let audioUrl = '';
            
            if (isCustomReciter && reciter?.urlPrefix) {
                // Generate URL: prefix/SSSAAA.mp3
                const [surah, ayah] = verse.verse_key.split(':');
                const s = surah.padStart(3, '0');
                const a = ayah.padStart(3, '0');
                audioUrl = `${reciter.urlPrefix}/${s}${a}.mp3`;
            } else {
                audioUrl = audioMap.get(verse.verse_key) || '';
            }

            return {
                ...verse,
                audio: {
                    url: audioUrl
                }
            };
        });

        // Filter ayahs based on IndoPak Juz boundaries if available
        const juzQuarters = juzQuartersData as unknown as JuzQuarters;
        const currentJuzData = juzQuarters[`juz_${id}`];
        if (currentJuzData) {
            const startCoords = currentJuzData.quarter_1?.start;
            const endCoords = currentJuzData.quarter_4?.end;

            if (startCoords && endCoords) {
                const [startSurah, startAyahNum] = startCoords;
                const [endSurah, endAyahNum] = endCoords;

                mergedAyahs = mergedAyahs.filter((ayah: Ayah) => {
                    const [s, a] = ayah.verse_key.split(':').map(Number);
                    
                    // Check if before start
                    if (s < startSurah) return false;
                    if (s === startSurah && a < startAyahNum) return false;
                    
                    // Check if after end
                    if (s > endSurah) return false;
                    if (s === endSurah && a > endAyahNum) return false;

                    return true;
                });
            }
        }
        
        if (!signal?.aborted) {
            setAyahs(mergedAyahs);
        }
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

  const handleAyahJump = (verseKey: string, shouldPlay: boolean = false) => {
    if (!verseKey) return;
    const element = document.getElementById(`verse-${verseKey}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight temporarily
        element.classList.add('ring-4', 'ring-emerald-400');
        setTimeout(() => element.classList.remove('ring-4', 'ring-emerald-400'), 2000);
        
        if (shouldPlay) {
            play(verseKey);
        }
    }
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
        
        {/* Header & Controls - Sticky */}
        <div className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur-sm py-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-slate-200 mb-8 md:mb-12 space-y-6 shadow-sm">
            {/* Top Bar: Back Button & Reciter Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <Link href="/quran/juz" className="flex items-center justify-center sm:justify-start text-slate-500 hover:text-emerald-600 transition-colors py-2 sm:py-0">
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    <span className="font-medium">Back to Juz Index</span>
                </Link>

                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-full sm:w-auto overflow-x-auto">
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

                    <div className="w-px h-4 bg-slate-200 mx-1"></div>

                    {/* Repeat Toggle */}
                    <button
                        onClick={cycleRepeatMode}
                        className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
                            settings.repeatCount > 1 
                            ? 'bg-emerald-100 text-emerald-600' 
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-50'
                        }`}
                        title="Repeat Ayah"
                    >
                        <Repeat className="w-4 h-4" />
                        <span className="text-xs font-bold">{getRepeatLabel()}</span>
                    </button>
                    
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>

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
                    
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    
                    <Headphones className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <select
                        value={selectedReciter}
                        onChange={(e) => setSelectedReciter(Number(e.target.value))}
                        className="text-sm font-medium text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer outline-none w-full sm:w-auto sm:min-w-[160px]"
                    >
                        {RECITERS.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="text-center">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
                    Juz {id}
                </h1>

                <Link 
                    href={`/hifz-planner?juz=${id}`}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200/50 hover:shadow-2xl hover:shadow-emerald-200/50 hover:-translate-y-1 transition-all duration-300 mb-8 border border-white/20"
                >
                    <BookOpen className="w-6 h-6" />
                    Start Hifz From This Juz
                </Link>
                
                {/* Ayah Selector */}
                <div className="flex flex-col items-center gap-4 mt-6">
                    <div className="relative w-full max-w-xs">
                        <select
                            onChange={(e) => {
                                handleAyahJump(e.target.value);
                                e.target.value = ""; // Reset selection
                            }}
                            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-3 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:bg-white focus:border-emerald-500 shadow-sm font-medium text-center cursor-pointer hover:border-emerald-300 transition-colors"
                            defaultValue=""
                        >
                            <option value="" disabled>Jump to Ayah...</option>
                            {ayahs.map((ayah) => (
                                <option key={ayah.verse_key} value={ayah.verse_key}>
                                    Ayah {ayah.verse_key.split(':')[1]} ({ayah.verse_key})
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>

                    <UnifiedSearch 
                        ayahs={ayahs}
                        currentReciterId={selectedReciter}
                        onAyahFound={handleAyahJump}
                        onReciterChange={setSelectedReciter}
                        className="w-full md:max-w-2xl"
                    />
                </div>
            </div>
        </div>

        {/* Verses List */}
        <div className="space-y-4 md:space-y-8">
          {ayahs.map((ayah) => {
             const isCurrentAyah = playingAyahKey === ayah.verse_key;
             
             return (
              <div 
                key={ayah.id} 
                id={`verse-${ayah.verse_key}`}
                onClick={() => {
                  const selection = window.getSelection();
                  if (selection && selection.toString().length > 0) return;
                  play(ayah.verse_key);
                }}
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
                     <p 
                        className={`text-right font-arabic text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-[1.8] md:leading-[2.4] text-slate-900 w-full drop-shadow-sm transition-all duration-300 ${
                            isMemorizeMode ? 'blur-md hover:blur-none select-none' : ''
                        }`} 
                        dir="rtl"
                     >
                        {ayah.text_uthmani}
                     </p>
                  </div>
                  
                  {/* Translation */}
                  <div className="text-slate-900 text-base sm:text-lg md:text-xl leading-relaxed md:pl-16 lg:pl-20 font-semibold">
                    {ayah.translations?.[0]?.text.replace(/<sup.*?<\/sup>/g, '')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

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
    </div>
  );
}
