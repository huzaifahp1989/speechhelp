export type MushafSurahEntry = {
  id: number;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  startPage: number;
};

let cache: MushafSurahEntry[] | null = null;

/** Surah list with IndoPak 13-line start pages (mushaf 17). */
export async function fetchMushafSurahIndex(): Promise<MushafSurahEntry[]> {
  if (cache) return cache;

  const res = await fetch(
    'https://api.quran.com/api/v4/chapters?language=en'
  );
  if (!res.ok) throw new Error('Failed to load surah index');

  const data = await res.json();
  const chapters = data.chapters || [];

  cache = chapters.map((c: { id: number; name_simple: string; name_arabic: string; verses_count: number; pages?: number[] }) => ({
    id: c.id,
    name_simple: c.name_simple,
    name_arabic: c.name_arabic,
    verses_count: c.verses_count,
    startPage: Array.isArray(c.pages) ? c.pages[0] : 1,
  }));

  return cache!;
}
