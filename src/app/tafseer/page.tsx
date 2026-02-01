'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { FileText, BookOpen, ChevronRight, ChevronLeft, Search } from 'lucide-react';

type Surah = {
  id: number;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
};

type TafseerOption = {
  id: number;
  name: string;
  description: string;
};

const TAFSEER_OPTIONS: TafseerOption[] = [
  // English
  { id: 169, name: "Ibn Kathir (Abridged)", description: "Classic Exegesis (English)" },
  { id: 168, name: "Ma'arif al-Qur'an", description: "By Mufti Muhammad Shafi (English)" },
  { id: 817, name: "Tazkirul Quran", description: "By Maulana Wahiduddin Khan (English)" },
  
  // Urdu
  { id: 159, name: "Bayan ul Quran", description: "By Dr. Israr Ahmad (Urdu)" },
  { id: 160, name: "Tafsir Ibn Kathir", description: "Urdu Translation" },
  { id: 157, name: "Fi Zilal al-Quran", description: "In the Shade of the Quran (Urdu)" },
  { id: 818, name: "Tazkir ul Quran", description: "By Maulana Wahiduddin Khan (Urdu)" },

  // Arabic
  { id: 16, name: "Tafsir Muyassar", description: "Simplified Arabic Commentary" },
  { id: 14, name: "Tafsir Ibn Kathir", description: "Original Arabic" },
  { id: 15, name: "Tafsir al-Tabari", description: "Classical Arabic Exegesis" },
  { id: 90, name: "Al-Qurtubi", description: "Al-Jami' li-Ahkam al-Qur'an" },
  { id: 91, name: "Al-Sa'di", description: "Taysir al-Karim al-Rahman" },
  { id: 94, name: "Tafseer Al-Baghawi", description: "Ma'alim al-Tanzil" },
];

export default function TafseerPage() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [selectedAyah, setSelectedAyah] = useState<number>(1);
  const [selectedTafseer, setSelectedTafseer] = useState<number>(168);
  
  const [tafseerContent, setTafseerContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [loadingSurahs, setLoadingSurahs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Surahs on Mount
  useEffect(() => {
    async function fetchSurahs() {
      try {
        setLoadingSurahs(true);
        const supabase = getSupabaseClient();
        // Try DB first if Supabase is available
        if (supabase) {
          const { data } = await supabase.from('surahs').select('*').order('number');
          if (data && data.length > 0) {
            setSurahs(data);
            setSelectedSurah(data[0]); // Default to Fatiha
            return;
          }
        }

        // Fallback API
        const res = await fetch('https://api.quran.com/api/v4/chapters');
        const apiData = await res.json();
        if (apiData.chapters) {
          setSurahs(apiData.chapters);
          setSelectedSurah(apiData.chapters[0]);
        }
      } catch (e) {
        console.error("Error fetching surahs", e);
      } finally {
        setLoadingSurahs(false);
      }
    }
    fetchSurahs();
  }, []);

  // Fetch Tafseer when selection changes
  useEffect(() => {
    if (selectedSurah) {
      fetchTafseerContent();
    }
  }, [selectedSurah, selectedAyah, selectedTafseer]);

  async function fetchTafseerContent() {
    if (!selectedSurah) return;
    
    try {
      setLoadingContent(true);
      setTafseerContent('');
      
      const verseKey = `${selectedSurah.id}:${selectedAyah}`;
      // Direct API call
      const res = await fetch(`https://api.quran.com/api/v4/tafsirs/${selectedTafseer}/by_ayah/${verseKey}`);
      
      if (!res.ok) throw new Error("Failed to fetch");
      
      const data = await res.json();
      if (data.tafsir && data.tafsir.text) {
        setTafseerContent(data.tafsir.text);
      } else {
        setTafseerContent('');
      }
    } catch (error) {
      console.error(error);
      setTafseerContent('');
    } finally {
      setLoadingContent(false);
    }
  }

  const handleNextAyah = () => {
    if (selectedSurah && selectedAyah < selectedSurah.verses_count) {
      setSelectedAyah(prev => prev + 1);
    }
  };

  const handlePrevAyah = () => {
    if (selectedAyah > 1) {
      setSelectedAyah(prev => prev - 1);
    }
  };

  const filteredSurahs = surahs.filter(s => 
    s.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.id.toString().includes(searchQuery)
  );

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      
      {/* Sidebar - Surah List */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-slate-100">
           <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
             <BookOpen className="w-5 h-5 text-emerald-600" /> Surahs
           </h2>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input 
               type="text" 
               placeholder="Search Surah..." 
               className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
             />
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
           {loadingSurahs ? (
             <div className="p-4 text-center text-slate-400">Loading...</div>
           ) : (
             <div className="divide-y divide-slate-50">
               {filteredSurahs.map(surah => (
                 <button
                   key={surah.id}
                   onClick={() => { setSelectedSurah(surah); setSelectedAyah(1); }}
                   className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors ${selectedSurah?.id === surah.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''}`}
                 >
                   <div className="flex items-center gap-3">
                     <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${selectedSurah?.id === surah.id ? 'bg-emerald-200 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                       {surah.id}
                     </span>
                     <div>
                       <p className={`text-sm font-semibold ${selectedSurah?.id === surah.id ? 'text-emerald-900' : 'text-slate-700'}`}>{surah.name_simple}</p>
                       <p className="text-xs text-slate-400">{surah.verses_count} Ayahs</p>
                     </div>
                   </div>
                   <span className="font-arabic text-lg text-slate-400 opacity-50">{surah.name_arabic}</span>
                 </button>
               ))}
             </div>
           )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Bar */}
        <div className="h-auto bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 py-3 md:py-0 shadow-sm z-10">
           
           <div className="flex items-center gap-4 flex-wrap">
              <div className="md:hidden">
                 <select 
                    className="max-w-[150px] p-2 border border-slate-200 rounded-lg text-sm font-bold"
                    onChange={(e) => {
                       const s = surahs.find(s => s.id === parseInt(e.target.value));
                       if(s) { setSelectedSurah(s); setSelectedAyah(1); }
                    }}
                    value={selectedSurah?.id}
                 >
                    {surahs.map(s => <option key={s.id} value={s.id}>{s.id}. {s.name_simple}</option>)}
                 </select>
              </div>

              {/* Ayah Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-500">Ayah:</span>
                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                   <button 
                     onClick={handlePrevAyah} 
                     disabled={selectedAyah <= 1}
                     className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                   >
                     <ChevronLeft className="w-4 h-4" />
                   </button>
                   <select 
                     value={selectedAyah} 
                     onChange={(e) => setSelectedAyah(parseInt(e.target.value))}
                     className="bg-transparent border-none text-sm font-bold w-16 text-center focus:ring-0 cursor-pointer"
                   >
                     {selectedSurah && Array.from({ length: selectedSurah.verses_count }, (_, i) => i + 1).map(num => (
                       <option key={num} value={num}>{num}</option>
                     ))}
                   </select>
                   <button 
                     onClick={handleNextAyah} 
                     disabled={!selectedSurah || selectedAyah >= selectedSurah.verses_count}
                     className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                   >
                     <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
              </div>

              <div className="md:hidden w-full sm:w-auto">
                <select
                  value={selectedTafseer}
                  onChange={(e) => setSelectedTafseer(parseInt(e.target.value))}
                  className="mt-2 sm:mt-0 p-2 border border-slate-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-emerald-500 outline-none w-full"
                >
                  {TAFSEER_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
           </div>

           <div className="hidden md:flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-500">Tafseer Source:</span>
              <select 
                 value={selectedTafseer}
                 onChange={(e) => setSelectedTafseer(parseInt(e.target.value))}
                 className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-emerald-500 outline-none min-w-[200px]"
              >
                 {TAFSEER_OPTIONS.map(opt => (
                   <option key={opt.id} value={opt.id}>{opt.name}</option>
                 ))}
              </select>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50/50">
           <div className="max-w-4xl mx-auto">
              
              {/* Header Info */}
              <div className="text-center mb-10">
                 <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
                   Surah {selectedSurah?.name_simple}
                 </h1>
                 <p className="text-slate-500 font-medium">
                   Ayah {selectedAyah} • {TAFSEER_OPTIONS.find(t => t.id === selectedTafseer)?.name}
                 </p>
              </div>

              {/* Tafseer Text */}
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200 min-h-[400px]">
                 {loadingContent ? (
                   <div className="flex flex-col items-center justify-center h-64 gap-4">
                     <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                     <p className="text-slate-400 font-medium">Loading Tafseer...</p>
                   </div>
                 ) : (
                   <div className="text-lg md:text-xl text-slate-800 font-medium leading-[2] [&_p]:mb-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2">
                     {tafseerContent ? (
                       <div dangerouslySetInnerHTML={{ __html: tafseerContent }} />
                     ) : (
                       <div className="text-center py-20">
                          <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                          <p className="text-slate-400 text-lg">No Tafseer available for this Ayah in the selected book.</p>
                       </div>
                     )}
                   </div>
                 )}
              </div>

              {/* Navigation Footer */}
              <div className="flex justify-between mt-8">
                 <button 
                   onClick={handlePrevAyah}
                   disabled={selectedAyah <= 1}
                   className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-all shadow-sm"
                 >
                   <ChevronLeft className="w-5 h-5" /> Previous Ayah
                 </button>
                 <button 
                   onClick={handleNextAyah}
                   disabled={!selectedSurah || selectedAyah >= selectedSurah.verses_count}
                   className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-all shadow-sm"
                 >
                   Next Ayah <ChevronRight className="w-5 h-5" />
                 </button>
              </div>

           </div>
        </div>

      </div>
    </div>
  );
}
