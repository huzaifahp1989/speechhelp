import {
  getHifzBookmarks,
  getHifzBookmarksByCategory,
  getDueBookmarks,
  daysSinceRevision,
} from '@/lib/hifzBookmarks';
import type { HifzCategory } from '@/types/hifzBookmark';

const STREAK_KEY = 'hifz_revision_streak';
const STREAK_DATE_KEY = 'hifz_revision_streak_date';

export type HifzDashboardStats = {
  sabakCount: number;
  sabakParaCount: number;
  dhorCount: number;
  dueCount: number;
  revisionStreak: number;
  lastRevisionDate: string | null;
  pagesMemorised: number;
  juzMemorised: number;
  completionPercent: number;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function recordRevisionStreak(): void {
  if (typeof window === 'undefined') return;
  const today = todayKey();
  const lastDate = localStorage.getItem(STREAK_DATE_KEY);
  const streak = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10) || 0;

  if (lastDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const nextStreak = lastDate === yesterdayKey ? streak + 1 : 1;
  localStorage.setItem(STREAK_KEY, String(nextStreak));
  localStorage.setItem(STREAK_DATE_KEY, today);
}

export function getRevisionStreak(): number {
  if (typeof window === 'undefined') return 0;
  const lastDate = localStorage.getItem(STREAK_DATE_KEY);
  const today = todayKey();
  if (lastDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastDate !== yesterday.toISOString().slice(0, 10)) return 0;
  }
  return parseInt(localStorage.getItem(STREAK_KEY) || '0', 10) || 0;
}

function estimatePagesFromBookmarks(): number {
  const all = getHifzBookmarks();
  let pages = 0;
  for (const b of all) {
    if (b.scope.kind === 'page') pages += 1;
    else if (b.scope.kind === 'juz') pages += 20;
    else if (b.scope.kind === 'surah') pages += Math.max(1, Math.ceil((b.scope.versesCount ?? 20) / 15));
    else if (b.scope.kind === 'ayah_range') {
      const ayahs = b.scope.endAyah - b.scope.startAyah + 1;
      pages += Math.max(1, Math.ceil(ayahs / 15));
    }
  }
  return pages;
}

function estimateJuzFromBookmarks(): number {
  const juzSet = new Set<number>();
  for (const b of getHifzBookmarks()) {
    if (b.scope.kind === 'juz') juzSet.add(b.scope.juz);
    else if (b.juz) juzSet.add(b.juz);
  }
  return juzSet.size;
}

function getLastRevisionTimestamp(): number | null {
  const all = getHifzBookmarks();
  if (all.length === 0) return null;
  const max = Math.max(...all.map((b) => b.lastRevised ?? 0));
  return max > 0 ? max : null;
}

export function getHifzDashboardStats(): HifzDashboardStats {
  const sabak = getHifzBookmarksByCategory('sabak');
  const sabakPara = getHifzBookmarksByCategory('sabak_para');
  const dhor = getHifzBookmarksByCategory('dhor');
  const all = getHifzBookmarks();
  const due = getDueBookmarks();
  const pagesMemorised = estimatePagesFromBookmarks();
  const juzMemorised = estimateJuzFromBookmarks();
  const totalSlots = 30;
  const completionPercent = Math.min(100, Math.round((juzMemorised / totalSlots) * 100));
  const lastTs = getLastRevisionTimestamp();

  return {
    sabakCount: sabak.length,
    sabakParaCount: sabakPara.length,
    dhorCount: dhor.length,
    dueCount: due.length,
    revisionStreak: getRevisionStreak(),
    lastRevisionDate: lastTs ? new Date(lastTs).toLocaleDateString() : null,
    pagesMemorised,
    juzMemorised,
    completionPercent: all.length > 0 ? completionPercent : 0,
  };
}

export function countOverdueByCategory(category: HifzCategory): number {
  return getHifzBookmarksByCategory(category).filter((b) => {
    const days = daysSinceRevision(b);
    if (days === null) return true;
    const interval = b.reviewIntervalDays ?? (category === 'sabak' ? 1 : category === 'sabak_para' ? 3 : 7);
    return days >= interval;
  }).length;
}
