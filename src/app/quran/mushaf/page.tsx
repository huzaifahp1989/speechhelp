'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, ChevronRight, Clock, Languages, Maximize2 } from 'lucide-react';
import {
  getSavedMushafPage,
  getSavedShowTranslation,
  saveShowTranslation,
  TOTAL_MUSHAF_PAGES,
} from '@/lib/mushaf';
import MushafJuzPicker from '@/components/mushaf/MushafJuzPicker';
import ContinueReadingBanner from '@/components/quran/ContinueReadingBanner';

export default function MushafLandingPage() {
  const router = useRouter();
  const [lastPage, setLastPage] = useState(1);
  const [pageJump, setPageJump] = useState('1');
  const [showTranslation, setShowTranslation] = useState(false);
  const [activeTab, setActiveTab] = useState<'juz' | 'page'>('juz');

  useEffect(() => {
    setLastPage(getSavedMushafPage());
    setPageJump(String(getSavedMushafPage()));
    setShowTranslation(getSavedShowTranslation());
  }, []);

  const startReading = (page: number) => {
    saveShowTranslation(showTranslation);
    router.push(`/quran/mushaf/${page}`);
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-[#faf6ef] to-[#f0e8d8] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-16">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-[#0d4f4f]/10 text-[#0d4f4f] text-xs sm:text-sm font-semibold mb-4 sm:mb-5">
            <BookOpen className="w-4 h-4" />
            IndoPak 13-Line Mushaf
          </div>

          <h1 className="text-2xl sm:text-5xl font-bold text-[#1a2e1a] mb-2 sm:mb-3 leading-tight">
            Read the Qur&apos;an
            <br />
            <span className="text-[#0d4f4f]">13 Lines · Full Page</span>
          </h1>

          <p className="text-lg text-[#5a6b5a] max-w-xl mx-auto leading-relaxed">
            Proper mushaf pages for salah and taraweeh. Pick a juz, toggle English translation, and read.
          </p>
        </div>

        <ContinueReadingBanner variant="card" className="max-w-xl mx-auto mb-8" />

        {/* Options row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <button
            onClick={() => startReading(lastPage)}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#0d4f4f] text-white font-bold text-lg hover:bg-[#146356] transition-colors shadow-lg shadow-[#0d4f4f]/20 w-full sm:w-auto justify-center"
          >
            <Maximize2 className="w-5 h-5" />
            {lastPage > 1 ? `Continue Page ${lastPage}` : 'Start from Page 1'}
          </button>

          <label className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#fffef9] border border-[#d4c4a0]/60 cursor-pointer w-full sm:w-auto justify-center">
            <input
              type="checkbox"
              checked={showTranslation}
              onChange={(e) => {
                setShowTranslation(e.target.checked);
                saveShowTranslation(e.target.checked);
              }}
              className="w-4 h-4 rounded accent-[#0d4f4f]"
            />
            <Languages className="w-5 h-5 text-[#0d4f4f]" />
            <span className="font-semibold text-[#1a2e1a]">Show English translation</span>
          </label>
        </div>

        {lastPage > 1 && (
          <p className="text-center flex items-center justify-center gap-2 text-sm text-[#5a6b5a] mb-8">
            <Clock className="w-4 h-4" />
            Last read: page {lastPage}
          </p>
        )}

        {/* Tab switcher */}
        <div className="bg-[#fffef9] rounded-2xl border border-[#d4c4a0]/60 shadow-sm overflow-hidden">
          <div className="flex border-b border-[#d4c4a0]/40">
            <button
              onClick={() => setActiveTab('juz')}
              className={`flex-1 py-3.5 text-sm font-bold transition-colors ${
                activeTab === 'juz'
                  ? 'bg-[#0d4f4f] text-white'
                  : 'text-[#5a6b5a] hover:bg-[#0d4f4f]/5'
              }`}
            >
              Choose by Juz (1–30)
            </button>
            <button
              onClick={() => setActiveTab('page')}
              className={`flex-1 py-3.5 text-sm font-bold transition-colors ${
                activeTab === 'page'
                  ? 'bg-[#0d4f4f] text-white'
                  : 'text-[#5a6b5a] hover:bg-[#0d4f4f]/5'
              }`}
            >
              Jump to Page
            </button>
          </div>

          <div className="p-5 sm:p-6">
            {activeTab === 'juz' ? (
              <MushafJuzPicker
                onSelectJuz={(_juz, startPage) => startReading(startPage)}
              />
            ) : (
              <div className="max-w-md mx-auto">
                <label className="block text-sm font-semibold text-[#5a6b5a] mb-3">
                  Page number (1–{TOTAL_MUSHAF_PAGES})
                </label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const num = Math.max(1, Math.min(TOTAL_MUSHAF_PAGES, Number(pageJump) || 1));
                    startReading(num);
                  }}
                  className="flex gap-3"
                >
                  <input
                    type="number"
                    min={1}
                    max={TOTAL_MUSHAF_PAGES}
                    value={pageJump}
                    onChange={(e) => setPageJump(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-[#d4c4a0] text-[#1a2e1a] font-bold text-center focus:ring-2 focus:ring-[#0d4f4f] focus:border-transparent outline-none"
                  />
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-xl bg-[#c9a227] text-white font-bold hover:bg-[#b8921f] transition-colors"
                  >
                    Go
                  </button>
                </form>
                <p className="mt-3 text-xs text-center text-[#5a6b5a]">
                  {TOTAL_MUSHAF_PAGES} pages · Qudratullah 13-line layout
                </p>
              </div>
            )}
          </div>
        </div>

        <Link
          href="/quran"
          className="inline-flex items-center gap-1 mt-10 mx-auto text-sm font-medium text-[#0d4f4f] hover:underline justify-center w-full"
        >
          Verse-by-verse mode with audio &amp; tafseer
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
