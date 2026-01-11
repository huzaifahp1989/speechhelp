'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Search, AlertCircle, Share2, Copy } from 'lucide-react';
import Link from 'next/link';

type Hadith = {
  hadithnumber: number;
  arabicnumber: number;
  text: string;
  grades: { grade: string; name: string }[];
  reference: { book: number; hadith: number };
};

type HadithBook = {
  metadata: {
    name: string;
    section: Record<string, string>;
  };
  hadiths: Hadith[];
};

const COLLECTION_NAMES: Record<string, string> = {
  bukhari: 'Sahih al-Bukhari',
  muslim: 'Sahih Muslim',
  abudawud: 'Sunan Abu Dawud',
  tirmidhi: 'Jami` at-Tirmidhi',
  nasai: 'Sunan an-Nasa\'i',
  ibnmajah: 'Sunan Ibn Majah',
  riyadussalihin: 'Riyad as-Salihin',
  nawawi: '40 Hadith Nawawi',
  qudsi: '40 Hadith Qudsi',
};

export default function CollectionPage() {
  const params = useParams();
  const router = useRouter();
  const editionId = params.editionId as string;
  
  const [book, setBook] = useState<HadithBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    async function fetchBook() {
      if (!editionId) return;

      const safeEditionId = editionId.toLowerCase();

      try {
        setLoading(true);
        setError(null);
        
        // Special handling for Riyad as-Salihin (using AhmedBaset/hadith-json)
        if (safeEditionId === 'riyadussalihin') {
            const url = 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/other_books/riyad_assalihin.json';
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 404) throw new Error('Collection not found.');
                throw new Error('Failed to fetch Riyad as-Salihin');
            }
            const data = await res.json();
            
            // Transform AhmedBaset format to our app format
            const transformedBook: HadithBook = {
                metadata: {
                    name: data.metadata.english.title,
                    section: data.chapters.reduce((acc: Record<string, string>, ch: any) => {
                        acc[ch.id] = ch.english;
                        return acc;
                    }, {})
                },
                hadiths: data.hadiths.map((h: any) => ({
                    hadithnumber: h.idInBook,
                    arabicnumber: h.idInBook,
                    text: `${h.english.narrator ? h.english.narrator + ' ' : ''}${h.english.text}`,
                    grades: [],
                    reference: {
                        book: h.chapterId,
                        hadith: h.idInBook
                    }
                }))
            };
            setBook(transformedBook);
            return;
        }

        // Standard handling for other collections (fawazahmed0/hadith-api)
        // Map simplified ID to API ID
        // Defaulting to English (eng-)
        const apiId = `eng-${safeEditionId}`;
        
        // Use raw.githubusercontent.com to bypass jsDelivr size limits for large files
        // Fallback to jsDelivr for smaller files if needed, but raw github is safer for size.
        // We found '1' tag works.
        const url = `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${apiId}.min.json`;
        
        const res = await fetch(url);
        if (!res.ok) {
             if (res.status === 404) throw new Error('Collection not found. Please check the edition ID.');
             throw new Error('Failed to fetch collection');
        }
        
        const data = await res.json();
        setBook(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load the collection. It might be too large or unavailable.');
      } finally {
        setLoading(false);
      }
    }

    fetchBook();
  }, [editionId]);

  // Filter and Pagination
  const filteredHadiths = useMemo(() => {
    if (!book) return [];
    if (!searchQuery) return book.hadiths;
    
    const lowerQuery = searchQuery.toLowerCase();
    return book.hadiths.filter(h => 
      h.text.toLowerCase().includes(lowerQuery) || 
      h.hadithnumber.toString().includes(lowerQuery)
    );
  }, [book, searchQuery]);

  const totalPages = Math.ceil(filteredHadiths.length / ITEMS_PER_PAGE);
  const currentHadiths = filteredHadiths.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mb-4"></div>
        <p className="text-slate-500 font-medium">Loading Collection... (This may take a moment)</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Collection</h2>
        <p className="text-slate-600 mb-6 text-center max-w-md">{error}</p>
        <Link href="/hadith" className="px-6 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors">
          Back to Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="h-14 sm:h-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 py-2 sm:py-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <Link href="/hadith" className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0">
                <ChevronLeft className="w-5 sm:w-6 h-5 sm:h-6" />
              </Link>
              <h1 className="text-sm sm:text-lg font-bold text-slate-900 truncate">
                {COLLECTION_NAMES[editionId] || editionId}
              </h1>
              <span className="px-2 sm:px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full hidden sm:inline-block flex-shrink-0">
                {book.hadiths.length} Hadiths
              </span>
            </div>

            <div className="flex-1 w-full sm:w-auto sm:max-w-md relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search in this collection..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 rounded-lg text-sm transition-all outline-none"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {/* Mobile Search */}
        <div className="md:hidden mb-4 md:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Hadith List */}
        <div className="space-y-4 md:space-y-6">
          {currentHadiths.length === 0 ? (
            <div className="text-center py-16 md:py-20 bg-white rounded-2xl md:rounded-3xl border border-slate-200 border-dashed">
              <Search className="w-10 md:w-12 h-10 md:h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-sm md:text-base">No Hadiths found matching "{searchQuery}"</p>
            </div>
          ) : (
            currentHadiths.map((hadith) => (
              <div key={hadith.hadithnumber} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="bg-amber-50/50 px-4 sm:px-6 py-2.5 sm:py-3 border-b border-amber-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 sm:w-8 h-7 sm:h-8 bg-amber-100 text-amber-700 rounded-lg text-xs sm:text-sm font-bold">
                      {hadith.hadithnumber}
                    </span>
                    {hadith.grades.length > 0 && (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                        hadith.grades[0].grade.toLowerCase().includes('sahih') 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {hadith.grades[0].grade}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 self-end sm:self-auto">
                    <button className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors" title="Copy">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors" title="Share">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="p-4 sm:p-6 md:p-8">
                  <p className="text-slate-800 text-base sm:text-lg leading-relaxed font-serif">
                    {hadith.text}
                  </p>
                  
                  {/* Reference Info if available */}
                  <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-50 flex flex-wrap gap-3 sm:gap-4 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    <span>Book {hadith.reference.book}</span>
                    <span>•</span>
                    <span>Hadith {hadith.reference.hadith}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 md:mt-10 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium disabled:opacity-50 hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
            <span className="px-3 sm:px-4 py-2 bg-slate-100 rounded-lg text-xs sm:text-sm font-medium text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium disabled:opacity-50 hover:bg-slate-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
