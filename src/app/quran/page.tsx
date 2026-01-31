'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Search, BookOpen } from 'lucide-react';

type Surah = {
  id: number;
  number?: number;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  revelation_place: string;
};

export default function QuranPage() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSurahs();
  }, []);

  async function fetchSurahs() {
    try {
      setLoading(true);
      // Try fetching from DB first
      const { data, error } = await supabase
        .from('surahs')
        .select('*')
        .order('number');

      if (data && data.length > 0) {
        setSurahs(data);
      } else {
        // Fallback: Fetch from API if DB is empty (temporary for demo/seeding)
        const res = await fetch('https://api.quran.com/api/v4/chapters');
        const apiData = await res.json();
        if (apiData.chapters) {
          setSurahs(apiData.chapters);
        }
      }
    } catch (error) {
      console.error('Error fetching surahs:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredSurahs = surahs.filter(surah => {
    const id = surah.id || surah.number;
    return (
      surah.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (id && id.toString().includes(searchQuery))
    );
  });

  return (
    <div className="w-full min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 text-white relative overflow-hidden shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
            <BookOpen className="w-96 h-96" />
          </div>
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 md:mb-6 drop-shadow-sm">Al-Qur'an al-Kareem</h1>
            <p className="text-emerald-50 text-base sm:text-lg md:text-xl font-medium max-w-2xl mb-6 md:mb-10 leading-relaxed">
            Read, study, and listen to the Holy Quran. Browse all 114 Surahs with translation and tafseer.
          </p>
          
          <div className="relative max-w-xl">
              <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
                <Search className="h-5 sm:h-6 w-5 sm:w-6 text-emerald-700" />
            </div>
              <input
                type="text"
                className="block w-full pl-12 sm:pl-14 pr-4 sm:pr-5 py-3 sm:py-5 rounded-2xl border-0 text-slate-900 placeholder-slate-500 focus:ring-4 focus:ring-emerald-300 shadow-xl text-base sm:text-lg font-medium"
              placeholder="Search by Surah name (e.g. Yaseen) or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="mt-6">
             <Link 
               href="/quran/juz"
               className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold backdrop-blur-sm transition-all border border-white/30"
             >
               <BookOpen className="w-5 h-5" />
               Browse by Juz (30 Parts)
             </Link>
          </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredSurahs.map((surah) => {
            // Ensure we have a valid ID
            const targetId = surah.number || surah.id;
            if (!targetId) return null; // Skip invalid data

            return (
              <Link 
                key={targetId} 
                href={`/quran/${targetId}`}
                prefetch={false}
                className="group bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 hover:border-emerald-500 hover:shadow-lg transition-all duration-200 flex flex-col sm:flex-row sm:justify-between sm:items-center relative overflow-hidden active:scale-95 sm:active:scale-100"
              >
                <div className="absolute right-0 top-0 w-28 h-28 bg-emerald-50 rounded-bl-full -mr-14 -mt-14 opacity-0 group-hover:opacity-60 transition-opacity" />
                
                <div className="flex items-start sm:items-center gap-3 sm:gap-5 relative z-10">
                  <div className="w-12 sm:w-14 h-12 sm:h-14 bg-slate-50 rounded-2xl rotate-3 flex items-center justify-center font-bold text-base sm:text-lg text-slate-500 border-2 border-slate-100 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 group-hover:rotate-6 transition-all shadow-sm flex-shrink-0">
                    {targetId}
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {surah.name_simple}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium group-hover:text-emerald-600/70 transition-colors">
                      {surah.name_arabic} • {surah.verses_count} Ayahs
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
    </div>
  );
}
