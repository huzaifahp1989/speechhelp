export type RangeProgress = {
  memorizedAyahs: string[];
  lastPracticed?: number;
};

type ProgressMap = Record<string, RangeProgress>;

const STORAGE_KEY = 'hifz_range_progress';
const REVIEW_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function loadMap(): ProgressMap {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function saveMap(map: ProgressMap): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent('hifz-range-progress-updated'));
}

export function getRangeProgress(rangeId: string): RangeProgress {
  const map = loadMap();
  return map[rangeId] ?? { memorizedAyahs: [] };
}

export function isAyahMemorized(rangeId: string, verseKey: string): boolean {
  return getRangeProgress(rangeId).memorizedAyahs.includes(verseKey);
}

export function toggleAyahMemorized(rangeId: string, verseKey: string): RangeProgress {
  const map = loadMap();
  const current = map[rangeId] ?? { memorizedAyahs: [] };
  const set = new Set(current.memorizedAyahs);
  if (set.has(verseKey)) set.delete(verseKey);
  else set.add(verseKey);
  const next: RangeProgress = { ...current, memorizedAyahs: Array.from(set) };
  map[rangeId] = next;
  saveMap(map);
  return next;
}

export function recordRangePractice(rangeId: string): void {
  const map = loadMap();
  const current = map[rangeId] ?? { memorizedAyahs: [] };
  map[rangeId] = { ...current, lastPracticed: Date.now() };
  saveMap(map);
}

export function getRangeMemorizedCount(rangeId: string): number {
  return getRangeProgress(rangeId).memorizedAyahs.length;
}

export function getRangeMemorizedPercent(rangeId: string, totalAyahs: number): number {
  if (totalAyahs <= 0) return 0;
  return Math.min(100, Math.round((getRangeMemorizedCount(rangeId) / totalAyahs) * 100));
}

export function isRangeDueForReview(rangeId: string): boolean {
  const { lastPracticed } = getRangeProgress(rangeId);
  if (!lastPracticed) return true;
  return Date.now() - lastPracticed >= REVIEW_AFTER_MS;
}

export function sortRangesForRevision<T extends { id: string }>(ranges: T[]): T[] {
  return [...ranges].sort((a, b) => {
    const aTime = getRangeProgress(a.id).lastPracticed ?? 0;
    const bTime = getRangeProgress(b.id).lastPracticed ?? 0;
    if (aTime === bTime) return 0;
    return aTime - bTime;
  });
}

export function countDueRanges(rangeIds: string[]): number {
  return rangeIds.filter(isRangeDueForReview).length;
}

export function formatLastPracticed(timestamp?: number): string {
  if (!timestamp) return 'Never practiced';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Practiced just now';
  if (mins < 60) return `Practiced ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Practiced ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Practiced yesterday';
  if (days < 7) return `Practiced ${days} days ago`;
  return `Practiced ${new Date(timestamp).toLocaleDateString()}`;
}
