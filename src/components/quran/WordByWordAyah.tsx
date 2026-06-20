'use client';

import clsx from 'clsx';
import type { KeyboardEvent } from 'react';
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
  /** Transparent tap layer over verse-level tajweed colours */
  overlay?: boolean;
};

function handleWordKeyDown(e: KeyboardEvent, word: QuranWord, onWordClick?: (word: QuranWord) => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.stopPropagation();
    onWordClick?.(word);
  }
}

export default function WordByWordAyah({
  words,
  tajweedEnabled = true,
  showWordTranslations = false,
  textClassName = '',
  selectedWordId = null,
  playingWordId = null,
  onWordClick,
  compact = false,
  overlay = false,
}: Props) {
  if (!words?.length) return null;

  return (
    <span
      className={clsx('block leading-[inherit]', textClassName)}
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
                'align-baseline',
                overlay ? 'inline text-[0.72em] text-slate-400 mx-0' : 'text-slate-400',
                !overlay && (compact
                  ? 'inline text-[0.72em] mx-0'
                  : 'inline-flex flex-col items-center mx-1 text-[0.85em] align-middle')
              )}
              aria-hidden={overlay ? undefined : true}
            >
              {word.text_uthmani}
            </span>
          );
        }

        const isSelected = selectedWordId === word.id;
        const isPlaying = playingWordId === word.id;

        return (
          <span
            key={word.id}
            role="button"
            tabIndex={0}
            data-quran-word
            onClick={(e) => {
              e.stopPropagation();
              onWordClick?.(word);
            }}
            onKeyDown={(e) => handleWordKeyDown(e, word, onWordClick)}
            className={clsx(
              'inline align-baseline cursor-pointer touch-manipulation select-none rounded-sm',
              overlay
                ? clsx(
                    'px-0 py-0 mx-0',
                    isPlaying && 'shadow-[inset_0_0_0_2px_#10b981] bg-emerald-100/50',
                    isSelected && !isPlaying && 'shadow-[inset_0_0_0_2px_#a78bfa] bg-violet-100/50'
                  )
                : clsx(
                    'transition-colors px-0.5 py-px mx-px',
                    'hover:bg-violet-50/80 active:bg-violet-100 focus:outline-none focus-visible:shadow-[inset_0_0_0_2px_#a78bfa]',
                    isPlaying && 'bg-emerald-50/70 shadow-[inset_0_0_0_2px_#10b981]',
                    isSelected && !isPlaying && 'bg-violet-50/70 shadow-[inset_0_0_0_2px_#a78bfa]',
                    !isSelected && !isPlaying && hasRules && tajweedEnabled && 'decoration-violet-300'
                  )
            )}
            title="Tap to hear pronunciation & see meaning"
          >
            <span
              className={clsx(
                'inline leading-[inherit]',
                overlay && 'text-transparent [-webkit-text-fill-color:transparent]'
              )}
            >
              {tajweedEnabled && !overlay ? (
                <TajweedText
                  html={word.text_uthmani_tajweed}
                  fallback={word.text_uthmani}
                  inline
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
          </span>
        );
      })}
    </span>
  );
}
