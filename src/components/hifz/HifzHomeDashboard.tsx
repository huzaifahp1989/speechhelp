'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Brain, Clock, Flame, Headphones, Mic, Play, Repeat, RotateCcw, Target } from 'lucide-react';
import { getHifzDashboardStats, type HifzDashboardStats } from '@/lib/hifzStats';
import {
  getHifzSessionHistory,
  HIFZ_SESSIONS_UPDATED,
  syncPendingHifzSessions,
  type HifzSessionLog,
} from '@/lib/hifzSessions';
import { HIFZ_BOOKMARKS_UPDATED } from '@/lib/hifzBookmarks';
import { getRangeProgress, isRangeDueForReview } from '@/lib/hifzRangeProgress';

type Props = {
  onStartToday: () => void;
  onRevision: () => void;
  onRecite: () => void;
  onTest: () => void;
  onProgress: () => void;
};

type DailyPlan = {
  currentSurah?: number;
  currentAyah?: number;
  dailyAmount?: number;
};

type SavedRange = {
  id: string;
  juz: number;
  surah: { id: number; name_simple: string; verses_count?: number };
  startAyah: number;
  endAyah: number;
};

function getMemoryProgress(): { ayahCount: number; completedSurahs: number } {
  try {
    const ranges: unknown = JSON.parse(localStorage.getItem('hifz_ranges') || '[]');
    const progress: unknown = JSON.parse(localStorage.getItem('hifz_range_progress') || '{}');
    if (!Array.isArray(ranges) || !progress || typeof progress !== 'object') {
      return { ayahCount: 0, completedSurahs: 0 };
    }

    const memorized = new Set<string>();
    const completedSurahs = new Set<number>();
    for (const candidate of ranges as SavedRange[]) {
      const rangeProgress = (progress as Record<string, { memorizedAyahs?: string[] }>)[candidate.id];
      const rangeAyahs = new Set(rangeProgress?.memorizedAyahs ?? []);
      for (const verseKey of rangeAyahs) memorized.add(verseKey);

      const verseCount = candidate.surah?.verses_count ?? 0;
      if (
        candidate.startAyah === 1 &&
        verseCount > 0 &&
        candidate.endAyah >= verseCount &&
        Array.from({ length: verseCount }, (_, index) => `${candidate.surah.id}:${index + 1}`)
          .every((verseKey) => rangeAyahs.has(verseKey))
      ) {
        completedSurahs.add(candidate.surah.id);
      }
    }
    return { ayahCount: memorized.size, completedSurahs: completedSurahs.size };
  } catch {
    return { ayahCount: 0, completedSurahs: 0 };
  }
}

function getLocalDayKey(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function HifzHomeDashboard({ onStartToday, onRevision, onRecite, onTest, onProgress }: Props) {
  const [stats, setStats] = useState<HifzDashboardStats | null>(null);
  const [sessions, setSessions] = useState<HifzSessionLog[]>([]);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [memoryProgress, setMemoryProgress] = useState({ ayahCount: 0, completedSurahs: 0 });
  const [dueRangeCount, setDueRangeCount] = useState(0);
  const [trackedRanges, setTrackedRanges] = useState<SavedRange[]>([]);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      setStats(getHifzDashboardStats());
      try {
        const value: unknown = JSON.parse(localStorage.getItem('hifz_plan') || 'null');
        setPlan(value && typeof value === 'object' ? (value as DailyPlan) : null);
      } catch {
        setPlan(null);
      }
      setMemoryProgress(getMemoryProgress());
      try {
        const ranges: unknown = JSON.parse(localStorage.getItem('hifz_ranges') || '[]');
        const validRanges = Array.isArray(ranges)
          ? (ranges as SavedRange[]).filter((range) =>
              typeof range.id === 'string' &&
              typeof range.juz === 'number' &&
              typeof range.surah?.id === 'number' &&
              typeof range.surah?.name_simple === 'string' &&
              typeof range.startAyah === 'number' &&
              typeof range.endAyah === 'number',
            )
          : [];
        setTrackedRanges(validRanges);
        setDueRangeCount(
          validRanges.filter((range) => isRangeDueForReview(range.id)).length,
        );
      } catch {
        setDueRangeCount(0);
        setTrackedRanges([]);
      }
      void getHifzSessionHistory().then((history) => {
        if (active) setSessions(history);
      });
    };

    refresh();
    const syncWhenOnline = () => {
      void syncPendingHifzSessions().then(() => {
        if (active) refresh();
      });
    };
    window.addEventListener('online', syncWhenOnline);
    syncWhenOnline();
    window.addEventListener(HIFZ_SESSIONS_UPDATED, refresh);
    window.addEventListener(HIFZ_BOOKMARKS_UPDATED, refresh);
    window.addEventListener('hifz-range-progress-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      active = false;
      window.removeEventListener('online', syncWhenOnline);
      window.removeEventListener(HIFZ_SESSIONS_UPDATED, refresh);
      window.removeEventListener(HIFZ_BOOKMARKS_UPDATED, refresh);
      window.removeEventListener('hifz-range-progress-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const todaySessions = sessions.filter((session) => session.day === getLocalDayKey());
  const newAyahs = todaySessions
    .filter((session) => session.session_type === 'memorized_new')
    .reduce((total, session) => total + (session.ayat_count ?? 0), 0);
  const revisionAyahs = todaySessions
    .filter((session) => session.session_type === 'recited')
    .reduce((total, session) => total + (session.ayat_count ?? 0), 0);
  const listeningMinutes = todaySessions
    .filter((session) => session.session_type === 'tajweed_listening')
    .reduce((total, session) => total + session.minutes, 0);
  const currentRange = trackedRanges.find((range) =>
    range.surah.id === plan?.currentSurah &&
    range.startAyah <= (plan?.currentAyah ?? 0) &&
    range.endAyah >= (plan?.currentAyah ?? 0),
  );
  const progressTiles = [
    { label: 'Ayahs memorised', value: memoryProgress.ayahCount, icon: BookOpen },
    { label: 'Surahs completed', value: memoryProgress.completedSurahs, icon: BookOpen },
    { label: 'Juz bookmarked', value: stats?.juzMemorised ?? 0, icon: BookOpen },
    { label: 'Current Surah', value: plan?.currentSurah ? `Surah ${plan.currentSurah}` : 'Not set', icon: BookOpen },
    { label: 'Current Juz', value: currentRange ? `Juz ${currentRange.juz}` : 'Not set', icon: BookOpen },
    { label: 'Current streak', value: `${stats?.revisionStreak ?? 0} days`, icon: Flame },
    { label: 'Revision due', value: stats?.dueCount ?? 0, icon: RotateCcw },
    { label: 'Ranges due', value: dueRangeCount, icon: RotateCcw },
    { label: 'Daily target', value: plan?.dailyAmount ? `${plan.dailyAmount} ayahs` : 'Not set', icon: Target },
  ];

  return (
    <section className="space-y-4 sm:space-y-5" aria-labelledby="hifz-dashboard-title">
      <div className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-surface to-surface p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Hifz dashboard</p>
          <h2 id="hifz-dashboard-title" className="mt-1 text-xl font-extrabold text-foreground sm:text-2xl">
            Today&apos;s Hifz
          </h2>
          <p className="mt-1 text-sm text-muted">
            {plan?.currentSurah && plan.currentAyah
              ? `Continue from Surah ${plan.currentSurah}, ayah ${plan.currentAyah}${currentRange ? ` · Juz ${currentRange.juz}` : ''}.`
              : 'Set a daily target and build a steady revision routine.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onStartToday}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-primary-light"
        >
          <Play className="h-5 w-5 fill-current" />
          Start Today&apos;s Hifz
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'New ayahs', value: newAyahs },
          { label: 'Revision ayahs', value: revisionAyahs },
          { label: 'Listening', value: `${listeningMinutes} min` },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-surface p-3 sm:p-4">
            <p className="text-[11px] font-semibold text-muted sm:text-xs">{item.label}</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-foreground sm:text-2xl">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {progressTiles.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-2.5 rounded-xl border border-border bg-surface p-3 sm:gap-3 sm:p-4">
            <Icon className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-muted sm:text-xs">{label}</p>
              <p className="truncate text-sm font-bold text-foreground sm:text-base">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <Link
          href="/quran"
          className="flex min-h-[64px] items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-sm font-bold text-foreground hover:border-primary/40 hover:bg-primary/5 sm:px-4"
        >
          <Headphones className="h-5 w-5 shrink-0 text-primary" /> Listen
        </Link>
        <Link href="/quran/mushaf-13" className="flex min-h-[64px] items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-sm font-bold text-foreground hover:border-primary/40 hover:bg-primary/5 sm:px-4">
          <BookOpen className="h-5 w-5 shrink-0 text-primary" /> 13-Line Mushaf
        </Link>
        <Link href="/quran/full-repeat" className="flex min-h-[64px] items-center gap-3 rounded-xl border border-[#12336b]/25 bg-[#12336b]/5 px-3 py-3 text-sm font-bold text-[#12336b] hover:bg-[#12336b]/10 sm:px-4">
          <Repeat className="h-5 w-5 shrink-0" /> Full Repeat
        </Link>
        <button type="button" onClick={onRevision} className="flex min-h-[64px] items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-left text-sm font-bold text-foreground hover:border-primary/40 hover:bg-primary/5 sm:px-4">
          <RotateCcw className="h-5 w-5 shrink-0 text-primary" /> Revision
        </button>
        <button type="button" onClick={onRecite} className="flex min-h-[64px] items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-left text-sm font-bold text-foreground hover:border-primary/40 hover:bg-primary/5 sm:px-4">
          <Mic className="h-5 w-5 shrink-0 text-primary" /> Recite
        </button>
        <button type="button" onClick={onTest} className="flex min-h-[64px] items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-left text-sm font-bold text-foreground hover:border-primary/40 hover:bg-primary/5 sm:px-4">
          <Brain className="h-5 w-5 shrink-0 text-primary" /> Test My Hifz
        </button>
        <button type="button" onClick={onProgress} className="flex min-h-[64px] items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-left text-sm font-bold text-foreground hover:border-primary/40 hover:bg-primary/5 sm:px-4">
          <Target className="h-5 w-5 shrink-0 text-primary" /> My Progress
        </button>
        <div className="flex min-h-[64px] items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-sm font-bold text-foreground sm:px-4">
          <Clock className="h-5 w-5 shrink-0 text-primary" />
          {sessions.length ? `${sessions.length} sessions logged` : 'No sessions yet'}
        </div>
      </div>

      {sessions[0] && (
        <p className="text-xs text-muted">
          Last session: {sessions[0].coverage_text || 'Qur’an practice'} · {sessions[0].minutes} min
        </p>
      )}

      {trackedRanges.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-foreground">Saved Surah and Juz progress</h3>
            <span className="text-xs text-muted">{trackedRanges.length} ranges</span>
          </div>
          {trackedRanges.slice(0, 5).map((range) => {
            const progress = getRangeProgress(range.id);
            const memorizedCount = progress.memorizedAyahs.filter((verseKey) => {
              const [surahId, ayahNumber] = verseKey.split(':').map(Number);
              return surahId === range.surah.id && ayahNumber >= range.startAyah && ayahNumber <= range.endAyah;
            }).length;
            const total = range.endAyah - range.startAyah + 1;
            const percent = total > 0 ? Math.round((memorizedCount / total) * 100) : 0;
            const isDue = isRangeDueForReview(range.id);
            return (
              <div key={range.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-semibold text-foreground">
                    {range.surah.name_simple}
                    <span className="ml-1 font-normal text-muted">· Juz {range.juz}, {range.startAyah}–{range.endAyah}</span>
                  </span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-muted">{percent}%</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-background"
                  role="progressbar"
                  aria-label={`${range.surah.name_simple} memorisation`}
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                </div>
                <p className="text-[11px] text-muted">
                  {memorizedCount} of {total} ayahs marked memorised · {isDue ? 'Revision due' : 'Review scheduled'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}