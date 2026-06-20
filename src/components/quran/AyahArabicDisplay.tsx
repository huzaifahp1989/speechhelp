'use client';

import clsx from 'clsx';
import type { QuranWord } from '@/types/quranWord';
import TajweedText from '@/components/quran/TajweedText';
import WordByWordAyah from '@/components/quran/WordByWordAyah';

type Props = {
  words?: QuranWord[];
  textUthmani?: string;
  textUthmaniTajweed?: string | null;
  tajweedEnabled?: boolean;
  compact?: boolean;
  className?: string;
  selectedWordId?: number | null;
  playingWordId?: number | null;
  onWordClick?: (word: QuranWord) => void;
};

/**
 * Renders Arabic ayah text with optional full-verse tajweed colours.
 * When tajweed is on, colours come from verse markup; an invisible word layer keeps tap targets.
 */
export default function AyahArabicDisplay({
  words,
  textUthmani = '',
  textUthmaniTajweed,
  tajweedEnabled = true,
  compact = false,
  className = '',
  selectedWordId = null,
  playingWordId = null,
  onWordClick,
}: Props) {
  const hasWords = Boolean(words?.length);
  const hasVerseTajweed =
    tajweedEnabled &&
    Boolean(textUthmaniTajweed?.includes('<tajweed') || textUthmaniTajweed?.includes('<rule'));

  if (hasWords && hasVerseTajweed) {
    return (
      <div className={clsx('juz-ayah-arabic--tajweed-overlay relative', className)} dir="rtl">
        <div className="pointer-events-none select-none text-right" aria-hidden>
          <TajweedText html={textUthmaniTajweed} fallback={textUthmani} />
        </div>
        <div className="absolute inset-0 z-[1] text-right text-transparent">
          <WordByWordAyah
            words={words}
            tajweedEnabled={false}
            compact
            overlay
            selectedWordId={selectedWordId}
            playingWordId={playingWordId}
            onWordClick={onWordClick}
          />
        </div>
      </div>
    );
  }

  if (hasWords) {
    return (
      <div className={className} dir="rtl">
        <WordByWordAyah
          words={words}
          tajweedEnabled={tajweedEnabled}
          compact={compact}
          selectedWordId={selectedWordId}
          playingWordId={playingWordId}
          onWordClick={onWordClick}
        />
      </div>
    );
  }

  if (tajweedEnabled && textUthmaniTajweed) {
    return (
      <div className={className} dir="rtl">
        <TajweedText html={textUthmaniTajweed} fallback={textUthmani} />
      </div>
    );
  }

  return (
    <div className={className} dir="rtl">
      {textUthmani}
    </div>
  );
}
