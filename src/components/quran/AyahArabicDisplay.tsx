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
  recitingWordId?: number | null;
  mistakeWordIds?: number[];
  correctionWordId?: number | null;
  onWordClick?: (word: QuranWord) => void;
};

function hasTajweedMarkup(html?: string | null): boolean {
  return Boolean(html && (html.includes('<tajweed') || html.includes('<rule')));
}

/**
 * Prefer word-by-word rendering so each tap target is the spoken token.
 * (Verse-level tajweed + transparent overlay drifts when word/verse text differ.)
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
  recitingWordId = null,
  mistakeWordIds,
  correctionWordId = null,
  onWordClick,
}: Props) {
  if (words?.length) {
    return (
      <div className={clsx('juz-reader-arabic', className)} dir="rtl">
        <WordByWordAyah
          words={words}
          tajweedEnabled={tajweedEnabled}
          compact={compact}
          selectedWordId={selectedWordId}
          playingWordId={playingWordId}
          recitingWordId={recitingWordId}
          mistakeWordIds={mistakeWordIds}
          correctionWordId={correctionWordId}
          onWordClick={onWordClick}
        />
      </div>
    );
  }

  const verseTajweed =
    tajweedEnabled && hasTajweedMarkup(textUthmaniTajweed) ? textUthmaniTajweed : undefined;

  if (verseTajweed) {
    return (
      <div className={clsx('juz-reader-arabic', className)} dir="rtl">
        <TajweedText html={verseTajweed} fallback={textUthmani} />
      </div>
    );
  }

  return (
    <div className={clsx('juz-reader-arabic text-slate-900', className)} dir="rtl">
      {textUthmani}
    </div>
  );
}
