'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowRight, Loader2 } from 'lucide-react';

// Types
interface ApiSearchResult {
  verse_key: string;
  text: string;
  [key: string]: unknown;
}

type SearchResult = {
  key: string;
  text: string;
  source: string; // 'Quran' | 'Hadith' | 'Seerah' | 'Tafseer'
  subtext?: string;
  href: string;
};

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<'All' | 'Quran' | 'Hadith' | 'Tafseer' | 'Seerah'>('All');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [quranPage, setQuranPage] = useState(1);
  const [quranHasMore, setQuranHasMore] = useState(true);
  const QURAN_PAGE_SIZE = 50;

  useEffect(() => {
    if (!query) return;
    
    const fetchResults = async (page = 1, append = false) => {
      setLoading(true);
      let newResults: SearchResult[] = append ? [...results] : [];

      try {
        // 1. Quran Search (paged, bigger size)
        const isArabic = /[\u0600-\u06FF]/.test(query);
        const lang = isArabic ? 'ar' : 'en';
        const quranRes = await fetch(`https://api.quran.com/api/v4/search?q=${encodeURIComponent(query)}&size=${QURAN_PAGE_SIZE}&page=${page}&language=${lang}`);
        const quranData = await quranRes.json();
        
        if (quranData.search && quranData.search.results) {
          const items: ApiSearchResult[] = quranData.search.results;
          items.forEach((item: ApiSearchResult) => {
            const [surahId, ayahNum] = item.verse_key.split(':');
            newResults.push({
              key: `quran-${item.verse_key}`,
              text: item.text,
              subtext: `Surah ${item.verse_key}`,
              source: 'Quran',
              href: `/quran/${surahId}?autoplay=true&startingVerse=${item.verse_key}&t=${Date.now()}#verse-${item.verse_key}`
            });
          });
          // Heuristic hasMore: if returned less than requested size, likely end
          setQuranHasMore(items.length >= QURAN_PAGE_SIZE);
        } else {
          setQuranHasMore(false);
        }

        // 2. Tafseer Search (Using Quran results but pointing to Tafseer)
        // We can just reuse the Quran matches for Tafseer for now
        if (quranData.search && quranData.search.results) {
            (quranData.search.results as ApiSearchResult[]).forEach((item) => {
              const [surahId, ayahNum] = item.verse_key.split(':');
              newResults.push({
                key: `tafseer-${item.verse_key}`,
                text: `Tafseer for ${item.verse_key}`,
                subtext: item.text, // Preview of verse
                source: 'Tafseer',
                href: `/tafseer?surah=${surahId}&ayah=${ayahNum}`
              });
            });
        }

        // 3. Hadith Search (Mock/Link to books)
        // Since we can't search all Hadith text easily, we point to books
        const hadithBooks = [
            { id: 'bukhari', name: 'Sahih al-Bukhari' },
            { id: 'muslim', name: 'Sahih Muslim' },
            { id: 'abudawud', name: 'Sunan Abu Dawud' },
            { id: 'tirmidhi', name: 'Jami` at-Tirmidhi' },
            { id: 'nasai', name: 'Sunan an-Nasa\'i' },
            { id: 'ibnmajah', name: 'Sunan Ibn Majah' },
            { id: 'riyadussalihin', name: 'Riyad as-Salihin' },
            { id: 'nawawi', name: '40 Hadith Nawawi' },
            { id: 'adab', name: 'Al-Adab Al-Mufrad' },
        ];
        
        // Search in book names
        hadithBooks.forEach(book => {
            if (book.name.toLowerCase().includes(query.toLowerCase())) {
                newResults.push({
                    key: `book-${book.id}`,
                    text: book.name,
                    subtext: 'Hadith Collection',
                    source: 'Hadith',
                    href: `/hadith/${book.id}`
                });
            }
        });
        
        // Add a generic "Search inside..." result for top books
        if (query.length > 2) {
             newResults.push({
                key: 'search-bukhari',
                text: `Search "${query}" in Sahih al-Bukhari`,
                source: 'Hadith',
                href: `/hadith/bukhari?q=${encodeURIComponent(query)}`
             });
             newResults.push({
                key: 'search-muslim',
                text: `Search "${query}" in Sahih Muslim`,
                source: 'Hadith',
                href: `/hadith/muslim?q=${encodeURIComponent(query)}`
             });
        }

        // 4. Seerah / Topics
        const seerahTopics = [
            'The Blessed Birth', 'Marriage to Khadijah', 'The First Revelation', 
            'Public Preaching', 'Year of Sorrow', 'Isra and Mi\'raj', 
            'Hijrah to Madinah', 'Battle of Badr', 'Treaty of Hudaybiyyah', 
            'Conquest of Makkah', 'Farewell Pilgrimage', 'The Departure'
        ];
        
        seerahTopics.forEach(t => {
            if (t.toLowerCase().includes(query.toLowerCase())) {
                 newResults.push({
                    key: `topic-${t}`,
                    text: t,
                    subtext: 'Seerah Topic',
                    source: 'Seerah',
                    href: `/seerah` // Ideally scroll to ID
                 });
            }
        });

      } catch (e) {
        console.error("Search failed", e);
      } finally {
        // Deduplicate by key when appending
        const seen = new Set<string>();
        const deduped = newResults.filter(r => {
          if (seen.has(r.key)) return false;
          seen.add(r.key);
          return true;
        });
        setResults(deduped);
        setLoading(false);
      }
    };

    // Reset paging on query change
    setQuranPage(1);
    setQuranHasMore(true);
    fetchResults(1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const loadMoreQuran = async () => {
    if (!quranHasMore || loading) return;
    const nextPage = quranPage + 1;
    setQuranPage(nextPage);
    // Fetch and append
    // Reuse the same logic as above in a small inline function to avoid dependency reshuffling
    try {
      setLoading(true);
      const isArabic = /[\u0600-\u06FF]/.test(query);
      const lang = isArabic ? 'ar' : 'en';
      const quranRes = await fetch(`https://api.quran.com/api/v4/search?q=${encodeURIComponent(query)}&size=${QURAN_PAGE_SIZE}&page=${nextPage}&language=${lang}`);
      const quranData = await quranRes.json();
      const appendResults: SearchResult[] = [...results];
      if (quranData.search && quranData.search.results) {
        const items: ApiSearchResult[] = quranData.search.results;
        items.forEach((item: ApiSearchResult) => {
          const [surahId, ayahNum] = item.verse_key.split(':');
          appendResults.push({
            key: `quran-${item.verse_key}`,
            text: item.text,
            subtext: `Surah ${item.verse_key}`,
            source: 'Quran',
            href: `/quran/${surahId}?autoplay=true&startingVerse=${item.verse_key}&t=${Date.now()}#verse-${item.verse_key}`
          });
          appendResults.push({
            key: `tafseer-${item.verse_key}`,
            text: `Tafseer for ${item.verse_key}`,
            subtext: item.text,
            source: 'Tafseer',
            href: `/tafseer?surah=${surahId}&ayah=${ayahNum}`
          });
        });
        setQuranHasMore(items.length >= QURAN_PAGE_SIZE);
      } else {
        setQuranHasMore(false);
      }
      const seen = new Set<string>();
      const deduped = appendResults.filter(r => {
        if (seen.has(r.key)) return false;
        seen.add(r.key);
        return true;
      });
      setResults(deduped);
    } catch (e) {
      console.error('Load more failed', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = activeTab === 'All' 
    ? results 
    : results.filter(r => r.source === activeTab);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="space-y-4">
            <h1 className="text-3xl font-bold text-slate-900">Search Results</h1>
            <div className="relative max-w-2xl">
                 <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const q = formData.get('q');
                    if (q) window.location.href = `/search?q=${encodeURIComponent(q.toString())}`;
                 }}>
                    <input 
                        name="q"
                        defaultValue={query}
                        type="text" 
                        className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg"
                        placeholder="Search again..."
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                 </form>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
            {['All', 'Quran', 'Hadith', 'Tafseer', 'Seerah'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as typeof activeTab)}
                    className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
                        activeTab === tab 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>

        {/* Results */}
        <div className="space-y-4">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="mt-4 text-slate-500">Searching sources...</p>
                </div>
            ) : filteredResults.length > 0 ? (
                <>
                  {filteredResults.map((result) => (
                      <Link 
                          key={result.key} 
                          href={result.href}
                          className="block p-6 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow group"
                      >
                          <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                          result.source === 'Quran' ? 'bg-emerald-100 text-emerald-700' :
                                          result.source === 'Hadith' ? 'bg-amber-100 text-amber-700' :
                                          result.source === 'Tafseer' ? 'bg-blue-100 text-blue-700' :
                                          'bg-purple-100 text-purple-700'
                                      }`}>
                                          {result.source}
                                      </span>
                                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                          {result.source === 'Quran' || result.source === 'Tafseer' ? result.subtext : result.text}
                                      </h3>
                                  </div>
                                  <p className="text-slate-600" dangerouslySetInnerHTML={{ __html: result.text }} />
                              </div>
                              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                          </div>
                      </Link>
                  ))}
                  {(activeTab === 'All' || activeTab === 'Quran') && quranHasMore && (
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={loadMoreQuran}
                        disabled={loading}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {loading ? 'Loading…' : 'Load more Quran results'}
                      </button>
                    </div>
                  )}
                </>
            ) : (
                <div className="text-center py-20 text-slate-500">
                    <p className="text-lg">No results found for &quot;{query}&quot;</p>
                    <p className="text-sm">Try checking your spelling or using different keywords.</p>
                </div>
            )}
        </div>
    </div>
  );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center">Loading...</div>}>
            <SearchContent />
        </Suspense>
    );
}
