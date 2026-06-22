/** Madarsa-style memorisation categories */
export type HifzCategory = 'sabak' | 'sabak_para' | 'dhor';

export const HIFZ_CATEGORY_META: Record<
  HifzCategory,
  { label: string; shortLabel: string; color: string; bg: string; border: string; reviewDays: number }
> = {
  sabak: {
    label: 'Sabak',
    shortLabel: 'Sabak',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    reviewDays: 1,
  },
  sabak_para: {
    label: 'Sabak Para',
    shortLabel: 'Sabak Para',
    color: 'text-blue-800',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    reviewDays: 3,
  },
  dhor: {
    label: 'Dhor',
    shortLabel: 'Dhor',
    color: 'text-purple-800',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    reviewDays: 7,
  },
};

export type HifzBookmarkScope =
  | {
      kind: 'ayah_range';
      surahId: number;
      surahName: string;
      startAyah: number;
      endAyah: number;
      versesCount?: number;
    }
  | { kind: 'surah'; surahId: number; surahName: string; versesCount?: number }
  | { kind: 'juz'; juz: number }
  | { kind: 'page'; page: number };

export type HifzBookmark = {
  id: string;
  category: HifzCategory;
  scope: HifzBookmarkScope;
  juz?: number;
  notes?: string;
  createdAt: number;
  lastRevised?: number;
  /** Override default review interval for this bookmark */
  reviewIntervalDays?: number;
};

export type HifzRepeatCount = 1 | 3 | 5 | 10 | 20 | 'continuous';

export type HifzPlaybackScope = 'single_ayah' | 'ayah_range' | 'full_page' | 'full_bookmark';

export type HifzLearningSettings = {
  highlightCurrentAyah: boolean;
  autoScroll: boolean;
  wordByWordHighlight: boolean;
  hideTranslation: boolean;
  hideQuranText: boolean;
  playbackSpeed: 0.5 | 0.75 | 1 | 1.25;
  repeatCount: HifzRepeatCount;
  playbackScope: HifzPlaybackScope;
  reciterId: number;
};

export const DEFAULT_HIFZ_LEARNING_SETTINGS: HifzLearningSettings = {
  highlightCurrentAyah: true,
  autoScroll: true,
  wordByWordHighlight: false,
  hideTranslation: true,
  hideQuranText: false,
  playbackSpeed: 1,
  repeatCount: 3,
  playbackScope: 'full_bookmark',
  reciterId: 103,
};

/** Future AI / multi-role architecture (local-first today, cloud-ready) */
export type HifzAiFeature =
  | 'voice_recording'
  | 'recitation_check'
  | 'tajweed_detection'
  | 'parent_dashboard'
  | 'teacher_dashboard'
  | 'hifz_reports'
  | 'certificates'
  | 'class_tracking';

export type HifzSessionRecord = {
  id: string;
  bookmarkId: string;
  startedAt: number;
  endedAt?: number;
  ayahsReviewed: string[];
  accuracyScore?: number;
};

export type HifzReminderPrefs = {
  sabakEnabled: boolean;
  sabakParaEnabled: boolean;
  dhorEnabled: boolean;
  dailyGoalEnabled: boolean;
  weeklySummaryEnabled: boolean;
  preferredHour: number;
};

export const DEFAULT_HIFZ_REMINDER_PREFS: HifzReminderPrefs = {
  sabakEnabled: true,
  sabakParaEnabled: true,
  dhorEnabled: true,
  dailyGoalEnabled: true,
  weeklySummaryEnabled: true,
  preferredHour: 17,
};
