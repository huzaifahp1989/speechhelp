'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  BookOpen,
  Calendar,
  Headphones,
  LayoutGrid,
  Mic,
  Radio,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AnalyticsEvents } from '@/lib/analytics';

type QuickLink = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  featured?: boolean;
  badge?: string;
};

const LINKS: QuickLink[] = [
  {
    label: 'Listen to Qur’an',
    href: '/quran/listen',
    icon: Headphones,
    description: 'Over 100 reciters, Surah and Juz playback, saved progress',
    featured: true,
    badge: 'NEW',
  },
  {
    label: 'Hifz Quran Recorder',
    href: '/quran-studio',
    icon: Radio,
    description: 'Record verses with live waveform, verse stamps & offline support',
    featured: true,
    badge: 'NEW',
  },
  {
    label: 'My Hifz Analytics',
    href: '/quran-recording',
    icon: BarChart3,
    description: 'Streaks, memorization progress, strengths vs weak verses',
    featured: true,
  },
  {
    label: 'Progress Tracker',
    href: '/tracker',
    icon: Trophy,
    description: 'Goals, habits, streaks & reflections',
  },
  {
    label: 'Hifz Planner',
    href: '/hifz-planner',
    icon: Calendar,
    description: 'Plan, practice & track memorisation',
  },
  {
    label: 'Khatam',
    href: '/khatam',
    icon: Trophy,
    description: 'Juz progress & completion',
  },
  {
    label: 'Qur’an Juz',
    href: '/quran/juz',
    icon: BookOpen,
    description: 'Browse and recite by Juz',
  },
  {
    label: 'Voice Search',
    href: '/voice-search',
    icon: Mic,
    description: 'Search & Hifz voice commands',
  },
];

export default function QuickLinksMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      {/* Standalone one-tap Hifz Recorder FAB (bottom-left) — opens studio directly */}
      <Link
        href="/quran-studio"
        onClick={() => void AnalyticsEvents.featureClick('floating_recorder', 'Hifz Recorder')}
        className="fixed bottom-5 left-5 z-[110] hidden sm:flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-xl shadow-emerald-500/40 ring-4 ring-white transition-all hover:scale-110 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 group"
        aria-label="Open Hifz Quran Recorder"
        title="Hifz Quran Recorder — tap to start recording"
        prefetch={false}
      >
        <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400/40 pointer-events-none" aria-hidden="true"></span>
        <span className="relative flex flex-col items-center justify-center">
          <Radio className="relative h-6 w-6 drop-shadow" strokeWidth={2.5} />
          <Sparkles className="absolute -top-2 -right-2 h-3.5 w-3.5 text-amber-200 fill-amber-100 drop-shadow" />
        </span>
      </Link>
      {/* Mobile: even smaller left FAB with mic icon so user on small screens can tap fast */}
      <Link
        href="/quran-studio"
        onClick={() => void AnalyticsEvents.featureClick('floating_recorder_mobile', 'Hifz Recorder')}
        className="fixed bottom-5 left-4 z-[110] sm:hidden flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-xl shadow-emerald-500/40 ring-4 ring-white transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2"
        aria-label="Hifz Recorder"
        title="Open Hifz Recorder"
        prefetch={false}
      >
        <Mic className="h-5 w-5" strokeWidth={2.5} />
      </Link>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[110] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-all hover:scale-105 hover:bg-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label="Open quick links menu"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <LayoutGrid className="h-6 w-6" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-links-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-300/70 bg-[#fcfcf9] shadow-2xl ring-1 ring-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-blue-950/30 bg-gradient-to-r from-[#102b59] via-[#12336b] to-[#214f8d] px-5 py-4 text-white shadow-inner">
              <div className="flex items-center gap-3">
                <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-2 ring-white/30 shadow-inner">
                  <Radio className="h-5 w-5 text-white" strokeWidth={2.4} />
                  <Sparkles className="absolute -top-1.5 -right-1.5 h-3 w-3 text-amber-200 fill-amber-100 drop-shadow" />
                </span>
                <div className="min-w-0">
                  <h2 id="quick-links-title" className="text-lg font-extrabold text-white flex items-center gap-2 drop-shadow-sm">
                    Quick Links
                    <span className="inline-flex items-center rounded-full bg-white text-emerald-800 text-[10px] font-black tracking-[0.14em] px-2.5 py-0.5 uppercase ring-1 ring-emerald-200 shadow">
                      Hifz Studio Live
                    </span>
                  </h2>
                  <p className="text-xs text-white/90 mt-0.5 font-medium">
                    Tap the floating mic button (left, bottom) for one-tap recording
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-white/95 transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="max-h-[min(70dvh,480px)] overflow-y-auto p-3">
              <ul className="space-y-1.5">
                {LINKS.map(({ label, href, icon: Icon, description, featured, badge }) => {
                  const isFeatured = Boolean(featured);
                  return (
                    <li key={label}>
                      <Link
                        href={href}
                        onClick={() => {
                          void AnalyticsEvents.featureClick(
                            isFeatured ? 'quick_link_featured' : 'quick_link',
                            label
                          );
                          setOpen(false);
                        }}
                        className={
                          'group flex items-center gap-3 rounded-xl px-3 py-3 transition-all focus:outline-none focus-visible:ring-2 ' +
                          (isFeatured
                            ? 'bg-gradient-to-r from-emerald-100 via-teal-100 to-cyan-100 hover:from-emerald-200 hover:via-teal-200 hover:to-cyan-200 ring-2 ring-emerald-300/70 shadow-sm focus-visible:ring-emerald-500 border border-emerald-200'
                            : 'hover:bg-slate-100 focus-visible:ring-slate-300 border border-transparent')
                        }
                      >
                        <span
                          className={
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ' +
                            (isFeatured
                              ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/40 ring-2 ring-white group-hover:from-emerald-700 group-hover:to-teal-800'
                              : 'bg-[#12336b]/10 text-[#12336b] group-hover:bg-[#12336b] group-hover:text-white')
                          }
                        >
                          <Icon className="h-5 w-5" strokeWidth={isFeatured ? 2.4 : 2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span
                              className={
                                'block truncate ' +
                                (isFeatured ? 'text-[#0b3b3b] font-extrabold tracking-tight' : 'text-slate-800 font-semibold')
                              }
                            >
                              {label}
                            </span>
                            {badge && (
                              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-white ring-1 ring-white/70 shadow-sm">
                                <Sparkles className="mr-0.5 h-3 w-3" />
                                {badge}
                              </span>
                            )}
                          </span>
                          <span
                            className={
                              'block truncate text-xs ' +
                              (isFeatured ? 'text-[#104444]/90 font-medium' : 'text-slate-500')
                            }
                          >
                            {description}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
