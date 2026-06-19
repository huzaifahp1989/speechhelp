import Fuse from 'fuse.js';
import type { AyahWithWords } from '@/types/quranWord';
import { normalizeArabic, normalizePhonetic } from '@/utils/arabic';
import { cleanSpeechText, extractKeywords, levenshteinDistance } from '@/utils/voiceSearchLogic';
import { fetchQuranSearchResults, type SearchResultApiItem } from '@/utils/quranSearch';

export type JuzAyahSearchHit = {
  verse_key: string;
  arabic: string;
  english?: string;
  urdu?: string;
  score: number;
};

const ARABIC_STOP = new Set(['في', 'من', 'الى', 'على', 'ان', 'ما', 'لا', 'هو', 'هي', 'ذلك', 'هذا', 'التي', 'الذي']);
const ENGLISH_STOP = new Set(['the', 'and', 'of', 'in', 'to', 'a', 'is', 'that', 'he', 'his', 'not', 'with', 'for', 'as', 'on', 'be', 'at', 'by', 'or', 'an']);

function stripHtml(html: string): string {
  return html.replace(/<sup[^>]*>.*?<\/sup>/gi, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeTransliteration(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’\-]/g, '')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchLatinText(haystack: string, query: string): number {
  const h = stripHtml(haystack).toLowerCase();
  const q = query.toLowerCase().trim();
  if (!h || !q) return 0;
  if (h === q) return 1;

  const wordBoundary = new RegExp(`\\b${escapeRegex(q)}\\b`, 'i');
  if (wordBoundary.test(h)) return 0.98;

  if (h.includes(q)) return q.length >= 4 ? 0.72 : 0.35;

  const queryWords = q.split(/\s+/).filter((w) => w.length > 0 && !ENGLISH_STOP.has(w));
  if (queryWords.length === 0) return 0;

  const fieldWords = h.split(/\s+/);
  let matched = 0;
  for (const qw of queryWords) {
    const hit = fieldWords.some((fw) => {
      if (fw === qw) return true;
      if (qw.length >= 3 && fw.startsWith(qw)) return true;
      if (qw.length > 3 && fw.length > 3 && levenshteinDistance(fw, qw) <= 1) return true;
      return false;
    });
    if (hit) matched++;
  }

  const coverage = matched / queryWords.length;
  return coverage >= 1 ? 0.92 : coverage * 0.85;
}

function matchArabicText(haystack: string, query: string): number {
  const h = normalizePhonetic(haystack);
  const q = normalizePhonetic(query);
  if (!h || !q) return 0;
  if (h === q) return 1;
  if (q.length < 2) return 0;

  if (h.includes(q)) {
    if (ARABIC_STOP.has(q)) return 0.4;
    const density = q.length / Math.max(h.length, 1);
    return Math.min(0.96, 0.55 + density * 3);
  }

  return 0;
}

function scoreAyahAgainstQuery(ayah: AyahWithWords, rawQuery: string, forVoice = false): number {
  const query = rawQuery.trim();
  if (!query) return 0;

  const isArabic = /[\u0600-\u06FF]/.test(query);
  const cleaned = forVoice ? cleanSpeechText(query, isArabic) : query.trim();
  const effectiveQuery = cleaned || query;
  if (!effectiveQuery) return 0;

  let best = 0;

  if (isArabic) {
    best = Math.max(
      best,
      matchArabicText(ayah.text_uthmani, effectiveQuery),
      matchArabicText(ayah.text_imlaei_simple ?? '', effectiveQuery)
    );
    for (const w of ayah.words ?? []) {
      if (w.char_type_name === 'end') continue;
      const wordScore = matchArabicText(w.text_uthmani, effectiveQuery);
      if (wordScore >= 0.55) best = Math.max(best, Math.min(1, wordScore + 0.15));
    }
  } else {
    const en = stripHtml(ayah.translations?.[0]?.text ?? '');
    best = Math.max(best, matchLatinText(en, effectiveQuery));
    if (ayah.translationUr) {
      best = Math.max(best, matchLatinText(ayah.translationUr, effectiveQuery) * 0.95);
    }

    const normQuery = normalizeTransliteration(effectiveQuery);
    for (const w of ayah.words ?? []) {
      if (w.char_type_name === 'end') continue;
      if (w.translationEn) {
        const s = matchLatinText(w.translationEn, effectiveQuery);
        if (s >= 0.9) best = Math.max(best, 1);
        else best = Math.max(best, s * 0.95);
      }
      if (w.translationUr) {
        best = Math.max(best, matchLatinText(w.translationUr, effectiveQuery) * 0.9);
      }
      if (w.transliteration && normQuery.length >= 2) {
        const tr = normalizeTransliteration(w.transliteration);
        if (tr === normQuery) best = Math.max(best, 0.98);
        else if (tr.includes(normQuery) || normQuery.includes(tr)) {
          best = Math.max(best, normQuery.length >= 3 ? 0.88 : 0.5);
        } else if (normQuery.length > 3 && levenshteinDistance(tr, normQuery) <= 1) {
          best = Math.max(best, 0.82);
        }
      }
    }

    best = Math.max(best, matchLatinText(ayah.text_imlaei_simple ?? '', effectiveQuery) * 0.5);
  }

  return best;
}

function minScoreForQuery(query: string): number {
  const q = query.trim();
  if (!q) return 1;
  const isArabic = /[\u0600-\u06FF]/.test(q);
  const words = isArabic
    ? [normalizeArabic(q)]
    : q.toLowerCase().split(/\s+/).filter((w) => !ENGLISH_STOP.has(w));

  if (words.length === 1 && words[0].length <= 2) return 0.9;
  if (words.length === 1 && words[0].length <= 4) return 0.55;
  return 0.45;
}

function parseVerseKeyQuery(query: string, ayahs: AyahWithWords[]): JuzAyahSearchHit | null {
  const verseKeyMatch = query.trim().match(/^(\d{1,3})\s*[:٫،\s]\s*(\d{1,3})$/);
  if (!verseKeyMatch) return null;

  const key = `${verseKeyMatch[1]}:${verseKeyMatch[2]}`;
  const ayah = ayahs.find((a) => a.verse_key === key);
  if (!ayah) return null;

  return {
    verse_key: key,
    arabic: ayah.text_uthmani,
    english: stripHtml(ayah.translations?.[0]?.text ?? ''),
    urdu: ayah.translationUr,
    score: 1,
  };
}

function toHit(ayah: AyahWithWords, score: number): JuzAyahSearchHit {
  return {
    verse_key: ayah.verse_key,
    arabic: ayah.text_uthmani,
    english: stripHtml(ayah.translations?.[0]?.text ?? ''),
    urdu: ayah.translationUr,
    score,
  };
}

/** Search loaded juz ayahs by Arabic, English, Urdu, or transliteration. */
export function searchJuzAyahsLocal(
  ayahs: AyahWithWords[],
  rawQuery: string,
  forVoice = false
): JuzAyahSearchHit[] {
  const query = rawQuery.trim();
  if (!query) return [];

  const direct = parseVerseKeyQuery(query, ayahs);
  if (direct) return [direct];

  const threshold = minScoreForQuery(query);
  const hits: JuzAyahSearchHit[] = [];

  for (const ayah of ayahs) {
    const score = scoreAyahAgainstQuery(ayah, query, forVoice);
    if (score >= threshold) {
      hits.push(toHit(ayah, score));
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, 20);
}

/** Quran.com API search, filtered and re-scored against verses in this juz. */
export async function searchJuzAyahsApi(
  ayahs: AyahWithWords[],
  rawQuery: string
): Promise<JuzAyahSearchHit[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const allowed = new Set(ayahs.map((a) => a.verse_key));
  const threshold = minScoreForQuery(query);
  const data = await fetchQuranSearchResults(query, 40);
  const results = (data.search?.results ?? []) as SearchResultApiItem[];

  const hits: JuzAyahSearchHit[] = [];

  for (const r of results) {
    if (!allowed.has(r.verse_key)) continue;
    const ayah = ayahs.find((a) => a.verse_key === r.verse_key);
    if (!ayah) continue;

    const localScore = scoreAyahAgainstQuery(ayah, query);
    const score = Math.max(localScore, (r._score ?? 0) * 0.35);
    if (score < threshold) continue;

    hits.push({
      verse_key: r.verse_key,
      arabic: (r.text || ayah.text_uthmani).replace(/<\/?em>/g, ''),
      english: stripHtml(r.translations?.[0]?.text ?? ayah.translations?.[0]?.text ?? ''),
      urdu: ayah.translationUr,
      score,
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, 15);
}

export function mergeJuzSearchHits(
  local: JuzAyahSearchHit[],
  api: JuzAyahSearchHit[]
): JuzAyahSearchHit[] {
  const map = new Map<string, JuzAyahSearchHit>();
  for (const hit of [...local, ...api]) {
    const existing = map.get(hit.verse_key);
    if (!existing || hit.score > existing.score) {
      map.set(hit.verse_key, hit);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}

type JuzSearchDoc = {
  verse_key: string;
  arabic: string;
  english: string;
  urdu: string;
  transliterations: string;
};

function buildJuzFuseDocs(ayahs: AyahWithWords[]): JuzSearchDoc[] {
  return ayahs.map((a) => ({
    verse_key: a.verse_key,
    arabic: normalizePhonetic(a.text_imlaei_simple || a.text_uthmani),
    english: stripHtml(a.translations?.[0]?.text ?? '').toLowerCase(),
    urdu: (a.translationUr ?? '').toLowerCase(),
    transliterations: (a.words ?? [])
      .filter((w) => w.char_type_name !== 'end' && w.transliteration)
      .map((w) => normalizeTransliteration(w.transliteration!))
      .join(' '),
  }));
}

/** Voice / recited query — fuzzy match within this juz only (no global surah routing). */
export function matchJuzAyahByVoice(
  ayahs: AyahWithWords[],
  text: string
): string | null {
  const query = text.trim();
  if (!query || ayahs.length === 0) return null;

  const direct = parseVerseKeyQuery(query, ayahs);
  if (direct) return direct.verse_key;

  const local = searchJuzAyahsLocal(ayahs, query, true);
  if (local.length > 0 && local[0].score >= 0.55) {
    return local[0].verse_key;
  }

  const isArabic = /[\u0600-\u06FF]/.test(query);
  const cleaned = cleanSpeechText(query, isArabic);
  const keywords = extractKeywords(cleaned);
  const fuseQuery = keywords.length > 0 ? keywords.join(' ') : cleaned;
  if (!fuseQuery) return null;

  const fuse = new Fuse(buildJuzFuseDocs(ayahs), {
    includeScore: true,
    keys: isArabic
      ? ['arabic']
      : ['english', 'urdu', 'transliterations', 'arabic'],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: Math.min(3, fuseQuery.length),
  });

  const results = fuse.search(fuseQuery);
  if (results.length === 0) return null;

  const top = results[0];
  if (top.score === undefined || top.score > 0.4) return null;

  const ayah = ayahs.find((a) => a.verse_key === top.item.verse_key);
  if (!ayah) return null;

  const rescored = scoreAyahAgainstQuery(ayah, query, true);
  if (rescored >= 0.45) return top.item.verse_key;

  return null;
}

export function detectSearchLanguage(query: string): 'ar' | 'en' | 'ur' {
  if (/[\u0600-\u06FF]/.test(query)) return 'ar';
  if (/[\u0750-\u077F]/.test(query)) return 'ur';
  return 'en';
}
