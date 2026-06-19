type RawSegment = [number, number | null | undefined, number | null | undefined];

export type AyahTimestamp = {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
  segments: RawSegment[];
};

type ChapterTimestampsResponse = {
  audio_file?: {
    audio_url?: string;
    timestamps?: AyahTimestamp[];
  };
};

type ChapterRecitation = {
  audioUrl: string;
  timestamps: AyahTimestamp[];
};

const chapterCache = new Map<string, Promise<ChapterRecitation | null>>();

function normalizeChapterAudioUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://download.quranicaudio.com/${trimmed.replace(/^\//, '')}`;
}

function cacheKey(reciterId: number, surahId: string): string {
  return `${reciterId}:${surahId}`;
}

function validSegments(segments: RawSegment[]): [number, number, number][] {
  return segments.filter(
    (s): s is [number, number, number] => s[1] != null && s[2] != null
  );
}

/**
 * Word-level start/end (ms) in the chapter recitation file.
 * Always match API word.position — segment array index can drift from speakable-word index.
 */
export function getWordSegmentMs(
  ayahTimestamp: AyahTimestamp,
  wordIndex: number,
  wordPosition?: number
): { startMs: number; endMs: number } | null {
  const segs = validSegments(ayahTimestamp.segments);

  if (segs.length === 0) return null;

  let seg: [number, number, number] | undefined;

  if (wordPosition != null) {
    const matching = segs.filter((s) => s[0] === wordPosition);
    if (matching.length > 0) {
      // Extra segments can repeat the same position; the spoken word uses the first match.
      seg = matching[0];
    }
  }

  if (!seg && wordIndex >= 0 && wordIndex < segs.length) {
    const candidate = segs[wordIndex];
    if (wordPosition == null || candidate[0] === wordPosition) {
      seg = candidate;
    }
  }

  if (!seg) return null;

  const startMs = seg[1];
  const endMs = seg[2];
  if (endMs <= startMs) return null;

  return { startMs, endMs };
}

export async function fetchChapterRecitation(
  reciterId: number,
  surahId: string,
  signal?: AbortSignal
): Promise<ChapterRecitation | null> {
  const key = cacheKey(reciterId, surahId);
  let pending = chapterCache.get(key);
  if (!pending) {
    pending = (async () => {
      const res = await fetch(
        `https://api.quran.com/api/v4/chapter_recitations/${reciterId}/${surahId}?segments=true`,
        { signal }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as ChapterTimestampsResponse;
      const rawUrl = data.audio_file?.audio_url;
      if (!rawUrl) return null;
      return {
        audioUrl: normalizeChapterAudioUrl(rawUrl),
        timestamps: data.audio_file?.timestamps ?? [],
      };
    })();
    chapterCache.set(key, pending);
    pending.catch(() => chapterCache.delete(key));
  }
  return pending;
}

/** @deprecated Use fetchChapterRecitation */
export async function fetchChapterTimestamps(
  reciterId: number,
  surahId: string,
  signal?: AbortSignal
): Promise<AyahTimestamp[]> {
  const recitation = await fetchChapterRecitation(reciterId, surahId, signal);
  return recitation?.timestamps ?? [];
}

export type WordSegmentPlayback = {
  startMs: number;
  endMs: number;
  audioUrl: string;
};

export async function getWordSegmentForVerse(
  reciterId: number,
  verseKey: string,
  wordIndex: number,
  wordPosition?: number,
  _speakableWordCount?: number,
  signal?: AbortSignal
): Promise<WordSegmentPlayback | null> {
  const [surahId] = verseKey.split(':');
  const recitation = await fetchChapterRecitation(reciterId, surahId, signal);
  if (!recitation) return null;
  const ayah = recitation.timestamps.find((t) => t.verse_key === verseKey);
  if (!ayah) return null;
  const segment = getWordSegmentMs(ayah, wordIndex, wordPosition);
  if (!segment) return null;
  return { ...segment, audioUrl: recitation.audioUrl };
}
