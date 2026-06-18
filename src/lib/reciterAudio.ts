import { getReciterById } from '@/data/reciters';
import {
  buildEveryAyahAudioUrl,
  normalizeQuranAudioUrl,
} from '@/lib/quranAudioUrls';

const PREVIEW_VERSE = '1:1';

/** Build or fetch a short preview clip URL (Al-Fatiha 1:1) for a reciter. */
export async function getReciterPreviewUrl(reciterId: number): Promise<string | null> {
  const reciter = getReciterById(reciterId);
  if (!reciter) return null;

  if (reciter.urlPrefix) {
    return buildEveryAyahAudioUrl(reciter.urlPrefix, PREVIEW_VERSE);
  }

  try {
    let res = await fetch(
      `https://api.quran.com/api/v4/recitations/${reciterId}/by_ayah/${PREVIEW_VERSE}`
    );
    if (res.ok) {
      const data = await res.json();
      const url = data.audio_files?.[0]?.url;
      if (url) return normalizeQuranAudioUrl(url);
    }

    res = await fetch(
      `https://api.quran.com/api/v4/recitations/${reciterId}/by_chapter/1?per_page=1`
    );
    if (res.ok) {
      const data = await res.json();
      const url = data.audio_files?.[0]?.url;
      if (url) return normalizeQuranAudioUrl(url);
    }
  } catch {
    /* fall through */
  }

  return null;
}

export const RECITER_STORAGE_KEY = 'quran_preferred_reciter';

export function getStoredReciterId(): number {
  if (typeof window === 'undefined') return 7;
  try {
    const raw = localStorage.getItem(RECITER_STORAGE_KEY);
    if (raw) {
      const id = Number(raw);
      if (getReciterById(id)) return id;
    }
  } catch { /* ignore */ }
  return 7;
}

export function storeReciterId(id: number): void {
  try {
    localStorage.setItem(RECITER_STORAGE_KEY, String(id));
  } catch { /* ignore */ }
}
