import { load } from 'cheerio';
import { NextResponse } from 'next/server';

export const revalidate = 86400;

const SOURCE_LAYOUT_URL = 'https://qul.tarteel.ai/mushaf_layouts/17?page_number=';
const TOTAL_PAGES = 849;

type RouteContext = {
  params: Promise<{ page: string }>;
};

type SourceWord = {
  id: number | null;
  location: string | null;
  verseKey: string | null;
  position: number | null;
  kind: 'word' | 'end' | 'marker';
  text: string;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { page: pageParam } = await params;
  const pageNumber = Number(pageParam);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > TOTAL_PAGES) {
    return NextResponse.json({ error: 'Page must be between 1 and 849.' }, { status: 400 });
  }

  try {
    const response = await fetch(`${SOURCE_LAYOUT_URL}${pageNumber}`, {
      headers: { 'User-Agent': 'IslamMediaCentral/1.0 Quran reader' },
      next: { revalidate },
    });
    if (!response.ok) {
      return NextResponse.json({ error: 'The Mushaf page is temporarily unavailable.' }, { status: 502 });
    }

    const html = await response.text();
    const $ = load(html);
    const pageRoot = $(`#page-${pageNumber}`);
    if (!pageRoot.length) {
      return NextResponse.json({ error: 'Mushaf page not found.' }, { status: 404 });
    }

    const lines = pageRoot.children('.line-container').map((_index, lineContainer) => {
      const container = $(lineContainer);
      const lineNumber = Number(container.attr('data-line'));
      const line = container.children('.line').first();
      const classes = line.attr('class') ?? '';
      const isSurahHeading = classes.includes('line--surah-name');
      const isBismillah = classes.includes('line--bismillah');
      const surahIcon = container.find('.surah-name-v4-icon').first().text().trim();
      const surahNumberMatch = surahIcon.match(/surah(\d+)/i);

      const words: SourceWord[] = container.find('.char').map((_wordIndex, wordElement) => {
        const word = $(wordElement);
        const wordClasses = word.attr('class') ?? '';
        const location = word.attr('data-location') ?? null;
        const verseKey = word.attr('data-ayah') ?? (location ? location.split(':').slice(0, 2).join(':') : null);
        const kind: SourceWord['kind'] = wordClasses.includes('char-word')
          ? 'word'
          : wordClasses.includes('char-end')
            ? 'end'
            : 'marker';

        return {
          id: Number(word.attr('data-word-id')) || null,
          location,
          verseKey,
          position: Number(word.attr('data-position')) || null,
          kind,
          text: word.text().replace(/\s+/g, ' ').trim(),
        };
      }).get();

      return {
        lineNumber,
        lineType: isSurahHeading ? 'surah_name' : isBismillah ? 'bismillah' : 'ayah',
        centered: classes.includes('line--center') || isSurahHeading || isBismillah,
        surahNumber: surahNumberMatch ? Number(surahNumberMatch[1]) : null,
        words,
        text: isBismillah ? container.find('.bismillah').text().trim() : '',
      };
    }).get();

    if (lines.length !== 13 || lines.some((line, index) => line.lineNumber !== index + 1)) {
      return NextResponse.json({ error: 'The source did not return a valid 13-line page.' }, { status: 502 });
    }

    const verseKeys = Array.from(new Set(
      lines.flatMap((line) => line.words.map((word) => word.verseKey).filter((key): key is string => Boolean(key))),
    ));
    const firstVerse = verseKeys[0] ?? null;
    const lastVerse = verseKeys.at(-1) ?? null;
    const firstSurahNumber = lines.find((line) => line.surahNumber)?.surahNumber
      ?? (firstVerse ? Number(firstVerse.split(':')[0]) : null);

    let surahNameEn: string | null = null;
    let surahNameAr: string | null = null;
    let juzNumber: number | null = null;
    let hizbNumber: number | null = null;

    if (firstSurahNumber) {
      try {
        const chapterResponse = await fetch(`https://api.quran.com/api/v4/chapters/${firstSurahNumber}?language=en`, {
          next: { revalidate },
        });
        if (chapterResponse.ok) {
          const chapterData = await chapterResponse.json();
          surahNameEn = chapterData.chapter?.name_simple ?? null;
          surahNameAr = chapterData.chapter?.name_arabic ?? null;
        }
      } catch {
        // Keep the source page available if optional labels are unavailable.
      }
    }

    if (firstVerse) {
      try {
        const verseResponse = await fetch(`https://api.quran.com/api/v4/verses/by_key/${firstVerse}?fields=text_uthmani`, {
          next: { revalidate },
        });
        if (verseResponse.ok) {
          const verseData = await verseResponse.json();
          juzNumber = verseData.verse?.juz_number ?? null;
          hizbNumber = verseData.verse?.hizb_number ?? null;
        }
      } catch {
        // Keep the source page available if optional labels are unavailable.
      }
    }

    return NextResponse.json({
      pageNumber,
      totalPages: TOTAL_PAGES,
      lines,
      verseKeys,
      firstVerse,
      lastVerse,
      surahNumber: firstSurahNumber,
      surahNameEn,
      surahNameAr,
      juzNumber,
      hizbNumber,
      source: 'Quranic Universal Library — Qudratullah Indo-Pak 13-line Mushaf',
      sourceUrl: `https://qul.tarteel.ai/mushaf_layouts/17?page_number=${pageNumber}`,
    });
  } catch {
    return NextResponse.json({ error: 'Could not load the Mushaf page. Please retry.' }, { status: 502 });
  }
}