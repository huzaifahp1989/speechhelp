import { getJuzForPage } from '@/data/mushafJuzPages';

export const MUSHAF_ID = 17; // IndoPak 13-line (Qudratullah)
export const TOTAL_MUSHAF_PAGES = 604;
export const LINES_PER_PAGE = 13;
export const ENGLISH_TRANSLATION_ID = 20; // Sahih International

export type MushafLineType = 'surah_name' | 'bismillah' | 'ayah' | 'empty';

export type MushafLine = {
  lineNumber: number;
  text: string;
  type: MushafLineType;
  centered: boolean;
};

export type PageVerse = {
  verseKey: string;
  arabic: string;
  translation: string;
};

type Word = {
  line_number: number;
  text_indopak?: string;
  text_uthmani?: string;
  verse_key?: string;
};

type Verse = {
  verse_key: string;
  text_indopak?: string;
  text_uthmani?: string;
  words?: Word[];
  translations?: { text: string; resource_id?: number }[];
};

type Chapter = {
  id: number;
  name_arabic: string;
  name_simple: string;
  bismillah_pre: boolean;
};

export type MushafPageData = {
  lines: MushafLine[];
  verses: PageVerse[];
  firstVerse: string | null;
  lastVerse: string | null;
  juzNumber: number;
  pageNumber: number;
};

function getWordText(word: Word): string {
  return word.text_indopak || word.text_uthmani || '';
}

function stripHtml(html: string): string {
  return html.replace(/<sup[^>]*>.*?<\/sup>/gi, '').replace(/<[^>]+>/g, '').trim();
}

/** Remap API line numbers (often 1–15 or offset) into exactly 13 display rows. */
function normalizeToThirteenLines(rawLines: MushafLine[]): MushafLine[] {
  const surahLine = rawLines.find((l) => l.type === 'surah_name' && l.text);
  const bismillahLine = rawLines.find((l) => l.type === 'bismillah' && l.text);
  const ayahLines = rawLines
    .filter((l) => l.type === 'ayah' && l.text)
    .sort((a, b) => a.lineNumber - b.lineNumber);

  const result: MushafLine[] = [];
  let ayahIdx = 0;

  for (let row = 1; row <= LINES_PER_PAGE; row += 1) {
    if (row === 1 && surahLine) {
      result.push({ ...surahLine, lineNumber: 1 });
      continue;
    }
    if (row === 2 && bismillahLine) {
      result.push({ ...bismillahLine, lineNumber: 2 });
      continue;
    }
    if (ayahIdx < ayahLines.length) {
      const src = ayahLines[ayahIdx];
      ayahIdx += 1;
      result.push({
        lineNumber: row,
        text: src.text,
        type: 'ayah',
        centered: src.centered,
      });
    } else {
      result.push({ lineNumber: row, text: '', type: 'empty', centered: false });
    }
  }

  return result;
}

export async function fetchMushafPage(pageNumber: number): Promise<MushafPageData> {
  const safePage = Math.max(1, Math.min(TOTAL_MUSHAF_PAGES, pageNumber));

  const res = await fetch(
    `https://api.quran.com/api/v4/verses/by_page/${safePage}?words=true&word_fields=line_number,text_indopak,text_uthmani&translations=${ENGLISH_TRANSLATION_ID}&language=en&per_page=50&mushaf=${MUSHAF_ID}`
  );

  if (!res.ok) {
    throw new Error(`Failed to load page ${safePage}`);
  }

  const data = await res.json();
  const verses: Verse[] = data.verses || [];

  const lineTexts: Record<number, string[]> = {};

  verses.forEach((verse) => {
    verse.words?.forEach((word) => {
      const line = word.line_number;
      if (line >= 1 && line <= 20) {
        if (!lineTexts[line]) lineTexts[line] = [];
        lineTexts[line].push(getWordText(word));
      }
    });
  });

  const rawLineNumbers = Object.keys(lineTexts)
    .map(Number)
    .filter((n) => lineTexts[n]?.join(' ').trim())
    .sort((a, b) => a - b);

  const ayahLinesFromApi: MushafLine[] = rawLineNumbers.map((lineNumber) => ({
    lineNumber,
    text: lineTexts[lineNumber].join(' ').trim(),
    type: 'ayah' as const,
    centered: false,
  }));

  const lines: MushafLine[] = Array.from({ length: LINES_PER_PAGE }, (_, idx) => {
    const lineNumber = idx + 1;
    const match = ayahLinesFromApi.find((l) => l.lineNumber === lineNumber);
    return match ?? { lineNumber, text: '', type: 'empty', centered: false };
  });

  const firstVerse = verses[0]?.verse_key ?? null;
  const lastVerse = verses[verses.length - 1]?.verse_key ?? null;

  if (firstVerse) {
    const [surahId, ayahNum] = firstVerse.split(':');
    if (ayahNum === '1') {
      try {
        const chapterRes = await fetch(
          `https://api.quran.com/api/v4/chapters/${surahId}?language=en`
        );
        if (chapterRes.ok) {
          const chapterData = await chapterRes.json();
          const chapter: Chapter = chapterData.chapter;

          if (!lines[0].text) {
            lines[0] = {
              lineNumber: 1,
              text: `سُورَةُ ${chapter.name_arabic}`,
              type: 'surah_name',
              centered: true,
            };
          }

          if (chapter.bismillah_pre && surahId !== '9') {
            const bismillahLine = lines.find((l) => l.lineNumber === 2 && !l.text);
            if (bismillahLine) {
              bismillahLine.text = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
              bismillahLine.type = 'bismillah';
              bismillahLine.centered = true;
            }
          }
        }
      } catch {
        // Keep API lines only if chapter fetch fails
      }
    }
  }

  const pageVerses: PageVerse[] = verses.map((verse) => ({
    verseKey: verse.verse_key,
    arabic: verse.text_indopak || verse.text_uthmani || verse.words?.map(getWordText).join(' ') || '',
    translation: stripHtml(verse.translations?.[0]?.text || ''),
  }));

  const normalizedLines = normalizeToThirteenLines(lines);

  return {
    lines: normalizedLines,
    verses: pageVerses,
    firstVerse,
    lastVerse,
    juzNumber: getJuzForPage(safePage),
    pageNumber: safePage,
  };
}

export function getSavedMushafPage(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const saved = localStorage.getItem('lastMushafPage');
    const page = saved ? Number(saved) : 1;
    return Number.isFinite(page) && page >= 1 && page <= TOTAL_MUSHAF_PAGES ? page : 1;
  } catch {
    return 1;
  }
}

export function saveMushafPage(page: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('lastMushafPage', String(page));
  } catch {
    // ignore
  }
}

export function getSavedShowTranslation(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('mushafShowTranslation') === 'true';
  } catch {
    return false;
  }
}

export function saveShowTranslation(show: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('mushafShowTranslation', show ? 'true' : 'false');
  } catch {
    // ignore
  }
}
