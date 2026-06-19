import type { AyahWithWords } from '@/types/quranWord';
import { cleanSpeechText, extractKeywords, findBestMatch } from '@/utils/voiceSearchLogic';
import { calculateMatchScore, fetchQuranSearchResults, type SearchResultApiItem } from '@/utils/quranSearch';

export type JuzAyahSearchHit = {
  verse_key: string;
  arabic: string;
  english?: string;
  urdu?: string;
  score: number;
};

function stripHtml(html: string): string {
  return html.replace(/<sup[^>]*>.*?<\/sup>/gi, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function collectSearchTexts(ayah: AyahWithWords): string[] {
  const parts: string[] = [];
  if (ayah.text_uthmani) parts.push(ayah.text_uthmani);
  if (ayah.text_imlaei_simple) parts.push(ayah.text_imlaei_simple);
  const en = ayah.translations?.[0]?.text;
  if (en) parts.push(stripHtml(en));
  if (ayah.translationUr) parts.push(ayah.translationUr);
  for (const w of ayah.words ?? []) {
    if (w.char_type_name === 'end') continue;
    parts.push(w.text_uthmani);
    if (w.translationEn) parts.push(w.translationEn);
    if (w.translationUr) parts.push(w.translationUr);
    if (w.transliteration) parts.push(w.transliteration);
  }
  return parts.filter(Boolean);
}

/** Search loaded juz ayahs by Arabic, English, or Urdu text. */
export function searchJuzAyahsLocal(
  ayahs: AyahWithWords[],
  rawQuery: string
): JuzAyahSearchHit[] {
  const query = rawQuery.trim();
  if (!query) return [];

  const verseKeyMatch = query.match(/^(\d{1,3})\s*[:٫،\s]\s*(\d{1,3})$/);
  if (verseKeyMatch) {
    const key = `${verseKeyMatch[1]}:${verseKeyMatch[2]}`;
    const ayah = ayahs.find((a) => a.verse_key === key);
    if (ayah) {
      return [
        {
          verse_key: key,
          arabic: ayah.text_uthmani,
          english: stripHtml(ayah.translations?.[0]?.text ?? ''),
          urdu: ayah.translationUr,
          score: 1,
        },
      ];
    }
  }

  const isArabic = /[\u0600-\u06FF]/.test(query);
  const cleaned = cleanSpeechText(query, isArabic);
  let keywords = extractKeywords(cleaned);
  if (keywords.length === 0 && cleaned) keywords = [cleaned];

  const hits: JuzAyahSearchHit[] = [];

  for (const ayah of ayahs) {
    const texts = collectSearchTexts(ayah);
    let best = 0;
    for (const text of texts) {
      const score = calculateMatchScore(text, keywords);
      if (score > best) best = score;
    }
    if (best > 0.25) {
      hits.push({
        verse_key: ayah.verse_key,
        arabic: ayah.text_uthmani,
        english: stripHtml(ayah.translations?.[0]?.text ?? ''),
        urdu: ayah.translationUr,
        score: best,
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, 20);
}

/** Quran.com API search, filtered to verses in this juz. */
export async function searchJuzAyahsApi(
  ayahs: AyahWithWords[],
  rawQuery: string
): Promise<JuzAyahSearchHit[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const allowed = new Set(ayahs.map((a) => a.verse_key));
  const data = await fetchQuranSearchResults(query, 40);
  const results = (data.search?.results ?? []) as SearchResultApiItem[];

  return results
    .filter((r) => allowed.has(r.verse_key))
    .map((r) => {
      const ayah = ayahs.find((a) => a.verse_key === r.verse_key);
      return {
        verse_key: r.verse_key,
        arabic: (r.text || ayah?.text_uthmani || '').replace(/<\/?em>/g, ''),
        english: stripHtml(r.translations?.[0]?.text ?? ayah?.translations?.[0]?.text ?? ''),
        urdu: ayah?.translationUr,
        score: r._score ?? 0.5,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
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

/** Voice / typed query — local fuzzy ayah match within juz. */
export function matchJuzAyahByVoice(
  ayahs: AyahWithWords[],
  text: string
): string | null {
  const match = findBestMatch(
    text,
    ayahs.map((a) => ({
      verse_key: a.verse_key,
      text_uthmani: a.text_uthmani,
      text_imlaei_simple: a.text_imlaei_simple,
    }))
  );

  if (match?.type === 'ayah' && match.target && ayahs.some((a) => a.verse_key === match.target)) {
    return match.target;
  }

  const local = searchJuzAyahsLocal(ayahs, text);
  if (local.length > 0 && local[0].score >= 0.4) {
    return local[0].verse_key;
  }

  return null;
}

export function detectSearchLanguage(query: string): 'ar' | 'en' | 'ur' {
  if (/[\u0600-\u06FF]/.test(query)) return 'ar';
  if (/[\u0750-\u077F]/.test(query)) return 'ur';
  return 'en';
}
