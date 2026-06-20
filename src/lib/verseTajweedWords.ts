import type { QuranWord } from '@/types/quranWord';

const END_MARKER_RE = /<span class=end>([\s\S]*?)<\/span>/;
const WAQF_RE = /[\u06D6-\u06ED\u06DF-\u06E4\u06E7-\u06EC\u0615-\u061A\u0640]/;

/** Plain Uthmani text without tajweed tags or ayah-end glyph. */
export function stripTajweedTags(html: string): string {
  return html
    .replace(/<span class=end>[\s\S]*?<\/span>/g, '')
    .replace(/<[^>]+>/g, '');
}

function stripWaqf(s: string): string {
  return s.replace(new RegExp(WAQF_RE.source, 'g'), '').replace(/\s+/g, '');
}

function normalizeChar(c: string): string {
  if (c === '\u0672') return '\u0670';
  if (c === '\u06E5') return '\u0653';
  return c;
}

function isSkippablePlainChar(c: string): boolean {
  return c === ' ' || WAQF_RE.test(c);
}

function plainIndexToHtmlIndex(html: string, plainTarget: number): number {
  let plain = 0;
  let i = 0;
  while (i < html.length && plain < plainTarget) {
    if (html[i] === '<') {
      const close = html.indexOf('>', i);
      if (close === -1) break;
      i = close + 1;
      continue;
    }
    plain += 1;
    i += 1;
  }
  return i;
}

function extractEndMarkerHtml(html: string, fromIndex = 0): string | null {
  const slice = html.slice(fromIndex);
  const match = END_MARKER_RE.exec(slice);
  return match ? match[0] : null;
}

function matchWordInPlain(plain: string, start: number, wordPlain: string): number | null {
  const wordCore = stripWaqf(wordPlain);
  if (!wordCore) return start;

  let wi = 0;
  let pi = start;

  while (wi < wordCore.length) {
    while (pi < plain.length && isSkippablePlainChar(plain[pi])) {
      pi += 1;
    }
    if (pi >= plain.length) return null;

    if (normalizeChar(wordCore[wi]) !== normalizeChar(plain[pi])) {
      return null;
    }
    wi += 1;
    pi += 1;
  }

  while (pi < plain.length && isSkippablePlainChar(plain[pi])) {
    pi += 1;
  }

  return pi;
}

/**
 * Map each word id → verse-level tajweed HTML slice (full colours on mobile).
 * Falls back to word-level markup when alignment fails.
 */
export function buildWordTajweedMap(
  verseHtml: string,
  words: QuranWord[]
): Map<number, string> {
  const map = new Map<number, string>();
  const plain = stripTajweedTags(verseHtml);
  let plainPos = 0;
  let htmlPos = 0;

  for (const word of words) {
    if (word.char_type_name === 'end') {
      const endHtml = extractEndMarkerHtml(verseHtml, htmlPos);
      if (endHtml) {
        map.set(word.id, endHtml);
        htmlPos += endHtml.length;
      } else {
        map.set(word.id, word.text_uthmani);
      }
      continue;
    }

    const endPlain = matchWordInPlain(plain, plainPos, word.text_uthmani);
    if (endPlain === null) {
      map.set(
        word.id,
        word.text_uthmani_tajweed && word.text_uthmani_tajweed.length > 0
          ? word.text_uthmani_tajweed
          : word.text_uthmani
      );
      continue;
    }

    const htmlStart = plainIndexToHtmlIndex(verseHtml, plainPos);
    const htmlEnd = plainIndexToHtmlIndex(verseHtml, endPlain);
    map.set(word.id, verseHtml.slice(htmlStart, htmlEnd));
    plainPos = endPlain;
    htmlPos = htmlEnd;
  }

  return map;
}
