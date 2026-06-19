'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, BookOpen, X, Menu, Bookmark, Clock, ChevronRight } from 'lucide-react';
import { useBookmarks, type Bookmark as SavedBookmark } from '@/hooks/useBookmarks';
import { useQuranReadingProgress } from '@/hooks/useQuranReadingProgress';
import {
  getProgressResumeUrl,
  getProgressSubtitle,
  getProgressTitle,
} from '@/lib/quranReadingProgress';

type NavTab = 'juz' | 'surah' | 'bookmarks';

const JUZ_LIST = Array.from({ length: 30 }, (_, i) => i + 1);

function bookmarkUrl(b: SavedBookmark): string {
  if (b.type === 'juz') {
    return `/quran/juz/${b.refId}?startingVerse=${b.verseKey}#verse-${b.verseKey}`;
  }
  return `/quran/${b.refId}?startingVerse=${b.verseKey}#verse-${b.verseKey}`;
}

export default function QuranNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('juz');
  const [surahs, setSurahs] = useState<{ id: number; name_simple: string; name_arabic: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { bookmarks } = useBookmarks();
  const { progress } = useQuranReadingProgress();

  const handleOpen = async () => {
    setIsOpen(true);
    if (surahs.length === 0) {
      try {
        const res = await fetch('https://api.quran.com/api/v4/chapters');
        const data = await res.json();
        setSurahs(data.chapters);
      } catch (e) {
        console.error('Failed to fetch surahs', e);
      }
    }
  };

  const filteredSurahs = surahs.filter(
    (s) =>
      s.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toString().includes(searchQuery)
  );

  const sortedBookmarks = [...bookmarks].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed top-[4.5rem] left-3 z-40 p-2.5 bg-white rounded-full shadow-md hover:shadow-lg border border-slate-200 text-slate-700 transition-all md:hidden touch-manipulation"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              Quran Nav
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden p-1 hover:bg-slate-100 rounded-full"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setActiveTab('juz')}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${activeTab === 'juz' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Juz (Parts)
            </button>
            <button
              onClick={() => {
                setActiveTab('surah');
                if (surahs.length === 0) handleOpen();
              }}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${activeTab === 'surah' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Surahs
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${activeTab === 'bookmarks' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Saved
            </button>
          </div>

          {activeTab === 'surah' && (
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Surah..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200">
            {activeTab === 'juz' && (
              <div className="grid grid-cols-3 gap-2">
                {JUZ_LIST.map((j) => (
                  <Link
                    key={j}
                    href={`/quran/juz/${j}`}
                    className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-center"
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="text-xs text-slate-400 uppercase font-bold">Juz</span>
                    <span className="text-xl font-bold text-slate-800">{j}</span>
                  </Link>
                ))}
              </div>
            )}

            {activeTab === 'surah' && (
              <div className="space-y-1">
                {surahs.length === 0 && (
                  <p className="text-center text-slate-400 py-4">Loading...</p>
                )}
                {filteredSurahs.map((s) => (
                  <Link
                    key={s.id}
                    href={`/quran/${s.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600">
                        {s.id}
                      </span>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700">
                        {s.name_simple}
                      </span>
                    </div>
                    <span className="text-sm font-arabic text-slate-400 group-hover:text-emerald-600">
                      {s.name_arabic}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {activeTab === 'bookmarks' && (
              <div className="space-y-3 p-1">
                {progress && (
                  <Link
                    href={getProgressResumeUrl(progress)}
                    className={`block p-3 rounded-xl border transition-colors ${
                      progress.activity === 'prayer'
                        ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                        : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex items-start gap-2">
                      {progress.activity === 'prayer' ? (
                        <Bookmark className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          {progress.activity === 'prayer' ? 'Prayer spot' : 'Continue reading'}
                        </p>
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {getProgressTitle(progress)}
                        </p>
                        <p className="text-xs text-slate-500">{getProgressSubtitle(progress)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                    </div>
                  </Link>
                )}

                {sortedBookmarks.length > 0 && (
                  <>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 px-1 pt-1">
                      Saved ayahs
                    </p>
                    {sortedBookmarks.map((b) => (
                      <Link
                        key={b.id}
                        href={bookmarkUrl(b)}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-amber-300 hover:bg-amber-50 transition-colors group"
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {b.type === 'juz' ? `Juz ${b.refId}` : `Surah ${b.refId}`} · {b.verseKey}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 shrink-0" />
                      </Link>
                    ))}
                  </>
                )}

                {!progress && sortedBookmarks.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-8 px-4">
                    Read or listen to save your place. Tap the checkmark on any ayah to mark your prayer spot.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <Link
              href="/quran"
              className="flex items-center justify-center w-full py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-emerald-600 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
