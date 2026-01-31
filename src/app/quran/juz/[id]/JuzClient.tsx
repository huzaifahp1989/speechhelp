'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Play, Pause, X, ArrowUp, ChevronLeft, Headphones } from 'lucide-react';
import juzQuartersData from '@/data/juz-quarters.json';
import QuranNavigation from '@/components/QuranNavigation';

const RECITERS = [
  { id: 7, name: 'Mishary Rashid Alafasy' },
  { id: 3, name: 'Abdur-Rahman as-Sudais' },
  { id: 2, name: 'AbdulBaset AbdulSamad (Murattal)' },
  { id: 4, name: 'Abu Bakr al-Shatri' },
  { id: 5, name: 'Hani ar-Rifai' },
  { id: 6, name: 'Mahmoud Khalil Al-Husary' },
  { id: 9, name: 'Mohamed Siddiq al-Minshawi (Murattal)' },
  { id: 10, name: 'Saud Al-Shuraim' },
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
    quarter_1: QuarterData;
    quarter_2: QuarterData;
    quarter_3: QuarterData;
    quarter_4: QuarterData;
  };
};

export default function JuzClient({ id }: { id: string }) {
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReciter, setSelectedReciter] = useState(7); // Default Mishary
  
  // Audio State
  const [playingAudio, setPlayingAudio] = useState<string | null>(null); // verse_key
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeQuarter, setActiveQuarter] = useState<number | null>(null);
  const [quarterRange, setQuarterRange] = useState<{ start: string; end: string } | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

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
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [id, selectedReciter]);

  async function fetchJuzData() {
    try {
      setLoading(true);
      setError(null);
      
      // Parallel fetch: Verses and Audio
      const [versesRes, audioRes] = await Promise.all([
        fetch(`https://api.quran.com/api/v4/verses/by_juz/${id}?language=en&words=false&translations=20&fields=text_uthmani&per_page=1000&mushaf=6`),
        fetch(`https://api.quran.com/api/v4/recitations/${selectedReciter}/by_juz/${id}?per_page=1000`)
      ]);
      
      if (!versesRes.ok) {
        throw new Error(`Failed to fetch verses: ${versesRes.status} ${versesRes.statusText}`);
      }
      
      const versesData = await versesRes.json();
      let audioMap = new Map();

      if (audioRes.ok) {
        try {
            const audioData = await audioRes.json();
            if (audioData.audio_files) {
                audioMap = new Map(audioData.audio_files.map((a: any) => [a.verse_key, a.url]));
            }
        } catch (e) {
            console.warn("Failed to parse audio data", e);
        }
      } else {
        console.warn(`Audio fetch failed: ${audioRes.status} ${audioRes.statusText}`);
        // We continue without audio if audio fetch fails
      }
      
      if (versesData.verses) {
        // Merge audio URL into verses
        const mergedAyahs = versesData.verses.map((verse: any) => ({
            ...verse,
            audio: {
                url: audioMap.get(verse.verse_key) || ''
            }
        }));
        
        setAyahs(mergedAyahs);
      }
    } catch (err: any) {
      console.error('Error fetching Juz:', err);
      setError(err.message || 'Failed to load Juz.');
    } finally {
      setLoading(false);
    }
  }

  const QUARTER_LABELS = [
    { id: 1, label: "Quarter 1", short: "Q1" },
    { id: 2, label: "Quarter 2", short: "Q2" },
    { id: 3, label: "Quarter 3", short: "Q3" },
    { id: 4, label: "Quarter 4", short: "Q4" },
  ];

  // Handle Audio Playback
  const playAudio = (verseKey: string, autoContinue = false) => {
    // Check quarter boundaries if auto-playing
    if (!autoContinue && activeQuarter && quarterRange) {
        // If manual click, we allow it, but maybe we should check if it's inside?
        // User didn't specify strict locking, so we allow manual play anywhere.
        // But if auto-continue, we MUST stop at end of quarter.
    }

    if (playingAudio === verseKey && audioRef.current && !autoContinue) {
      // Toggle pause if clicking same ayah
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
        setPlayingAudio(null);
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const ayah = ayahs.find((a) => a.verse_key === verseKey);
    if (!ayah || !ayah.audio?.url) return;

    // Construct URL
    const audioUrl = ayah.audio.url.startsWith('http') 
        ? ayah.audio.url 
        : `https://verses.quran.com/${ayah.audio.url}`;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingAudio(verseKey);
    
    audio.play().catch(e => console.error("Audio play error", e));
    
    audio.onended = () => {
       // Check for next ayah logic
       if (activeQuarter && quarterRange) {
           if (verseKey === quarterRange.end) {
               // Stop at end of quarter
               setPlayingAudio(null);
               return;
           }
       }
       // Auto continue to next ayah
       playNextInQuarter(verseKey, quarterRange ? quarterRange.end : ayahs[ayahs.length - 1].verse_key);
    };
  };

  const playNextInQuarter = (currentKey: string, endKey: string) => {
    if (currentKey === endKey) {
        setPlayingAudio(null);
        return;
    }

    const currentIndex = ayahs.findIndex(a => a.verse_key === currentKey);
    if (currentIndex === -1 || currentIndex === ayahs.length - 1) {
        setPlayingAudio(null);
        return;
    }

    const nextAyah = ayahs[currentIndex + 1];
    playAudio(nextAyah.verse_key, true);
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
    playAudio(startKey, true);

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

                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-full sm:w-auto">
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
                        {QUARTER_LABELS.map((q) => (
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
                                setPlayingAudio(null);
                                if (audioRef.current) audioRef.current.pause();
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
             const isPlaying = playingAudio === ayah.verse_key;
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
                  playAudio(ayah.verse_key);
                }}
                className={`cursor-pointer rounded-2xl md:rounded-3xl shadow-sm border overflow-hidden group transition-all duration-300 ${
                    isPlaying 
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
                                playAudio(ayah.verse_key);
                            }}
                            className={`w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center rounded-full transition-colors ${
                                isPlaying ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'
                            }`}
                         >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                         </button>
                     </div>
                     <p className="text-right font-arabic text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-[1.8] md:leading-[2.4] text-slate-900 w-full drop-shadow-sm" dir="rtl">
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