export type HifzRecordingMeta = {
  id: string;
  verseKey: string;
  surahId?: number;
  surahName?: string;
  juz?: number;
  durationSec: number;
  mistakeCount: number;
  wordsCompleted: number;
  wordsTotal: number;
  createdAt: number;
  notes?: string;
};

export const HIFZ_RECORDINGS_UPDATED = 'hifz-recordings-updated';
