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

function hasTajweedMarkup(html?: string | null): boolean {
  return Boolean(html && (html.includes('<tajweed') || html.includes('<rule')));
}

/**
 * Tajweed ON  → full-verse coloured text (reliable on mobile).
 * Tajweed OFF → word-by-word taps for audio & meanings.
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
  const showTajweed = tajweedEnabled && hasTajweedMarkup(textUthmaniTajweed);

  if (showTajweed) {
    return (
      <div className={clsx('juz-reader-arabic', className)} dir="rtl">
        <TajweedText html={textUthmaniTajweed} fallback={textUthmani} />
      </div>
    );
  }

  if (words?.length) {
    return (
      <div className={clsx('juz-reader-arabic', className)} dir="rtl">
        <WordByWordAyah
          words={words}
          tajweedEnabled={false}
          compact={compact}
          selectedWordId={selectedWordId}
          playingWordId={playingWordId}
          onWordClick={onWordClick}
        />
      </div>
    );
  }

  return (
    <div className={clsx('juz-reader-arabic text-slate-900', className)} dir="rtl">
      {textUthmani}
    </div>
  );
}
