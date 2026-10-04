'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AudioLines,
  BookOpenCheck,
  CalendarCheck,
  Mic,
  Sparkles,
  X,
  Target,
} from 'lucide-react';

const HIGHLIGHTS = [
  {
    icon: Mic,
    title: 'Hifz Recording Studio',
    description: 'Record Quran memorisation, save drafts, and submit recitations for review.',
    href: '/quran-studio',
  },
  {
    icon: AudioLines,
    title: 'My Hifz',
    description: 'Keep your recordings and follow your memorisation practice and progress.',
    href: '/quran-recording',
  },
  {
    icon: BookOpenCheck,
    title: 'Plan your revision',
    description: 'Organise memorisation ranges and keep revision sessions moving.',
    href: '/hifz-planner',
  },
  {
    icon: Target,
    title: 'Personal progress goals',
    description: 'Track Quran, tasbeeh, and durood goals with daily and weekly progress.',
    href: '/tracker',
  },
  {
    icon: CalendarCheck,
    title: 'More ways to study Quran',
    description: 'Explore listening, word-by-word audio, and colour-coded tajweed tools.',
    href: '/quran',
  },
] as const;

export default function WhatsNewPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <div className="border-b border-emerald-100 bg-emerald-50/80">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-1.5 sm:justify-end sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="inline-flex min-h-8 items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:text-sm"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Check what&apos;s new
          </button>
        </div>
      </div>
      {open &&
        createPortal(
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="fixed inset-0 z-[70] bg-slate-950/55 backdrop-blur-[2px] touch-manipulation"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="whats-new-title"
              className="fixed inset-x-0 bottom-0 z-[71] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 flex w-full sm:max-w-lg flex-col max-h-[min(92dvh,720px)] sm:max-h-[min(85dvh,640px)] min-h-0 rounded-t-2xl sm:rounded-2xl bg-[#fffef9] shadow-2xl border border-[#d4c4a0]/60 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0" aria-hidden>
                <span className="h-1 w-10 rounded-full bg-[#d4c4a0]/80" />
              </div>

              <div className="shrink-0 px-4 sm:px-6 pt-2 sm:pt-5 pb-3 border-b border-[#d4c4a0]/40 bg-gradient-to-br from-emerald-50/80 to-[#fffef9]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide">
                      <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      New features
                    </span>
                    <h2
                      id="whats-new-title"
                      className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-[#1a2e1a]"
                    >
                      What&apos;s new
                    </h2>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-[#5a6b5a]">
                      New tools to help you memorise, revise, and study the Qur&apos;an.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
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
                  return (
                    <li key={item.title}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex gap-2.5 sm:gap-3 rounded-xl border border-[#d4c4a0]/35 bg-white/80 p-2.5 sm:p-3 hover:border-emerald-400/50 hover:bg-emerald-50/40 transition-colors touch-manipulation"
                      >
                        <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-[#1a2e1a]">{item.title}</span>
                          <span className="block text-xs text-[#5a6b5a] mt-0.5 leading-snug sm:leading-relaxed">
                            {item.description}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="shrink-0 px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:py-4 border-t border-[#d4c4a0]/40 bg-white/95">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-xl bg-[#0d4f4f] hover:bg-[#146356] active:bg-[#0a3d3d] text-white font-semibold py-3 text-sm transition-colors touch-manipulation"
                >
                  Got it
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
