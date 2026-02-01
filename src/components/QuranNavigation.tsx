'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, BookOpen, Layers, X, Menu } from 'lucide-react';
import { useBookmarks } from '@/hooks/useBookmarks';

type NavTab = 'juz' | 'surah';

const JUZ_LIST = Array.from({ length: 30 }, (_, i) => i + 1);

// We can fetch surahs or hardcode basic info. For speed, I'll fetch or just list IDs if names aren't available immediately.
// Ideally, we pass surah list as prop or fetch it.
// Let's fetch it once on mount.

export default function QuranNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('juz');
  const [surahs, setSurahs] = useState<{ id: number; name_simple: string; name_arabic: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { bookmarks, toggleBookmark } = useBookmarks();

  // Fetch Surahs on open
  const handleOpen = async () => {
    setIsOpen(true);
    if (surahs.length === 0) {
      try {
        const res = await fetch('https://api.quran.com/api/v4/chapters');
        const data = await res.json();
        setSurahs(data.chapters);
      } catch (e) {
        console.error("Failed to fetch surahs", e);
      }
    }
  };

  const filteredSurahs = surahs.filter(s => 
    s.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toString().includes(searchQuery)
  );

  return (
    <>
      {/* Trigger Button (Floating or in Header) */}
      <button
        onClick={handleOpen}
        className="fixed top-4 left-4 z-40 p-2 bg-white rounded-full shadow-md hover:shadow-lg border border-slate-200 text-slate-700 transition-all md:hidden"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Desktop Sidebar (Always visible on large screens? Or Drawer?) 
          User said "shows all the time". Let's make it a sidebar on desktop.
      */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
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

          {/* Tabs */}
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
                if (surahs.length === 0) handleOpen(); // Fetch if not loaded
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

          {/* Search (Surah only) */}
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

          {/* Content List */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200">
            {activeTab === 'juz' && (
              <div className="grid grid-cols-3 gap-2">
                {JUZ_LIST.map((j) => (
                  <Link
                    key={j}
                    href={`/quran/juz/${j}`}
                    className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-center"
                    onClick={() => setIsOpen(false)} // Close on mobile
                  >
                    <span className="text-xs text-slate-400 uppercase font-bold">Juz</span>
                    <span className="text-xl font-bold text-slate-800">{j}</span>
                  </Link>
                ))}
              </div>
            )}

            {activeTab === 'surah' && (
              <div className="space-y-1">
                {surahs.length === 0 && <p className="text-center text-slate-400 py-4">Loading...</p>}
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
          </div>
          
          {/* Footer Link */}
          <div className="p-4 border-t border-slate-100 bg-slate-50">
             <Link href="/quran" className="flex items-center justify-center w-full py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-emerald-600 transition-colors">
                Back to Home
             </Link>
          </div>
        </div>
      </div>
      
      {/* Overlay for Mobile */}
      {isOpen && (
        <div 
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
