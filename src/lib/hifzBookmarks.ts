import {
  HIFZ_CATEGORY_META,
  type HifzBookmark,
  type HifzCategory,
  type HifzBookmarkScope,
} from '@/types/hifzBookmark';

const STORAGE_KEY = 'hifz_bookmarks';
export const HIFZ_BOOKMARKS_UPDATED = 'hifz-bookmarks-updated';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function loadAll(): HifzBookmark[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HifzBookmark[]) : [];
  } catch {
    return [];
  }
}

function saveAll(bookmarks: HifzBookmark[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  window.dispatchEvent(new CustomEvent(HIFZ_BOOKMARKS_UPDATED));
}

export function getHifzBookmarks(): HifzBookmark[] {
  return loadAll();
}

export function getHifzBookmarksByCategory(category: HifzCategory): HifzBookmark[] {
  return loadAll().filter((b) => b.category === category);
}

export function getHifzBookmark(id: string): HifzBookmark | undefined {
  return loadAll().find((b) => b.id === id);
}

export function addHifzBookmark(
  input: Omit<HifzBookmark, 'id' | 'createdAt'>
): HifzBookmark {
  const bookmark: HifzBookmark = {
    ...input,
    id: Math.random().toString(36).slice(2, 11),
    createdAt: Date.now(),
  };
  const all = loadAll();
  saveAll([bookmark, ...all]);
  return bookmark;
}

export function updateHifzBookmark(id: string, patch: Partial<HifzBookmark>): HifzBookmark | null {
  const all = loadAll();
  const idx = all.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  const next = { ...all[idx], ...patch, id };
  all[idx] = next;
  saveAll(all);
  return next;
}

export function deleteHifzBookmark(id: string): void {
  saveAll(loadAll().filter((b) => b.id !== id));
}

export function recordBookmarkRevision(id: string): void {
  updateHifzBookmark(id, { lastRevised: Date.now() });
}

export function getReviewIntervalDays(bookmark: HifzBookmark): number {
  return bookmark.reviewIntervalDays ?? HIFZ_CATEGORY_META[bookmark.category].reviewDays;
}

export function daysSinceRevision(bookmark: HifzBookmark): number | null {
  if (!bookmark.lastRevised) return null;
  return Math.floor((Date.now() - bookmark.lastRevised) / (24 * 60 * 60 * 1000));
}

export function isBookmarkDue(bookmark: HifzBookmark): boolean {
  if (!bookmark.lastRevised) return true;
  const interval = getReviewIntervalDays(bookmark);
  const days = daysSinceRevision(bookmark) ?? 0;
  return days >= interval;
}

export function sortBookmarksForRevision(bookmarks: HifzBookmark[]): HifzBookmark[] {
  return [...bookmarks].sort((a, b) => {
    const aTime = a.lastRevised ?? 0;
    const bTime = b.lastRevised ?? 0;
    return aTime - bTime;
  });
}

export function getDueBookmarks(category?: HifzCategory): HifzBookmark[] {
  const list = category ? getHifzBookmarksByCategory(category) : loadAll();
  return sortBookmarksForRevision(list.filter(isBookmarkDue));
}

export function formatBookmarkLabel(bookmark: HifzBookmark): string {
  const { scope } = bookmark;
  switch (scope.kind) {
    case 'ayah_range':
      return `${scope.surahName} · Ayah ${scope.startAyah}–${scope.endAyah}`;
    case 'surah':
      return `Surah ${scope.surahName}`;
    case 'juz':
      return `Juz ${scope.juz}`;
    case 'page':
      return `Page ${scope.page}`;
    default:
      return 'Bookmark';
  }
}

export function formatLastRevised(bookmark: HifzBookmark): string {
  if (!bookmark.lastRevised) return 'Never revised';
  const days = daysSinceRevision(bookmark);
  if (days === 0) return 'Revised today';
  if (days === 1) return 'Revised yesterday';
  if (days !== null && days < 7) return `Revised ${days} days ago`;
  return `Revised ${new Date(bookmark.lastRevised).toLocaleDateString()}`;
}

export type HifzPracticeRange = {
  id: string;
  juz: number;
  surah: { id: number; name_simple: string; verses_count?: number };
  startAyah: number;
  endAyah: number;
};

export function bookmarkToPracticeRange(bookmark: HifzBookmark): HifzPracticeRange | null {
  const juz = bookmark.juz ?? (bookmark.scope.kind === 'juz' ? bookmark.scope.juz : 1);
  if (bookmark.scope.kind === 'ayah_range') {
    return {
      id: bookmark.id,
      juz,
      surah: {
        id: bookmark.scope.surahId,
        name_simple: bookmark.scope.surahName,
        verses_count: bookmark.scope.versesCount,
      },
      startAyah: bookmark.scope.startAyah,
      endAyah: bookmark.scope.endAyah,
    };
  }
  if (bookmark.scope.kind === 'surah') {
    const count = bookmark.scope.versesCount ?? 300;
    return {
      id: bookmark.id,
      juz,
      surah: {
        id: bookmark.scope.surahId,
        name_simple: bookmark.scope.surahName,
        verses_count: count,
      },
      startAyah: 1,
      endAyah: count,
    };
  }
  return null;
}

export function getBookmarkNavigationUrl(
  bookmark: HifzBookmark,
  opts?: { autoplay?: boolean; memorize?: boolean; testMode?: boolean; reciterId?: number }
): string {
  const params = new URLSearchParams();
  if (opts?.autoplay) params.set('autoplay', 'true');
  if (opts?.memorize || opts?.testMode) params.set('memorize', '1');
  if (opts?.testMode) params.set('test', '1');
  if (opts?.reciterId) params.set('reciter', String(opts.reciterId));
  const qs = params.toString() ? `?${params.toString()}` : '';

  if (bookmark.scope.kind === 'juz') {
    return `/quran/juz/${bookmark.scope.juz}${qs}`;
  }
  if (bookmark.scope.kind === 'page') {
    return `/quran/mushaf/${bookmark.scope.page}${qs}`;
  }
  if (bookmark.scope.kind === 'surah') {
    return `/quran/${bookmark.scope.surahId}${qs}`;
  }
  if (bookmark.scope.kind === 'ayah_range') {
    params.set('startingVerse', `${bookmark.scope.surahId}:${bookmark.scope.startAyah}`);
    const qs = params.toString();
    return `/quran/${bookmark.scope.surahId}${qs ? `?${qs}` : ''}`;
  }
  return '/hifz-planner?tab=hifz';
}

export function getLastPracticedBookmark(): HifzBookmark | null {
  const all = loadAll();
  if (all.length === 0) return null;
  return [...all].sort((a, b) => (b.lastRevised ?? 0) - (a.lastRevised ?? 0))[0];
}

export function scopeSummary(scope: HifzBookmarkScope): string {
  switch (scope.kind) {
    case 'ayah_range':
      return `Ayah ${scope.startAyah}–${scope.endAyah}`;
    case 'surah':
      return 'Full surah';
    case 'juz':
      return `Juz ${scope.juz}`;
    case 'page':
      return `Page ${scope.page}`;
    default:
      return '';
  }
}
