'use client';

import Link from 'next/link';
import { Bookmark, ChevronRight, Star } from 'lucide-react';
import { useBookmarks, type Bookmark as SavedBookmark } from '@/hooks/useBookmarks';
import { useQuranReadingProgress } from '@/hooks/useQuranReadingProgress';
import { getProgressSubtitle } from '@/lib/quranReadingProgress';
import ContinueReadingBanner from '@/components/quran/ContinueReadingBanner';

function bookmarkUrl(b: SavedBookmark): string {
  if (b.type === 'juz') {
    return `/quran/juz/${b.refId}?startingVerse=${b.verseKey}#verse-${b.verseKey}`;
  }
  return `/quran/${b.refId}?startingVerse=${b.verseKey}#verse-${b.verseKey}`;
}

export default function HomeBookmarksPanel() {
  const { bookmarks } = useBookmarks();
  const { progress } = useQuranReadingProgress();
  const sorted = [...bookmarks].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Star className="w-5 h-5 text-emerald-600" /> Your Quran progress
        </h2>
        <ContinueReadingBanner variant="card" />
        {!progress && (
          <p className="text-sm text-slate-500 px-1">
            Open any Juz, Surah, or Mushaf page — your place is saved automatically.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-amber-500" /> Saved ayahs
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {sorted.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-8 px-4">
              Tap the bookmark icon on any ayah while reading to save it here.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sorted.map((b) => (
                <li key={b.id}>
                  <Link
                    href={bookmarkUrl(b)}
                    className="flex items-center justify-between gap-2 p-4 hover:bg-amber-50/60 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {b.type === 'juz' ? `Juz ${b.refId}` : `Surah ${b.refId}`} · {b.verseKey}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="p-3 border-t border-slate-100 bg-slate-50/80">
            <Link
              href="/quran/juz"
              className="flex items-center justify-center gap-1 w-full py-2 text-sm text-emerald-700 font-semibold hover:underline"
            >
              Browse all Juz
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        {progress && (
          <p className="text-xs text-slate-400 px-1">{getProgressSubtitle(progress)}</p>
        )}
      </div>
    </div>
  );
}
