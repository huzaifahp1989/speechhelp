'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Play, Pause, X, ArrowUp, ChevronLeft, Headphones, Repeat, Bookmark, Eye, EyeOff, ScrollText } from 'lucide-react';
import juzQuartersData from '@/data/juz-quarters.json';
import QuranNavigation from '@/components/QuranNavigation';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useQuranAudio } from '@/hooks/useQuranAudio';

type Reciter = {
  id: number;
  name: string;
  urlPrefix?: string;
};

const RECITERS: Reciter[] = [
  { id: 7, name: 'Mishary Rashid Alafasy' },
  { id: 3, name: 'Abdur-Rahman as-Sudais' },
  { id: 2, name: 'AbdulBaset AbdulSamad (Murattal)' },
  { id: 4, name: 'Abu Bakr al-Shatri' },
  { id: 5, name: 'Hani ar-Rifai' },
  { id: 6, name: 'Mahmoud Khalil Al-Husary' },
  { id: 9, name: 'Mohamed Siddiq al-Minshawi (Murattal)' },
  { id: 10, name: 'Saud Al-Shuraim' },
  // Custom Reciters
  { id: 101, name: 'Yasser Al-Dosari', urlPrefix: 'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps' },
  { id: 102, name: 'Saad Al-Ghamdi', urlPrefix: 'https://everyayah.com/data/Ghamadi_40kbps' },
  { id: 103, name: 'Maher Al-Muaiqly', urlPrefix: 'https://everyayah.com/data/Maher_AlMuaiqly_64kbps' },
  { id: 104, name: 'Salah Al-Budair', urlPrefix: 'https://everyayah.com/data/Salah_Al_Budair_128kbps' },
];

type Ayah = {
  id: number;
  verse_key: string;
  text_uthmani: string;
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
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReciter, setSelectedReciter] = useState(7); // Default Mishary
  
  // Audio State & Hook
  const [activeQuarter, setActiveQuarter] = useState<number | null>(null);
  const [quarterRange, setQuarterRange] = useState<{ start: string; end: string } | null>(null);
  
  const { 
    playingAyahKey, 
    isPlaying, 
    play, 
    pause, 
    settings, 
    setSettings 
  } = useQuranAudio({ ayahs, range: quarterRange });

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isMemorizeMode, setIsMemorizeMode] = useState(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  useEffect(() => {
    fetchJuzData();
    
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
      pause();
    };
  }, [id, selectedReciter]);

  // Handle Hash Scroll on Load
  useEffect(() => {
    if (!loading && ayahs.length > 0) {
      const hash = window.location.hash;
      if (hash) {
        // Wait a bit for rendering
        setTimeout(() => {
          const id = hash.replace('#', '');
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Optional: Highlight effect
            element.classList.add('ring-2', 'ring-emerald-500');
            setTimeout(() => element.classList.remove('ring-2', 'ring-emerald-500'), 2000);
          }
        }, 500);
      }
    }
  }, [loading, ayahs]);

  async function fetchJuzData() {
    try {
      setLoading(true);
      setError(null);
      
      const reciter = RECITERS.find(r => r.id === selectedReciter);
      const isCustomReciter = !!reciter?.urlPrefix;

      // Parallel fetch: Verses and Audio (only if not custom)
      const promises: Promise<any>[] = [
        fetch(`https://api.quran.com/api/v4/verses/by_juz/${id}?language=en&words=false&translations=20&fields=text_uthmani&per_page=1000&mushaf=6`)
      ];

      if (!isCustomReciter) {
        promises.push(fetch(`https://api.quran.com/api/v4/recitations/${selectedReciter}/by_juz/${id}?per_page=1000`));
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
        const mergedAyahs = versesData.verses.map((verse: any) => {
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
        
        setAyahs(mergedAyahs);
      }
    } catch (err: any) {
      console.error('Error fetching Juz:', err);
      setError(err.message || 'Failed to load Juz.');
    } finally {
      setLoading(false);
    }
  }

  const juzKey = `juz_${id}`;
  // @ts-ignore
  const currentJuzQuarters = juzQuartersData[juzKey] || {};
  const quarterKeys = Object.keys(currentJuzQuarters)
    .filter(k => k.startsWith('quarter_'))
    .sort((a, b) => {
        const numA = parseInt(a.split('_')[1]);
        const numB = parseInt(b.split('_')[1]);
        return numA - numB;
    });

  const quarterLabels = quarterKeys.length > 0 ? quarterKeys.map(key => {
    const num = parseInt(key.split('_')[1]);
    return { id: num, label: `Quarter ${num}`, short: `Q${num}` };
  }) : [
    { id: 1, label: "Quarter 1", short: "Q1" },
    { id: 2, label: "Quarter 2", short: "Q2" },
    { id: 3, label: "Quarter 3", short: "Q3" },
    { id: 4, label: "Quarter 4", short: "Q4" },
  ];

  // Helper to cycle repeat modes
  const cycleRepeatMode = () => {
    const modes = [1, 3, 5, Infinity];
    const currentIndex = modes.indexOf(settings.repeatCount);
    const nextIndex = (currentIndex + 1) % modes.length;
    setSettings(prev => ({ ...prev, repeatCount: modes[nextIndex] }));
  };

  const getRepeatLabel = () => {
      if (settings.repeatCount === Infinity) return "Loop";
      if (settings.repeatCount === 1) return "Off";
      return `${settings.repeatCount}x`;
  };

  const handleQuarterSelect = (q: number) => {
    const juzKey = `juz_${id}`;
    // @ts-ignore
    const quarterData = juzQuartersData[juzKey]?.[`quarter_${q}`] as QuarterData;
    
    if (!quarterData) {
        alert("Quarter data not available for this Juz yet.");
        return;
    }

    const startKey = `${quarterData.start[0]}:${quarterData.start[1]}`;
    const endKey = `${quarterData.end[0]}:${quarterData.end[1]}`;

    // Verify if start ayah exists in current list
    const startIndex = ayahs.findIndex(a => a.verse_key === startKey);
    if (startIndex === -1) {
        console.error(`Start ayah ${startKey} not found in loaded verses (Total: ${ayahs.length})`);
        alert(`Cannot play Quarter ${q}: Start ayah ${startKey} not found. Please try refreshing.`);
        return;
    }

    setActiveQuarter(q);
    setQuarterRange({ start: startKey, end: endKey });
    
    // Start playing
    play(startKey);

    // Scroll to start ayah
    setTimeout(() => {
        const element = document.getElementById(`verse-${startKey}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
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
        
        {/* Header & Controls */}
        <div className="mb-8 md:mb-12 space-y-6">
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
                
                {/* Quarter Selector UI */}
                <div className="flex flex-col items-center gap-4 mt-8">
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3" dir="ltr">
              {quarterLabels.map((q) => (
                <button
                            key={q.id}
                            onClick={() => handleQuarterSelect(q.id)}
                            className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${
                            activeQuarter === q.id
                                ? 'bg-emerald-600 text-white shadow-md scale-105'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-500 hover:text-emerald-600'
                            }`}
                        >
                            {q.label}
                        </button>
                        ))}
                        {activeQuarter && (
                        <button
                            onClick={() => {
                                setActiveQuarter(null);
                                setQuarterRange(null);
                                pause();
                            }}
                            className="px-4 py-1 rounded-lg text-xs font-bold text-slate-400 border border-slate-200 hover:bg-slate-50 hover:text-slate-600 transition-all"
                        >
                            Clear Selection
                        </button>
                    )}
                </div>
                {activeQuarter && (
                    <p className="mt-2 text-sm text-emerald-600 font-medium animate-pulse">
                        Playing Quarter {activeQuarter}...
                    </p>
                )}
                </div>
            </div>
        </div>

        {/* Verses List */}
        <div className="space-y-4 md:space-y-8">
          {ayahs.map((ayah) => {
             const isCurrentAyah = playingAyahKey === ayah.verse_key;
             const inQuarter = activeQuarter && quarterRange 
                // Simple logic: if we are playing a quarter, highlight the active range?
                // For now, just highlight playing ayah
                ? false 
                : false;

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