type RawSegment = [number, number | null | undefined, number | null | undefined];

export type AyahTimestamp = {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
  segments: RawSegment[];
};

type ChapterTimestampsResponse = {
  audio_file?: {
    timestamps?: AyahTimestamp[];
  };
};

const chapterCache = new Map<string, Promise<AyahTimestamp[]>>();

function cacheKey(reciterId: number, surahId: string): string {
  return `${reciterId}:${surahId}`;
}

/** Word-level start/end (ms) within the ayah-only audio file. */
export function getWordSegmentMs(
  ayahTimestamp: AyahTimestamp,
  wordPosition: number
): { startMs: number; endMs: number } | null {
  const from = ayahTimestamp.timestamp_from;
  let match: { startMs: number; endMs: number } | null = null;

  for (const seg of ayahTimestamp.segments) {
    const [pos, start, end] = seg;
    if (pos !== wordPosition || start == null || end == null) continue;
    const startMs = Math.max(0, start - from);
    const endMs = end - from;
    if (endMs <= startMs) continue;
    match = { startMs, endMs };
    break;
  }

  return match;
}

export async function fetchChapterTimestamps(
  reciterId: number,
  surahId: string,
  signal?: AbortSignal
): Promise<AyahTimestamp[]> {
  const key = cacheKey(reciterId, surahId);
  let pending = chapterCache.get(key);
  if (!pending) {
    pending = (async () => {
      const res = await fetch(
        `https://api.quran.com/api/v4/chapter_recitations/${reciterId}/${surahId}?segments=true`,
        { signal }
      );
      if (!res.ok) return [];
      const data = (await res.json()) as ChapterTimestampsResponse;
      return data.audio_file?.timestamps ?? [];
    })();
    chapterCache.set(key, pending);
    pending.catch(() => chapterCache.delete(key));
  }
  return pending;
}

export async function getWordSegmentForVerse(
  reciterId: number,
  verseKey: string,
  wordPosition: number,
  signal?: AbortSignal
): Promise<{ startMs: number; endMs: number } | null> {
  const [surahId] = verseKey.split(':');
  const timestamps = await fetchChapterTimestamps(reciterId, surahId, signal);
  const ayah = timestamps.find((t) => t.verse_key === verseKey);
  if (!ayah) return null;
  return getWordSegmentMs(ayah, wordPosition);
}
