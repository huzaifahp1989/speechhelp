'use client';

import {
  BookMarked,
  Flame,
  Target,
  TrendingUp,
  Calendar,
  Layers,
} from 'lucide-react';
import { getHifzDashboardStats } from '@/lib/hifzStats';
import { useEffect, useState } from 'react';
import { HIFZ_BOOKMARKS_UPDATED } from '@/lib/hifzBookmarks';
import type { HifzDashboardStats } from '@/lib/hifzStats';

export default function HifzProgressDashboard() {
  const [stats, setStats] = useState<HifzDashboardStats | null>(null);

  useEffect(() => {
    const refresh = () => setStats(getHifzDashboardStats());
    refresh();
    window.addEventListener(HIFZ_BOOKMARKS_UPDATED, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(HIFZ_BOOKMARKS_UPDATED, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (!stats) return null;

  const tiles = [
    { label: 'Sabak', value: stats.sabakCount, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { label: 'Sabak Para', value: stats.sabakParaCount, color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { label: 'Dhor', value: stats.dhorCount, color: 'text-purple-700 bg-purple-50 border-purple-200' },
    { label: 'Due now', value: stats.dueCount, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  ];

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Hifz Progress</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-xl border p-3 text-center ${t.color}`}>
            <p className="text-2xl font-extrabold">{t.value}</p>
            <p className="text-xs font-semibold mt-0.5">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
          <Flame className="h-5 w-5 text-orange-500 shrink-0" />
          <div>
            <p className="font-bold text-foreground">{stats.revisionStreak} day streak</p>
            <p className="text-xs text-muted">Consecutive revision days</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
          <Calendar className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="font-bold text-foreground">{stats.lastRevisionDate ?? 'Not yet'}</p>
            <p className="text-xs text-muted">Last revision date</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
          <BookMarked className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="font-bold text-foreground">~{stats.pagesMemorised} pages</p>
            <p className="text-xs text-muted">Estimated from bookmarks</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
          <Layers className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="font-bold text-foreground">{stats.juzMemorised} juz · {stats.completionPercent}%</p>
            <p className="text-xs text-muted">Toward full Quran</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 flex items-center gap-3">
        <Target className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs font-semibold text-muted mb-1">
            <span>Completion</span>
            <span>{stats.completionPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${stats.completionPercent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
