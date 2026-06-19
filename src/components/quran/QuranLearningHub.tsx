'use client';

import Link from 'next/link';
import {
  BookOpen,
  Brain,
  Bookmark,
  ChevronRight,
  Flame,
  Target,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useQuranReadingProgress } from '@/hooks/useQuranReadingProgress';
import { countDueRanges, sortRangesForRevision } from '@/lib/hifzRangeProgress';
import { getDefaultDailyPageGoal, getTodayQuranPages } from '@/lib/quranTrackerSync';

type HifzRange = { id: string; juz: number; surah: { name_simple: string }; startAyah: number; endAyah: number; label?: string };

type DailyPlan = {
  streak?: number;
  dailyAmount?: number;
  currentSurah?: number;
  currentAyah?: number;
  lastPracticed?: string | null;
};

export default function QuranLearningHub() {
  const { progress } = useQuranReadingProgress();
  const { bookmarks } = useBookmarks();
  const [ranges, setRanges] = useState<HifzRange[]>([]);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [pagesToday, setPagesToday] = useState(0);
  const [pageGoal, setPageGoal] = useState(4);

  const refresh = () => {
    try {
      const savedRanges = localStorage.getItem('hifz_ranges');
      if (savedRanges) setRanges(JSON.parse(savedRanges));
      const savedPlan = localStorage.getItem('hifz_plan');
      if (savedPlan) setPlan(JSON.parse(savedPlan));
    } catch {
      // ignore
    }
    setPagesToday(getTodayQuranPages());
    setPageGoal(getDefaultDailyPageGoal());
  };

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener('hifz-range-progress-updated', onUpdate);
    window.addEventListener('quran-tracker-updated', onUpdate);
    window.addEventListener('quran-progress-updated', onUpdate);
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener('hifz-range-progress-updated', onUpdate);
      window.removeEventListener('quran-tracker-updated', onUpdate);
      window.removeEventListener('quran-progress-updated', onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, []);

  const dueCount = countDueRanges(ranges.map((r) => r.id));
  const nextRange = sortRangesForRevision(ranges)[0];
  const pagePct = pageGoal > 0 ? Math.min(100, Math.round((pagesToday / pageGoal) * 100)) : 0;

  const tiles = [
    {
      href: '/hifz-planner',
      icon: Brain,
      label: 'Hifz ranges',
      value: ranges.length ? `${ranges.length} saved` : 'Add a range',
      sub: dueCount > 0 ? `${dueCount} due for review` : 'Custom memorization',
      color: 'text-primary bg-primary/10',
    },
    {
      href: nextRange ? '/hifz-planner' : '/hifz-planner',
      icon: RotateCcw,
      label: 'Revision',
      value: nextRange
        ? nextRange.label?.trim() || nextRange.surah.name_simple
        : 'No ranges yet',
      sub: nextRange
        ? `Juz ${nextRange.juz} · ${nextRange.startAyah}–${nextRange.endAyah}`
        : 'Create a range to start',
      color: 'text-amber-700 bg-amber-100',
    },
    {
      href: '/hifz-planner',
      icon: Flame,
      label: 'Daily plan',
      value: plan ? `${plan.streak ?? 0} day streak` : 'Set a goal',
      sub: plan
        ? `Next: ${plan.currentSurah}:${plan.currentAyah} · ${plan.dailyAmount} ayahs/day`
        : 'Verse-by-verse plan',
      color: 'text-blue-700 bg-blue-100',
    },
    {
      href: '/tracker',
      icon: Target,
      label: 'Pages today',
      value: `${pagesToday} / ${pageGoal}`,
      sub: pagesToday >= pageGoal ? 'Daily goal met!' : `${pagePct}% of daily goal`,
      color: 'text-emerald-700 bg-emerald-100',
    },
    {
      href: '/quran/juz',
      icon: Bookmark,
      label: 'Saved ayahs',
      value: `${bookmarks.length}`,
      sub: bookmarks.length ? 'Tap to browse juz index' : 'Bookmark while reading',
      color: 'text-orange-700 bg-orange-100',
    },
    {
      href: progress ? '/quran' : '/quran/mushaf',
      icon: BookOpen,
      label: 'Reading mode',
      value: progress
        ? progress.mode === 'mushaf'
          ? `Page ${progress.mushafPage}`
          : progress.mode === 'juz'
            ? `Juz ${progress.juzId}`
            : `Surah ${progress.surahId}`
        : 'Start reading',
      sub: progress?.activity === 'prayer' ? 'Prayer spot saved' : 'Auto-saved progress',
      color: 'text-teal-700 bg-teal-100',
    },
  ];

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Learning dashboard</h2>
        <Link
          href="/hifz-planner"
          className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
        >
          Hifz Companion
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="flex flex-col gap-2 p-3 sm:p-4 rounded-xl border border-border bg-surface hover:border-primary/40 hover:shadow-sm transition-all min-h-[96px]"
          >
            <div className={`inline-flex self-start p-2 rounded-lg ${tile.color}`}>
              <tile.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{tile.label}</p>
              <p className="text-sm sm:text-base font-bold text-foreground truncate">{tile.value}</p>
              <p className="text-[11px] text-muted truncate mt-0.5">{tile.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
