import type { Reciter } from '@/data/reciters';

/** Turn API paths into playable absolute URLs (handles //mirrors.quranicaudio.com/...). */
export function normalizeQuranAudioUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://verses.quran.com/${trimmed.replace(/^\//, '')}`;
}

/** Word-by-word clips (wbw/*.mp3) — use Quran CDN per API docs. */
export function normalizeWordAudioUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('wbw/') || trimmed.includes('/wbw/')) {
    const path = trimmed.replace(/^\//, '');
    return `https://audio.qurancdn.com/${path}`;
  }
  return normalizeQuranAudioUrl(trimmed);
}

export function buildEveryAyahAudioUrl(urlPrefix: string, verseKey: string): string {
  const [surah, ayah] = verseKey.split(':');
  const s = surah.padStart(3, '0');
  const a = ayah.padStart(3, '0');
  return `${urlPrefix.replace(/\/$/, '')}/${s}${a}.mp3`;
}

export function resolveAyahAudio(
  verseKey: string,
  reciter: Reciter | undefined,
  apiRawUrl: string | null | undefined
): { url: string; backupUrl?: string } {
  if (reciter?.urlPrefix) {
    return { url: buildEveryAyahAudioUrl(reciter.urlPrefix, verseKey) };
  }
  if (apiRawUrl) {
    return { url: normalizeQuranAudioUrl(apiRawUrl) };
  }
  return { url: '' };
}

export function mapApiAudioFiles(
  files: { verse_key: string; url: string }[] | undefined
): Map<string, string> {
  const map = new Map<string, string>();
  if (!files) return map;
  for (const file of files) {
    if (file.verse_key && file.url) {
      map.set(file.verse_key, normalizeQuranAudioUrl(file.url));
    }
  }
  return map;
}

/** Unique surah numbers from verse keys like `3:92`. */
export function getUniqueSurahIds(verseKeys: string[]): number[] {
  const ids = new Set<number>();
  for (const key of verseKeys) {
    const surah = Number(key.split(':')[0]);
    if (surah > 0) ids.add(surah);
  }
  return Array.from(ids).sort((a, b) => a - b);
}

/**
 * Fetch recitation audio by chapter (not by_juz) so boundary ayahs match IndoPak juz cuts.
 * Quran.com `by_juz` audio can omit the first/last ayah vs our juz-quarters boundaries.
 */
export async function fetchReciterAudioByChapters(
  reciterId: number,
  surahIds: number[],
  signal?: AbortSignal
): Promise<Map<string, string>> {
  const merged = new Map<string, string>();
  if (surahIds.length === 0) return merged;

  const results = await Promise.all(
    surahIds.map(async (surahId) => {
      const res = await fetch(
        `https://api.quran.com/api/v4/recitations/${reciterId}/by_chapter/${surahId}?per_page=300`,
        { signal }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return mapApiAudioFiles(data.audio_files);
    })
  );

  for (const chapterMap of results) {
    if (!chapterMap) continue;
    for (const [key, url] of chapterMap) {
      merged.set(key, url);
    }
  }

  return merged;
}
