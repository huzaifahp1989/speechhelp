'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Play, Pause, Copy, Bookmark, Share2, Info, X } from 'lucide-react';

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

export default function SurahPage() {
  const params = useParams();
  const surahId = params.surahId as string;
  
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [surahInfo, setSurahInfo] = useState<SurahInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null); // verse_key
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Tafseer State
  const [selectedAyahForTafseer, setSelectedAyahForTafseer] = useState<string | null>(null);
  const [selectedTafsirId, setSelectedTafsirId] = useState<number>(168); // Default to Ma'arif al-Qur'an
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirContent, setTafsirContent] = useState('');

  useEffect(() => {
    if (surahId) {
      fetchSurahData();
    }
  }, [surahId]);

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

      // 2. Fetch Verses with Translation (131 = Saheeh International) and Audio
      // We need text_uthmani, translations, and audio
      const versesRes = await fetch(
        `https://api.quran.com/api/v4/verses/by_chapter/${surahId}?language=en&words=false&translations=131&fields=text_uthmani&audio=1&per_page=286`
      );
      if (!versesRes.ok) {
        if (versesRes.status === 404) throw new Error('Verses not found.');
        throw new Error('Failed to fetch verses');
      }
      const versesData = await versesRes.json();
      
      if (versesData.verses) {
        setAyahs(versesData.verses);
      }
      
    } catch (error: any) {
      console.error('Error fetching surah:', error);
      setError(error.message || 'Failed to load Surah. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  }

  const playAudio = (url: string, verseKey: string) => {
    if (playingAudio === verseKey && audioElement) {
      audioElement.pause();
      setPlayingAudio(null);
    } else {
      if (audioElement) audioElement.pause();
      const audio = new Audio(`https://verses.quran.com/${url}`);
      audio.play();
      audio.onended = () => setPlayingAudio(null);
      setAudioElement(audio);
      setPlayingAudio(verseKey);
    }
  };

  const openTafseer = (verseKey: string) => {
    setSelectedAyahForTafseer(verseKey);
    fetchTafsir(verseKey, selectedTafsirId);
  };

  async function fetchTafsir(verseKey: string, tafsirId: number) {
    try {
      setTafsirLoading(true);
      setTafsirContent('');
      
      // Use our own proxy API to avoid CORS and ensure stability
      const res = await fetch(`/api/tafsir?tafsirId=${tafsirId}&verseKey=${verseKey}`);
      
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
    <div className="min-h-screen bg-slate-50 w-full">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-12">
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
                 <p className="text-right font-arabic text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-[1.8] md:leading-[2.4] text-slate-900 w-full drop-shadow-sm" dir="rtl">
                    {ayah.text_uthmani}
                 </p>
              </div>
              
              {/* Translation */}
              <div className="text-slate-900 text-base sm:text-lg md:text-xl leading-relaxed md:pl-16 lg:pl-20 font-semibold">
                {ayah.translations?.[0]?.text.replace(/<sup.*?<\/sup>/g, '')}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-slate-50 px-4 sm:px-6 md:px-8 py-3 md:py-4 flex flex-wrap justify-end gap-2 md:gap-3 opacity-100 transition-opacity border-t border-slate-100">
               <button 
                 onClick={() => ayah.audio?.url && playAudio(ayah.audio.url, ayah.verse_key)}
                 className={`p-2 sm:p-2.5 rounded-xl hover:bg-emerald-100 hover:text-emerald-800 transition-colors ${playingAudio === ayah.verse_key ? 'text-emerald-700 bg-emerald-100' : 'text-slate-500'}`} 
                 title="Play Audio"
               >
                  {playingAudio === ayah.verse_key ? <Pause className="w-4 sm:w-5 h-4 sm:h-5" /> : <Play className="w-4 sm:w-5 h-4 sm:h-5" />}
               </button>
               <button className="p-2 sm:p-2.5 text-slate-500 hover:text-emerald-800 hover:bg-emerald-100 rounded-xl transition-colors" title="Copy Text">
                  <Copy className="w-4 sm:w-5 h-4 sm:h-5" />
               </button>
               <button className="p-2 sm:p-2.5 text-slate-500 hover:text-emerald-800 hover:bg-emerald-100 rounded-xl transition-colors" title="Bookmark">
                  <Bookmark className="w-4 sm:w-5 h-4 sm:h-5" />
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
  );
}
