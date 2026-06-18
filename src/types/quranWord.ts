export type QuranWord = {
  id: number;
  position: number;
  verse_key?: string;
  char_type_name: string;
  text_uthmani: string;
  text_uthmani_tajweed?: string;
  /** Word-by-word recitation (Quran.com wbw/*.mp3). */
  audioUrl?: string;
  translationEn?: string;
  translationUr?: string;
  transliteration?: string;
};

export type AyahWithWords = {
  id: number;
  verse_key: string;
  text_uthmani: string;
  text_uthmani_tajweed?: string;
  text_imlaei_simple?: string;
  words?: QuranWord[];
  translations?: { text: string; resource_id?: number }[];
  translationUr?: string;
  audio: { url: string; backupUrl?: string };
};
