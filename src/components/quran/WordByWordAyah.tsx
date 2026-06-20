'use client';

import clsx from 'clsx';
import type { QuranWord } from '@/types/quranWord';
import TajweedText from '@/components/quran/TajweedText';
import { extractTajweedRulesFromMarkup } from '@/data/tajweedRules';

type Props = {
  words?: QuranWord[];
  tajweedEnabled?: boolean;
  showWordTranslations?: boolean;
  textClassName?: string;
  selectedWordId?: number | null;
  playingWordId?: number | null;
  onWordClick?: (word: QuranWord) => void;
  compact?: boolean;
};

export default function WordByWordAyah({
  words,
  tajweedEnabled = true,
  showWordTranslations = false,
  textClassName = '',
  selectedWordId = null,
  playingWordId = null,
  onWordClick,
  compact = false,
}: Props) {
  if (!words?.length) return null;

  return (
    <span
      className={clsx(
        compact ? 'inline-block w-full' : 'inline leading-[inherit]',
        textClassName
      )}
      dir="rtl"
    >
      {words.map((word) => {
        const isEnd = word.char_type_name === 'end';
        const hasRules = extractTajweedRulesFromMarkup(word.text_uthmani_tajweed).length > 0;

        if (isEnd) {
          return (
            <span
              key={word.id}
              className={clsx(
                'text-slate-400 align-baseline',
                compact
                  ? 'inline text-[0.72em] mx-0'
                  : 'inline-flex flex-col items-center mx-1 text-[0.85em] align-middle'
              )}
              aria-hidden
            >
              {word.text_uthmani}
            </span>
          );
        }

        const isSelected = selectedWordId === word.id;
        const isPlaying = playingWordId === word.id;

        return (
          <button
            key={word.id}
            type="button"
            data-quran-word
            onClick={(e) => {
              e.stopPropagation();
              onWordClick?.(word);
            }}
            className={clsx(
              'inline align-baseline border-0 bg-transparent cursor-pointer transition-colors touch-manipulation',
              compact ? 'px-0 py-0 mx-0 rounded-none' : 'px-0 py-0 mx-0 rounded-sm',
              'hover:bg-violet-50/80 active:bg-violet-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
              isPlaying && 'bg-emerald-100 ring-2 ring-emerald-500',
              isSelected && !isPlaying && 'bg-violet-100 ring-2 ring-violet-400',
              !isSelected && !isPlaying && hasRules && tajweedEnabled && 'decoration-violet-300'
            )}
            title="Tap to hear pronunciation & see meaning"
          >
            <span className={clsx(compact ? 'font-inherit text-[1em]' : 'font-arabic text-[1em]', 'leading-[inherit]')}>
              {tajweedEnabled ? (
                <TajweedText
                  html={word.text_uthmani_tajweed}
                  fallback={word.text_uthmani}
                />
              ) : (
                word.text_uthmani
              )}
            </span>
            {showWordTranslations && (
              <span className="mt-0.5 w-full text-center leading-tight space-y-0.5">
                {word.translationEn && (
                  <span className="block text-[9px] sm:text-[10px] text-slate-500 truncate max-w-full px-0.5">
                    {word.translationEn}
                  </span>
                )}
                {word.translationUr && (
                  <span
                    className="block text-[9px] sm:text-[10px] text-emerald-700 truncate max-w-full px-0.5"
                    dir="rtl"
                  >
                    {word.translationUr}
                  </span>
                )}
              </span>
            )}
          </button>
        );
      })}
    </span>
  );
}
