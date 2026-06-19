'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Headphones,
  Palette,
  Sparkles,
  X,
  MousePointerClick,
  LayoutGrid,
} from 'lucide-react';

const STORAGE_KEY = 'speechhelp_whats_new_2026_06_seen';

const HIGHLIGHTS = [
  {
    icon: BookOpen,
    title: 'IndoPak Mushaf reader',
    description: 'Read the Qur’an in 13-line mushaf layout with page navigation and night mode.',
    href: '/quran/mushaf',
  },
  {
    icon: MousePointerClick,
    title: 'Tap any word to hear it',
    description: 'Word-by-word audio on Surah and Juz pages — great for kids learning pronunciation.',
    href: '/quran/1',
  },
  {
    icon: Palette,
    title: 'Tajweed colours',
    description: 'See tajweed rules highlighted on words and ayahs. Tap a word for meaning and rules.',
  },
  {
    icon: Headphones,
    title: '42 reciters',
    description: 'More Quran.com and EveryAyah voices, grouped in the reciter picker with previews.',
    href: '/quran',
  },
  {
    icon: Sparkles,
    title: 'Smarter word audio',
    description: 'Word playback now matches the Arabic on screen — fixed misaligned ayahs.',
  },
  {
    icon: LayoutGrid,
    title: 'Quick links while reading',
    description: 'Jump to Mushaf, Juz, search, and more without leaving the reader.',
  },
] as const;

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    /* ignore */
  }
}

function hasSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function WhatsNewJune2026Popup() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!hasSeen()) {
      const timer = window.setTimeout(() => setOpen(true), 600);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const dismiss = () => {
    markSeen();
    setOpen(false);
  };

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close"
        className="fixed inset-0 z-[70] bg-slate-950/55 backdrop-blur-[2px] touch-manipulation"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-june-2026-title"
        className="fixed inset-x-0 bottom-0 z-[71] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 flex w-full sm:max-w-lg flex-col max-h-[min(92dvh,720px)] sm:max-h-[min(85dvh,640px)] min-h-0 rounded-t-2xl sm:rounded-2xl bg-[#fffef9] shadow-2xl border border-[#d4c4a0]/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-[#d4c4a0]/80" />
        </div>

        <div className="shrink-0 px-4 sm:px-6 pt-2 sm:pt-5 pb-3 border-b border-[#d4c4a0]/40 bg-gradient-to-br from-emerald-50/80 to-[#fffef9]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide">
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                June 2026
              </span>
              <h2
                id="whats-new-june-2026-title"
                className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-[#1a2e1a]"
              >
                What&apos;s new
              </h2>
              <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-[#5a6b5a]">
                Fresh Qur&apos;an reading tools and audio improvements.
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 p-2 -mr-1 rounded-lg hover:bg-emerald-100/60 text-[#5a6b5a] touch-manipulation"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-3 sm:py-4 space-y-2.5 sm:space-y-3">
          {HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-[#1a2e1a]">{item.title}</span>
                  <span className="block text-xs text-[#5a6b5a] mt-0.5 leading-snug sm:leading-relaxed">
                    {item.description}
                  </span>
                </span>
              </>
            );

            return (
              <li key={item.title}>
                {'href' in item && item.href ? (
                  <Link
                    href={item.href}
                    onClick={dismiss}
                    className="flex gap-2.5 sm:gap-3 rounded-xl border border-[#d4c4a0]/35 bg-white/80 p-2.5 sm:p-3 hover:border-emerald-400/50 hover:bg-emerald-50/40 transition-colors touch-manipulation"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex gap-2.5 sm:gap-3 rounded-xl border border-[#d4c4a0]/35 bg-white/80 p-2.5 sm:p-3">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="shrink-0 px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:py-4 border-t border-[#d4c4a0]/40 bg-white/95">
          <button
            type="button"
            onClick={dismiss}
            className="w-full rounded-xl bg-[#0d4f4f] hover:bg-[#146356] active:bg-[#0a3d3d] text-white font-semibold py-3 text-sm transition-colors touch-manipulation"
          >
            Got it
          </button>
          <p className="mt-1.5 sm:mt-2 text-center text-[10px] sm:text-[11px] text-[#5a6b5a]">
            Won&apos;t show again after you dismiss.
          </p>
        </div>
      </div>
    </>,
    document.body
  );
}
