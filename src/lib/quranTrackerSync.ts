const TRACKER_EVENT = 'quran-tracker-updated';

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readLocalNumber(key: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(key);
    const n = raw ? Number(raw) : NaN;
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  } catch {
    return 0;
  }
}

function writeLocalNumber(key: string, value: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, String(Math.max(0, Math.floor(value))));
    window.dispatchEvent(new CustomEvent(TRACKER_EVENT));
  } catch {
    // ignore
  }
}

/** Increment today's mushaf / Quran page count (syncs with Tracker). */
export function recordQuranPageRead(pages = 1): number {
  const key = `quran_pages_${todayKey()}`;
  const next = readLocalNumber(key) + Math.max(1, Math.floor(pages));
  writeLocalNumber(key, next);
  return next;
}

export function getTodayQuranPages(): number {
  return readLocalNumber(`quran_pages_${todayKey()}`);
}

export function getDefaultDailyPageGoal(): number {
  if (typeof window === 'undefined') return 4;
  try {
    const raw = localStorage.getItem('tracker_goals_v1');
    if (!raw) return 4;
    const goals = JSON.parse(raw) as { quran?: { pagesDaily?: number } };
    const n = goals?.quran?.pagesDaily;
    return Number.isFinite(n) && n! > 0 ? n! : 4;
  } catch {
    return 4;
  }
}
