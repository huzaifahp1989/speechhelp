'use client';

import { MUSHAF_JUZ_PAGES, getJuzEndPage } from '@/data/mushafJuzPages';
import clsx from 'clsx';

type Props = {
  selectedJuz?: number;
  onSelectJuz: (juz: number, startPage: number) => void;
  compact?: boolean;
};

export default function MushafJuzPicker({ selectedJuz, onSelectJuz, compact = false }: Props) {
  return (
    <div
      className={clsx(
        'grid gap-2',
        compact ? 'grid-cols-5 sm:grid-cols-6' : 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6'
      )}
    >
      {MUSHAF_JUZ_PAGES.map((juz) => {
        const endPage = getJuzEndPage(juz.juz);
        const isSelected = selectedJuz === juz.juz;

        return (
          <button
            key={juz.juz}
            type="button"
            onClick={() => onSelectJuz(juz.juz, juz.startPage)}
            className={clsx(
              'rounded-xl border text-left transition-all',
              compact ? 'p-2' : 'p-3 sm:p-4',
              isSelected
                ? 'bg-[#0d4f4f] border-[#0d4f4f] text-white shadow-md'
                : 'bg-[#fffef9] border-[#d4c4a0]/60 text-[#1a2e1a] hover:border-[#0d4f4f] hover:shadow-sm'
            )}
          >
            <div className={clsx('font-bold', compact ? 'text-sm' : 'text-lg')}>
              {juz.juz}
            </div>
            {!compact && (
              <>
                <div
                  className={clsx(
                    'text-xs mt-0.5 truncate',
                    isSelected ? 'text-[#a8c4b8]' : 'text-[#5a6b5a]'
                  )}
                >
                  {juz.label.split(' — ')[1]}
                </div>
                <div
                  className={clsx(
                    'text-[10px] mt-1 font-medium',
                    isSelected ? 'text-[#c9a227]' : 'text-[#5a6b5a]'
                  )}
                >
                  pp. {juz.startPage}–{endPage}
                </div>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
