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

  useEffect(() => {
    if (!query) return;
    
    const fetchResults = async () => {
      setLoading(true);
      const newResults: SearchResult[] = [];

      try {
        // 1. Quran Search
        const quranRes = await fetch(`https://api.quran.com/api/v4/search?q=${encodeURIComponent(query)}&size=10&language=en`);
        const quranData = await quranRes.json();
        
        if (quranData.search && quranData.search.results) {
          quranData.search.results.forEach((item: ApiSearchResult) => {
            newResults.push({
              key: `quran-${item.verse_key}`,
              text: item.text,
              subtext: `Surah ${item.verse_key}`,
              source: 'Quran',
              href: `/quran/${item.verse_key.split(':')[0]}?verse=${item.verse_key.split(':')[1]}`
            });
          });
        }

        // 2. Tafseer Search (Using Quran results but pointing to Tafseer)
        // We can just reuse the Quran matches for Tafseer for now
        if (quranData.search && quranData.search.results) {
            quranData.search.results.forEach((item: ApiSearchResult) => {
              newResults.push({
                key: `tafseer-${item.verse_key}`,
                text: `Tafseer for ${item.verse_key}`,
                subtext: item.text, // Preview of verse
                source: 'Tafseer',
                href: `/tafseer?surah=${item.verse_key.split(':')[0]}&ayah=${item.verse_key.split(':')[1]}`
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
        setResults(newResults);
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

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
                filteredResults.map((result) => (
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
                                <p className="text-slate-600 line-clamp-2" dangerouslySetInnerHTML={{ __html: result.text }} />
                            </div>
                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                    </Link>
                ))
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
