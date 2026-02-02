'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Play, Pause, Copy, Bookmark, Share2, Info, X, Headphones, ChevronLeft, Repeat, Eye, EyeOff, ScrollText } from 'lucide-react';
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

type SurahInfo = {
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  bismillah_pre: boolean;
  revelation_place: string;
};

export default function SurahClient({ surahId }: { surahId: string }) {
  
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [surahInfo, setSurahInfo] = useState<SurahInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReciter, setSelectedReciter] = useState(7);
  const [isMemorizeMode, setIsMemorizeMode] = useState(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const { 
    playingAyahKey, 
    isPlaying, 
    play, 
    pause, 
    settings, 
    setSettings 
  } = useQuranAudio({ ayahs });

  // Tafseer State
  const [selectedAyahForTafseer, setSelectedAyahForTafseer] = useState<string | null>(null);
  const [selectedTafsirId, setSelectedTafsirId] = useState<number>(168); // Default to Ma'arif al-Qur'an
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirContent, setTafsirContent] = useState('');

  useEffect(() => {
    if (surahId) {
      fetchSurahData();
    }
    return () => {
        pause();
    };
  }, [surahId, selectedReciter]);

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

  async function fetchSurahData() {
    try {
      setLoading(true);
      setError(null);
      
      // 1. Fetch Surah Info
      const infoRes = await fetch(`https://api.quran.com/api/v4/chapters/${surahId}`);
      if (!infoRes.ok) {
        if (infoRes.status === 404) throw new Error('Surah not found.');
        throw new Error('Failed to fetch surah info');
      }
      const infoData = await infoRes.json();
      setSurahInfo(infoData.chapter);

      const reciter = RECITERS.find(r => r.id === selectedReciter);
      const isCustomReciter = !!reciter?.urlPrefix;

      // 2. Parallel Fetch: Verses and Audio (only if not custom)
      const promises: Promise<any>[] = [
        fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahId}?language=en&words=false&translations=20&fields=text_uthmani&per_page=300`)
      ];

      if (!isCustomReciter) {
          promises.push(fetch(`https://api.quran.com/api/v4/recitations/${selectedReciter}/by_chapter/${surahId}?per_page=300`));
      }

      const responses = await Promise.all(promises);
      const versesRes = responses[0];
      const audioRes = !isCustomReciter ? responses[1] : null;

      if (!versesRes.ok) {
        if (versesRes.status === 404) throw new Error('Verses not found.');
        throw new Error('Failed to fetch verses');
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
      
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
          <Link href="/quran" className="flex items-center justify-center sm:justify-start text-slate-500 hover:text-emerald-600 transition-colors py-2 sm:py-0">
            <ChevronLeft className="w-5 h-5 mr-1" />
            <span className="font-medium">Back to Index</span>
          </Link>

          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-full sm:w-auto">
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
        {ayahs.map((ayah) => (
          <div key={ayah.id} className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-lg transition-all duration-300">
            
            <div className="p-4 sm:p-6 md:p-8 lg:p-10 space-y-4 md:space-y-8">
              {/* Arabic */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-6">
                 <div className="flex-shrink-0 w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold text-sm sm:text-base border border-slate-200">
                    {ayah.verse_key.split(':')[1]}
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

            {/* Actions Bar */}
            <div className="flex items-center gap-2 border-t border-slate-100 pt-4 mt-4 sm:pt-6 sm:mt-6">
               <button 
                 onClick={() => play(ayah.verse_key)}
                 className={`p-2 sm:p-2.5 rounded-xl transition-colors ${playingAyahKey === ayah.verse_key && isPlaying ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-emerald-100 hover:text-emerald-800'}`} 
                 title={playingAyahKey === ayah.verse_key && isPlaying ? "Pause" : "Play"}
               >
                  {playingAyahKey === ayah.verse_key && isPlaying ? <Pause className="w-4 sm:w-5 h-4 sm:h-5" /> : <Play className="w-4 sm:w-5 h-4 sm:h-5" />}
               </button>
               <button 
                 onClick={() => {
                     setSettings(s => ({ ...s, repeatCount: Infinity }));
                     play(ayah.verse_key);
                 }}
                 className={`p-2 sm:p-2.5 rounded-xl hover:bg-emerald-100 hover:text-emerald-800 transition-colors ${playingAyahKey === ayah.verse_key && settings.repeatCount === Infinity ? 'text-emerald-700 bg-emerald-100 ring-1 ring-emerald-500' : 'text-slate-500'}`} 
                 title="Loop This Ayah"
               >
                  <Repeat className="w-4 sm:w-5 h-4 sm:h-5" />
               </button>
               <button className="p-2 sm:p-2.5 text-slate-500 hover:text-emerald-800 hover:bg-emerald-100 rounded-xl transition-colors" title="Copy Text">
                  <Copy className="w-4 sm:w-5 h-4 sm:h-5" />
               </button>
               <button 
                  onClick={() => toggleBookmark('surah', surahId, ayah.verse_key)}
                  className={`p-2 sm:p-2.5 rounded-xl hover:bg-amber-100 hover:text-amber-800 transition-colors ${isBookmarked(ayah.verse_key) ? 'text-amber-600 bg-amber-50' : 'text-slate-500'}`}
                  title="Bookmark"
               >
                  <Bookmark className={`w-4 sm:w-5 h-4 sm:h-5 ${isBookmarked(ayah.verse_key) ? 'fill-current' : ''}`} />
               </button>
               <button 
                  onClick={() => openTafseer(ayah.verse_key)}
                  className="p-2 sm:p-2.5 text-slate-500 hover:text-emerald-800 hover:bg-emerald-100 rounded-xl transition-colors" 
                  title="View Tafseer"
               >
                  <Info className="w-4 sm:w-5 h-4 sm:h-5" />
               </button>
            </div>

          </div>
        ))}
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
    </div>
    </div>
  );
}
