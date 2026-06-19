import { getJuzInfo } from '@/data/mushafJuzPages';
import { recordQuranPageRead } from '@/lib/quranTrackerSync';

export type QuranProgressMode = 'juz' | 'surah' | 'mushaf';
export type QuranProgressActivity = 'reading' | 'prayer' | 'listening';

export type QuranReadingProgress = {
  mode: QuranProgressMode;
  verseKey?: string;
  juzId?: number;
  surahId?: number;
  mushafPage?: number;
  surahName?: string;
  juzLabel?: string;
  activity: QuranProgressActivity;
  updatedAt: number;
};

const STORAGE_KEY = 'speechhelp_quran_progress';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function parseProgress(raw: string | null): QuranReadingProgress | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as QuranReadingProgress;
    if (!data?.mode || !data.updatedAt) return null;
    return data;
  } catch {
    return null;
  }
}

/** Migrate legacy keys into unified progress (once). */
function migrateLegacyProgress(): QuranReadingProgress | null {
  if (!isBrowser()) return null;

  try {
    const mushafPage = localStorage.getItem('lastMushafPage');
    const juz = localStorage.getItem('lastReadJuz');
    const surahRaw = localStorage.getItem('lastReadSurah');

    let candidate: QuranReadingProgress | null = null;

    if (surahRaw) {
      const surah = JSON.parse(surahRaw) as { surahId?: number; name?: string; verseKey?: string };
      if (surah?.surahId) {
        candidate = {
          mode: 'surah',
          surahId: surah.surahId,
          surahName: surah.name,
          verseKey: surah.verseKey,
          activity: 'reading',
          updatedAt: Date.now() - 86400000,
        };
      }
    }

    if (juz) {
      const juzId = Number(juz);
      if (Number.isFinite(juzId)) {
        const juzInfo = getJuzInfo(juzId);
        candidate = {
          mode: 'juz',
          juzId,
          juzLabel: juzInfo?.label,
          activity: 'reading',
          updatedAt: Date.now() - 43200000,
        };
      }
    }

    if (mushafPage) {
      const page = Number(mushafPage);
      if (Number.isFinite(page) && page >= 1) {
        candidate = {
          mode: 'mushaf',
          mushafPage: page,
          activity: 'reading',
          updatedAt: Date.now(),
        };
      }
    }

    if (candidate) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(candidate));
    }

    return candidate;
  } catch {
    return null;
  }
}

export function getQuranReadingProgress(): QuranReadingProgress | null {
  if (!isBrowser()) return null;

  const current = parseProgress(localStorage.getItem(STORAGE_KEY));
  if (current) return current;

  return migrateLegacyProgress();
}

export function saveQuranReadingProgress(progress: QuranReadingProgress): void {
  if (!isBrowser()) return;

  const payload: QuranReadingProgress = {
    ...progress,
    updatedAt: Date.now(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

  try {
    if (progress.mode === 'juz' && progress.juzId) {
      localStorage.setItem('lastReadJuz', String(progress.juzId));
    }
    if (progress.mode === 'surah' && progress.surahId) {
      localStorage.setItem(
        'lastReadSurah',
        JSON.stringify({
          surahId: progress.surahId,
          name: progress.surahName,
          verseKey: progress.verseKey,
        })
      );
    }
    if (progress.mode === 'mushaf' && progress.mushafPage) {
      localStorage.setItem('lastMushafPage', String(progress.mushafPage));
    }
  } catch {
    // ignore legacy sync errors
  }

  window.dispatchEvent(new CustomEvent('quran-progress-updated', { detail: payload }));
}

export function clearQuranReadingProgress(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('quran-progress-updated', { detail: null }));
}

export function recordJuzAyah(
  juzId: number,
  verseKey: string,
  activity: QuranProgressActivity = 'listening'
): void {
  const juzInfo = getJuzInfo(juzId);
  const [surahId] = verseKey.split(':').map(Number);

  saveQuranReadingProgress({
    mode: 'juz',
    juzId,
    verseKey,
    surahId: Number.isFinite(surahId) ? surahId : undefined,
    juzLabel: juzInfo?.label,
    activity,
    updatedAt: Date.now(),
  });
}

export function recordJuzVisit(juzId: number): void {
  const juzInfo = getJuzInfo(juzId);
  saveQuranReadingProgress({
    mode: 'juz',
    juzId,
    juzLabel: juzInfo?.label,
    activity: 'reading',
    updatedAt: Date.now(),
  });
}

export function recordSurahVisit(surahId: number, surahName?: string): void {
  saveQuranReadingProgress({
    mode: 'surah',
    surahId,
    surahName,
    activity: 'reading',
    updatedAt: Date.now(),
  });
}

export function recordSurahAyah(
  surahId: number,
  verseKey: string,
  surahName?: string,
  activity: QuranProgressActivity = 'listening'
): void {
  saveQuranReadingProgress({
    mode: 'surah',
    surahId,
    verseKey,
    surahName,
    activity,
    updatedAt: Date.now(),
  });
}

export function recordMushafPage(page: number, activity: QuranProgressActivity = 'reading'): void {
  saveQuranReadingProgress({
    mode: 'mushaf',
    mushafPage: page,
    activity,
    updatedAt: Date.now(),
  });
  recordQuranPageRead(1);
}

export function markPrayerSpot(
  mode: 'juz' | 'surah',
  opts: { juzId?: number; surahId?: number; verseKey: string; surahName?: string; juzLabel?: string }
): void {
  saveQuranReadingProgress({
    mode,
    juzId: opts.juzId,
    surahId: opts.surahId,
    verseKey: opts.verseKey,
    surahName: opts.surahName,
    juzLabel: opts.juzLabel,
    activity: 'prayer',
    updatedAt: Date.now(),
  });
}

export function getProgressResumeUrl(progress: QuranReadingProgress): string {
  switch (progress.mode) {
    case 'mushaf':
      return `/quran/mushaf/${progress.mushafPage ?? 1}`;
    case 'juz':
      if (progress.verseKey) {
        return `/quran/juz/${progress.juzId}?startingVerse=${progress.verseKey}#verse-${progress.verseKey}`;
      }
      return `/quran/juz/${progress.juzId ?? 1}`;
    case 'surah':
      if (progress.verseKey) {
        return `/quran/${progress.surahId}?startingVerse=${progress.verseKey}#verse-${progress.verseKey}`;
      }
      return `/quran/${progress.surahId ?? 1}`;
    default:
      return '/quran';
  }
}

export function getProgressTitle(progress: QuranReadingProgress): string {
  switch (progress.mode) {
    case 'mushaf':
      return `Mushaf page ${progress.mushafPage ?? '?'}`;
    case 'juz':
      if (progress.verseKey) {
        return `Juz ${progress.juzId} · Ayah ${progress.verseKey}`;
      }
      return progress.juzLabel ?? `Juz ${progress.juzId}`;
    case 'surah':
      if (progress.verseKey) {
        const name = progress.surahName ? `${progress.surahName} ` : '';
        return `${name}Ayah ${progress.verseKey.split(':')[1]}`;
      }
      return progress.surahName ?? `Surah ${progress.surahId}`;
    default:
      return 'Continue reading';
  }
}

export function getProgressSubtitle(progress: QuranReadingProgress): string {
  const activity =
    progress.activity === 'prayer'
      ? 'Last prayer spot'
      : progress.activity === 'listening'
        ? 'Last listened'
        : 'Last read';

  const when = formatRelativeTime(progress.updatedAt);
  return `${activity} · ${when}`;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString();
}
