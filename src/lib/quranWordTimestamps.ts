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

function validSegments(segments: RawSegment[]): [number, number, number][] {
  return segments.filter(
    (s): s is [number, number, number] => s[1] != null && s[2] != null
  );
}

/**
 * Word-level start/end (ms) within the ayah-only audio file.
 * Prefer speakable-word index — segment `position` can drift from API word.position mid-ayah.
 */
export function getWordSegmentMs(
  ayahTimestamp: AyahTimestamp,
  wordIndex: number,
  wordPosition?: number,
  speakableWordCount?: number
): { startMs: number; endMs: number } | null {
  const from = ayahTimestamp.timestamp_from;
  const segs = validSegments(ayahTimestamp.segments);

  if (segs.length === 0) return null;

  // Reject misaligned chapter segments (causes wrong-word playback).
  if (
    speakableWordCount != null &&
    wordIndex >= 0 &&
    segs.length !== speakableWordCount
  ) {
    if (wordPosition != null) {
      const byPos = segs.find((s) => s[0] === wordPosition);
      if (byPos) {
        const startMs = Math.max(0, byPos[1] - from);
        const endMs = byPos[2] - from;
        return endMs > startMs ? { startMs, endMs } : null;
      }
    }
    return null;
  }

  const seg =
    wordIndex >= 0 && wordIndex < segs.length
      ? segs[wordIndex]
      : wordPosition != null
        ? segs.find((s) => s[0] === wordPosition)
        : undefined;

  if (!seg) return null;

  const startMs = Math.max(0, seg[1] - from);
  const endMs = seg[2] - from;
  if (endMs <= startMs) return null;

  return { startMs, endMs };
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
  wordIndex: number,
  wordPosition?: number,
  speakableWordCount?: number,
  signal?: AbortSignal
): Promise<{ startMs: number; endMs: number } | null> {
  const [surahId] = verseKey.split(':');
  const timestamps = await fetchChapterTimestamps(reciterId, surahId, signal);
  const ayah = timestamps.find((t) => t.verse_key === verseKey);
  if (!ayah) return null;
  return getWordSegmentMs(ayah, wordIndex, wordPosition, speakableWordCount);
}
