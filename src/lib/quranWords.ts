import type { AyahWithWords, QuranWord } from '@/types/quranWord';
import { normalizeWordAudioUrl } from '@/lib/quranAudioUrls';

/** Saheeh International (English). */
export const EN_TRANSLATION_ID = 20;
/** Fatah Muhammad Jalandhari (Urdu). */
export const UR_TRANSLATION_ID = 234;

const WORD_FIELDS = 'text_uthmani,text_uthmani_tajweed,audio_url';
const VERSE_FIELDS = 'text_uthmani,text_uthmani_tajweed,text_imlaei_simple';

type ApiWord = {
  id: number;
  position: number;
  char_type_name: string;
  text_uthmani: string;
  text_uthmani_tajweed?: string;
  audio_url?: string;
  translation?: { text: string };
  transliteration?: { text: string };
};

type ApiVerse = {
  id: number;
  verse_key: string;
  text_uthmani: string;
  text_uthmani_tajweed?: string;
  text_imlaei_simple?: string;
  words?: ApiWord[];
  translations?: { text: string; resource_id?: number }[];
};

function stripHtml(html: string): string {
  return html.replace(/<sup[^>]*>.*?<\/sup>/gi, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function mapWord(w: ApiWord, verseKey: string): QuranWord {
  return {
    id: w.id,
    position: w.position,
    verse_key: verseKey,
    char_type_name: w.char_type_name,
    text_uthmani: w.text_uthmani,
    text_uthmani_tajweed: w.text_uthmani_tajweed,
    audioUrl: w.audio_url ? normalizeWordAudioUrl(w.audio_url) : undefined,
    translationEn: w.translation?.text?.trim(),
    transliteration: w.transliteration?.text?.trim(),
  };
}

/** Merge EN verses/words with UR word + verse translations. */
export function mergeVersesWithWordTranslations(
  enVerses: ApiVerse[],
  urVerses: ApiVerse[]
): AyahWithWords[] {
  const urByKey = new Map(urVerses.map((v) => [v.verse_key, v]));

  return enVerses.map((v) => {
    const urV = urByKey.get(v.verse_key);
    const urWordsById = new Map(urV?.words?.map((w) => [w.id, w]) ?? []);

    const words: QuranWord[] = (v.words ?? []).map((w) => ({
      ...mapWord(w, v.verse_key),
      translationUr: urWordsById.get(w.id)?.translation?.text?.trim(),
    }));

    const translationUr = urV?.translations?.[0]?.text
      ? stripHtml(urV.translations[0].text)
      : undefined;

    return {
      id: v.id,
      verse_key: v.verse_key,
      text_uthmani: v.text_uthmani,
      text_uthmani_tajweed: v.text_uthmani_tajweed,
      text_imlaei_simple: v.text_imlaei_simple,
      words,
      translations: v.translations,
      translationUr,
      audio: { url: '' },
    };
  });
}

export function buildJuzWordsFetchUrls(juzId: string): { en: string; ur: string } {
  const base = `https://api.quran.com/api/v4/verses/by_juz/${juzId}?words=true&word_fields=${WORD_FIELDS}&fields=${VERSE_FIELDS}&per_page=1000&mushaf=6`;
  return {
    en: `${base}&language=en&translations=${EN_TRANSLATION_ID}`,
    ur: `${base}&language=ur&translations=${UR_TRANSLATION_ID}`,
  };
}

export function buildChapterWordsFetchUrls(chapterId: string): { en: string; ur: string } {
  const base = `https://api.quran.com/api/v4/verses/by_chapter/${chapterId}?words=true&word_fields=${WORD_FIELDS}&fields=${VERSE_FIELDS}&per_page=300`;
  return {
    en: `${base}&language=en&translations=${EN_TRANSLATION_ID}`,
    ur: `${base}&language=ur&translations=${UR_TRANSLATION_ID}`,
  };
}

export async function fetchVersesWithWords(
  urls: { en: string; ur: string },
  signal?: AbortSignal
): Promise<AyahWithWords[]> {
  const [enRes, urRes] = await Promise.all([
    fetch(urls.en, { signal }),
    fetch(urls.ur, { signal }),
  ]);

  if (!enRes.ok) {
    throw new Error(`Failed to fetch verses: ${enRes.status} ${enRes.statusText}`);
  }
  if (!urRes.ok) {
    throw new Error(`Failed to fetch Urdu translations: ${urRes.status} ${urRes.statusText}`);
  }

  const [enData, urData] = await Promise.all([enRes.json(), urRes.json()]);
  return mergeVersesWithWordTranslations(enData.verses ?? [], urData.verses ?? []);
}

export function getSpeakableWordIndex(
  words: QuranWord[] | undefined,
  word: QuranWord
): number {
  if (!words?.length) return -1;
  return words
    .filter((w) => w.char_type_name !== 'end')
    .findIndex((w) => w.id === word.id);
}

export function getAyahTranslationEn(ayah: AyahWithWords): string {
  const raw = ayah.translations?.[0]?.text;
  return raw ? stripHtml(raw) : '';
}
