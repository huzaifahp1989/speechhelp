'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Search, AlertCircle, Share2, Copy, BookOpen, ExternalLink, X, Mic, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { HADITH_COMMENTARY } from '@/data/hadith-commentary';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';

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
  malik: 'Muwatta Malik',
  ahmed: 'Musnad Ahmad',
  darimi: 'Sunan al-Darimi',
  adab: 'Al-Adab Al-Mufrad',
};

// Map internal IDs to Sunnah.com slugs if they differ
const SUNNAH_SLUGS: Record<string, string> = {
  bukhari: 'bukhari',
  muslim: 'muslim',
  abudawud: 'abudawud',
  tirmidhi: 'tirmidhi',
  nasai: 'nasai',
  ibnmajah: 'ibnmajah',
  riyadussalihin: 'riyadussalihin',
  nawawi: 'nawawi40',
  qudsi: 'qudsi40',
  malik: 'malik',
  ahmed: 'ahmad',
  darimi: 'darimi',
  adab: 'adab'
};

function cleanHadithText(text: string): string {
  if (!text) return '';
  return text
    .replace(/Reference\s*:\s*Sunnah\.com/gi, '')
    .replace(/Source\s*:\s*Sunnah\.com/gi, '')
    .replace(/Sunnah\.com/gi, '')
    .trim();
}

export default function CollectionClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = searchParams.get('section');
  
  const editionId = params.editionId as string;
  
  const [book, setBook] = useState<HadithBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [jumpToNum, setJumpToNum] = useState('');
  
  const { isListening, isSupported, toggleListening } = useVoiceSearch({
    onResult: (text) => {
        setSearchQuery(text);
        setPage(1);
    }
  });
  
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    async function fetchBook() {
      if (!editionId) return;

      const safeEditionId = editionId.toLowerCase();

      try {
        setLoading(true);
        setError(null);
        
        // Special handling for collections using AhmedBaset/hadith-json
        if (['riyadussalihin', 'muslim', 'adab', 'ahmed', 'darimi'].includes(safeEditionId)) {
            let url = '';
            if (safeEditionId === 'riyadussalihin') {
                url = 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/other_books/riyad_assalihin.json';
            } else if (safeEditionId === 'muslim') {
                url = 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/the_9_books/muslim.json';
            } else if (safeEditionId === 'adab') {
                url = 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/other_books/aladab_almufrad.json';
            } else if (safeEditionId === 'ahmed') {
                url = 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/the_9_books/ahmed.json';
            } else if (safeEditionId === 'darimi') {
                url = 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/the_9_books/darimi.json';
            }

            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 404) throw new Error('Collection not found.');
                throw new Error(`Failed to fetch ${COLLECTION_NAMES[safeEditionId] || safeEditionId}`);
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
                    grades: safeEditionId === 'muslim' ? [{ grade: 'Sahih', name: 'Sahih' }] : [],
                    reference: {
                        book: h.chapterId,
                        hadith: h.idInBook
                    }
                }))
            };
            setBook(transformedBook);
            return;
        }

        const apiId = `eng-${safeEditionId}`;
        const urls = [
          `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${apiId}.min.json`,
          `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${apiId}.json`,
          `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${apiId}.min.json`,
          `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${apiId}.json`,
        ];

        let data: HadithBook | null = null;
        let lastError: any = null;

        for (const url of urls) {
          try {
            const res = await fetch(url);
            if (!res.ok) {
              lastError = new Error(`Failed with status ${res.status}`);
              continue;
            }
            data = await res.json();
            break;
          } catch (err) {
            lastError = err;
          }
        }

        if (!data) {
          if (lastError && lastError.message && lastError.message.includes('404')) {
            throw new Error('Collection not found. Please check the edition ID.');
          }
          throw new Error('Failed to fetch collection');
        }

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
    
    let filtered = book.hadiths;
    
    // Filter by Section ID if present
    if (sectionId) {
      filtered = filtered.filter(h => h.reference.book.toString() === sectionId);
    }
    
    // Filter by Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(h => 
        h.text.toLowerCase().includes(q) || 
        h.hadithnumber.toString().includes(q)
      );
    }
    
    return filtered;
  }, [book, searchQuery, sectionId]);

  const totalPages = Math.ceil(filteredHadiths.length / ITEMS_PER_PAGE);
  const currentHadiths = filteredHadiths.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const handleJumpToHadith = (e: any) => {
    e.preventDefault();
    if (!book || !jumpToNum) return;

    const targetNum = parseInt(jumpToNum);
    if (isNaN(targetNum)) return;

    const index = book.hadiths.findIndex(h => Number(h.hadithnumber) === targetNum);
    
    if (index !== -1) {
      // If we have a search query, we need to find the index within the filtered list
      if (searchQuery) {
         const filteredIndex = filteredHadiths.findIndex(h => Number(h.hadithnumber) === targetNum);
         if (filteredIndex !== -1) {
            const newPage = Math.floor(filteredIndex / ITEMS_PER_PAGE) + 1;
            setPage(newPage);
            setJumpToNum('');
         } else {
            alert(`Hadith #${targetNum} matches your search query.`);
         }
      } else {
         const newPage = Math.floor(index / ITEMS_PER_PAGE) + 1;
         setPage(newPage);
         setJumpToNum('');
      }
    } else {
      alert(`Hadith #${targetNum} not found in this collection.`);
    }
  };

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

            <div className="flex-1 w-full sm:w-auto sm:max-w-md relative hidden md:flex items-center gap-2">
              {sectionId && book?.metadata?.section && (
                <div className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1 whitespace-nowrap max-w-[150px] truncate">
                  <span>Chapter:</span>
                  <span className="truncate">{book.metadata.section[sectionId]}</span>
                  <Link href={`/hadith/${editionId}`} className="ml-1 hover:bg-amber-200 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </Link>
                </div>
              )}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in this collection..."
                  className="w-full pl-9 pr-10 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 rounded-lg text-sm transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                />
                {isSupported && (
                  <button
                    onClick={toggleListening}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${
                      isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isListening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <form onSubmit={handleJumpToHadith} className="relative w-24">
                <input
                  type="text"
                  placeholder="Go to #"
                  className="w-full px-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 rounded-lg text-sm transition-all outline-none"
                  value={jumpToNum}
                  onChange={(e) => setJumpToNum(e.target.value)}
                />
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {/* Mobile Search & Jump */}
        <div className="md:hidden mb-4 md:mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
            {isSupported && (
              <button
                onClick={toggleListening}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${
                  isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-slate-100 text-slate-400'
                }`}
              >
                {isListening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </div>
          <form onSubmit={handleJumpToHadith} className="relative w-20">
            <input
              type="number"
              placeholder="#"
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              value={jumpToNum}
              onChange={(e) => setJumpToNum(e.target.value)}
            />
          </form>
        </div>

        {/* Hadith List */}
        <div className="space-y-4 md:space-y-6">
          {currentHadiths.length === 0 ? (
            <div className="text-center py-16 md:py-20 bg-white rounded-2xl md:rounded-3xl border border-slate-200 border-dashed">
              <Search className="w-10 md:w-12 h-10 md:h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-sm md:text-base">No Hadiths found matching "{searchQuery}"</p>
            </div>
          ) : (
            currentHadiths.map((hadith) => {
              const cleanText = cleanHadithText(hadith.text);
              const editionKey = editionId.toLowerCase().includes('nawawi') ? 'nawawi' : editionId.toLowerCase();
              const localCommentary = HADITH_COMMENTARY[editionKey]?.[hadith.hadithnumber];
              
              // Dynamic Context Logic
              const sectionId = hadith?.reference?.book;
              const sectionName = (book?.metadata?.section && sectionId) ? book.metadata.section[sectionId] : 'General';
              const hasCommentary = !!localCommentary;

              return (
              <div key={hadith.hadithnumber} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="bg-amber-50/50 px-4 sm:px-6 py-2.5 sm:py-3 border-b border-amber-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 sm:w-8 h-7 sm:h-8 bg-amber-100 text-amber-700 rounded-lg text-xs sm:text-sm font-bold">
                      {hadith.hadithnumber}
                    </span>
                    {hadith.grades && hadith.grades.length > 0 && (
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
                    {cleanText}
                  </p>
                  
                  {/* Commentary Section */}
                  {(hasCommentary || sectionName) && (
                     <div className="mt-6 p-5 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-2 mb-3 text-emerald-800 font-bold border-b border-emerald-200 pb-2">
                           <BookOpen className="w-5 h-5" />
                           <span>{hasCommentary ? 'Scholarly Commentary' : 'Context & Chapter'}</span>
                        </div>
                        
                        {hasCommentary ? (
                           <div className="prose prose-sm prose-emerald max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: localCommentary }} />
                        ) : (
                           <div className="text-slate-700 text-sm leading-relaxed">
                             <p><strong>Chapter:</strong> {sectionName}</p>
                             <p className="mt-2 text-slate-500 italic">
                               Detailed scholarly commentary for this specific narration is being compiled. 
                               This hadith falls under the chapter of <strong>{sectionName}</strong>, providing guidance on this topic.
                             </p>
                           </div>
                        )}
                     </div>
                  )}

                  {/* Reference Info if available */}
                  <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-50 flex flex-wrap gap-3 sm:gap-4 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    <span>Book {hadith.reference.book}</span>
                    <span>•</span>
                    <span>Hadith {hadith.reference.hadith}</span>
                  </div>
                </div>
              </div>
            )})
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
