'use client';

import clsx from 'clsx';
import { useMemo, type KeyboardEvent } from 'react';
import type { QuranWord } from '@/types/quranWord';
import TajweedText from '@/components/quran/TajweedText';
import { extractTajweedRulesFromMarkup } from '@/data/tajweedRules';
import { buildWordTajweedMap } from '@/lib/verseTajweedWords';

type Props = {
  words?: QuranWord[];
  tajweedEnabled?: boolean;
  /** Verse-level tajweed markup — sliced per word for reliable colours on mobile */
  verseTajweedHtml?: string;
  showWordTranslations?: boolean;
  textClassName?: string;
  selectedWordId?: number | null;
  playingWordId?: number | null;
  onWordClick?: (word: QuranWord) => void;
  compact?: boolean;
  /** Invisible tap layer aligned with verse-level tajweed colours */
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
  verseTajweedHtml,
  showWordTranslations = false,
  textClassName = '',
  selectedWordId = null,
  playingWordId = null,
  onWordClick,
  compact = false,
  overlay = false,
}: Props) {
  const wordTajweedMap = useMemo(
    () =>
      words?.length && tajweedEnabled && verseTajweedHtml
        ? buildWordTajweedMap(verseTajweedHtml, words)
        : null,
    [tajweedEnabled, verseTajweedHtml, words]
  );

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
        const wordTajweedHtml = wordTajweedMap?.get(word.id);

        /* Use span (not button) — iOS Safari ignores tajweed colours inside buttons */
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
                    'bg-transparent px-0 py-0 mx-0 transition-none',
                    isPlaying && 'shadow-[inset_0_0_0_2px_#10b981] bg-emerald-50/50',
                    isSelected && !isPlaying && 'shadow-[inset_0_0_0_2px_#a78bfa] bg-violet-50/50'
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
            <span className="inline leading-[inherit]">
              {tajweedEnabled ? (
                <TajweedText
                  html={wordTajweedHtml ?? word.text_uthmani_tajweed}
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
