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
 * Tajweed ON  → full-verse coloured text + transparent word tap layer.
 * Tajweed OFF → word-by-word plain text with taps.
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
  const verseTajweed =
    tajweedEnabled && hasTajweedMarkup(textUthmaniTajweed) ? textUthmaniTajweed : undefined;

  if (words?.length && verseTajweed) {
    return (
      <div className={clsx('juz-reader-arabic relative', className)} dir="rtl">
        <div className="pointer-events-none select-none" aria-hidden={false}>
          <TajweedText html={verseTajweed} fallback={textUthmani} inline className="block w-full" />
        </div>
        <div className="absolute inset-0 z-[1]">
          <WordByWordAyah
            words={words}
            tajweedEnabled={false}
            overlay
            compact={compact}
            selectedWordId={selectedWordId}
            playingWordId={playingWordId}
            onWordClick={onWordClick}
          />
        </div>
      </div>
    );
  }

  if (words?.length) {
    return (
      <div className={clsx('juz-reader-arabic', className)} dir="rtl">
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
