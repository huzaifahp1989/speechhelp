import juzQuartersData from '@/data/juz-quarters.json';
import { JUZ_DATA } from '@/data/juzData';

type QuarterCoords = { start: [number, number]; end: [number, number] };

type JuzQuartersFile = Record<
  string,
  {
    quarter_1: QuarterCoords;
    quarter_2: QuarterCoords;
    quarter_3: QuarterCoords;
    quarter_4: QuarterCoords;
  }
>;

export type JuzBoundary = {
  juz: number;
  label: string;
  startVerse: string;
  endVerse: string;
  startDescription: string;
  endDescription: string;
  quarters: {
    id: 1 | 2 | 3 | 4;
    startVerse: string;
    endVerse: string;
  }[];
};

const quartersFile = juzQuartersData as unknown as JuzQuartersFile;

function toVerseKey(coords: [number, number] | number[]): string {
  return `${coords[0]}:${coords[1]}`;
}

function compareVerseKeys(a: string, b: string): number {
  const [as, aa] = a.split(':').map(Number);
  const [bs, ba] = b.split(':').map(Number);
  if (as !== bs) return as - bs;
  return aa - ba;
}

export function isVerseInRange(verseKey: string, startVerse: string, endVerse: string): boolean {
  return compareVerseKeys(verseKey, startVerse) >= 0 && compareVerseKeys(verseKey, endVerse) <= 0;
}

export function getJuzBoundary(juz: number): JuzBoundary | null {
  const data = quartersFile[`juz_${juz}`];
  const meta = JUZ_DATA.find((j) => j.id === juz);
  if (!data) return null;

  const start = data.quarter_1.start;
  const end = data.quarter_4.end;

  return {
    juz,
    label: meta?.label ?? `Juz ${juz}`,
    startVerse: toVerseKey(start),
    endVerse: toVerseKey(end),
    startDescription: meta?.start ?? toVerseKey(start),
    endDescription: meta?.end ?? toVerseKey(end),
    quarters: ([1, 2, 3, 4] as const).map((q) => {
      const quarter = data[`quarter_${q}`];
      return {
        id: q,
        startVerse: toVerseKey(quarter.start),
        endVerse: toVerseKey(quarter.end),
      };
    }),
  };
}

export function getAllJuzBoundaries(): JuzBoundary[] {
  return Array.from({ length: 30 }, (_, i) => getJuzBoundary(i + 1)).filter(
    (b): b is JuzBoundary => b !== null
  );
}

export function filterAyahsByJuz<T extends { verse_key: string }>(ayahs: T[], juz: number): T[] {
  const boundary = getJuzBoundary(juz);
  if (!boundary) return ayahs;
  return ayahs.filter((a) =>
    isVerseInRange(a.verse_key, boundary.startVerse, boundary.endVerse)
  );
}

export function getQuarterBoundary(juz: number, quarter: 1 | 2 | 3 | 4) {
  const boundary = getJuzBoundary(juz);
  return boundary?.quarters.find((q) => q.id === quarter) ?? null;
}
