'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { BookOpen, Search, Star, Clock, ChevronRight, Trophy } from 'lucide-react';

type Surah = {
  id: number;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  revelation_place: string;
  translated_name: {
    name: string;
    language_name: string;
  };
};

type SearchVerse = {
  verse_key: string;
  verse_id: number;
  text: string;
  translations: {
    text: string;
    language_name: string;
  }[];
};

export default function QuranPage() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRead, setLastRead] = useState<{surahId: number, name: string} | null>(null);

  // Verse Search State
  const [searchVerses, setSearchVerses] = useState<SearchVerse[]>([]);
  const [isSearchingVerses, setIsSearchingVerses] = useState(false);

  useEffect(() => {
    fetchSurahs();
    // Check local storage for last read
    const saved = localStorage.getItem('lastReadSurah');
    if (saved) {
      setLastRead(JSON.parse(saved));
    }
  }, []);

  async function fetchSurahs() {
    try {
      setLoading(true);
      // Fetch from Quran.com API for comprehensive data including translations
      const res = await fetch('https://api.quran.com/api/v4/chapters?language=en');
      const apiData = await res.json();
      if (apiData.chapters) {
        setSurahs(apiData.chapters);
      }
    } catch (error) {
      console.error('Error fetching surahs:', error);
    } finally {
      setLoading(false);
    }
  }

  // Debounced search for verses
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchVerses([]);
      setIsSearchingVerses(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingVerses(true);
      try {
        const res = await fetch(`https://api.quran.com/api/v4/search?q=${encodeURIComponent(q)}&size=20&page=1&language=en`);
        const data = await res.json();
        if (data.search && data.search.results) {
          setSearchVerses(data.search.results);
        } else {
          setSearchVerses([]);
        }
      } catch (error) {
        console.error('Error searching verses:', error);
        setSearchVerses([]);
      } finally {
        setIsSearchingVerses(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredSurahs = surahs.filter(surah => 
    surah.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surah.name_arabic.includes(searchQuery) ||
    surah.translated_name.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surah.id.toString().includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Hero Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium mb-4">
                <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                <span>The Noble Qur'an</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4 leading-tight">
                Read, Recite, <br/>
                <span className="text-emerald-600">and Reflect</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-xl mb-8 leading-relaxed">
                Explore the divine words with translation, tafseer, and audio recitation.
              </p>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                {lastRead && (
                  <Link 
                    href={`/quran/${lastRead.surahId}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <Clock className="w-4 h-4" />
                    Continue: {lastRead.name}
                  </Link>
                )}
                <Link 
                  href="/quran/juz"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  Browse by Juz
                </Link>
                <Link
                  href="/tracker"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  <Trophy className="w-4 h-4 text-amber-600" />
                  Tracker
                </Link>
              </div>
            </div>

            {/* Decorative Islamic Pattern or Icon */}
            <div className="relative hidden md:block">
              <div className="absolute inset-0 bg-emerald-100 rounded-full blur-3xl opacity-30"></div>
              <BookOpen className="w-64 h-64 text-emerald-600/20 relative z-10" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Search Bar */}
        <div className="sticky top-0 pt-2 bg-slate-50/80 backdrop-blur supports-[backdrop-filter]:bg-slate-50/60 z-30">
          <div className="relative w-full md:max-w-2xl mx-auto mt-2 mb-6 md:mb-12 shadow-xl rounded-2xl bg-white p-2">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by Surah name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 md:py-4 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder:text-slate-400 text-base sm:text-lg bg-transparent"
            />
          </div>
        </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSurahs.map((surah) => (
              <Link 
                key={surah.id} 
                href={`/quran/${surah.id}`}
                className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-500 hover:shadow-md transition-all duration-200 relative overflow-hidden"
              >
                {/* Gold Accent for numbering */}
                <div className="absolute top-0 right-0 p-4 opacity-10 font-serif text-6xl font-bold text-emerald-800 pointer-events-none select-none">
                  {surah.id}
                </div>

                <div className="flex items-start gap-4">
                  {/* Number Badge */}
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center font-serif font-bold text-slate-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-colors">
                    {surah.id}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {surah.name_simple}
                      </h3>
                      <span className="font-amiri text-xl text-emerald-800 leading-none">
                        {surah.name_arabic}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-500 mb-3">
                      {surah.translated_name.name}
                    </p>

                    <div className="flex items-center gap-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        {surah.revelation_place}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span>{surah.verses_count} Ayahs</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            
            {filteredSurahs.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">
                <p>No Surahs found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}

        {/* Verses Search Results */}
        {searchQuery.trim() !== '' && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Search className="w-6 h-6 text-emerald-600" />
              Ayahs matching "{searchQuery}"
            </h2>
            
            {isSearchingVerses ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : searchVerses.length > 0 ? (
              <div className="space-y-4">
                {searchVerses.map((verse) => {
                  const [surahId, verseNum] = verse.verse_key.split(':');
                  const translation = verse.translations.find(t => t.language_name === 'english')?.text || '';
                  
                  return (
                    <Link
                      key={verse.verse_key}
                      href={`/quran/${surahId}?verse=${verseNum}`}
                      className="block bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-500 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">
                          Surah {surahId}, Ayah {verseNum}
                        </span>
                        {verse.text && (
                          <span className="font-amiri text-2xl text-slate-800 text-right leading-loose" dangerouslySetInnerHTML={{ __html: verse.text }} />
                        )}
                      </div>
                      {translation && (
                        <p className="text-slate-600 leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: translation }} />
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                No verses found matching your search.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
