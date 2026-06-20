'use client';

import type { QuranWord } from '@/types/quranWord';
import TajweedText from '@/components/quran/TajweedText';
import {
  extractTajweedRulesFromMarkup,
  getTajweedRule,
} from '@/data/tajweedRules';

type Props = {
  word: QuranWord;
  tajweedEnabled?: boolean;
  onClose?: () => void;
};

/** Inline word detail — no modal; shown inside the ayah card. */
export default function WordDetailInline({ word, tajweedEnabled = true, onClose }: Props) {
  const rules = extractTajweedRulesFromMarkup(word.text_uthmani_tajweed);
  const isEnd = word.char_type_name === 'end';
  if (isEnd) return null;

  return (
    <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3 sm:p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase text-violet-700 tracking-wide">
          Word · Ayah {word.verse_key}
        </p>
        {onClose && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded"
          >
            Close
          </button>
        )}
      </div>

      <p className="juz-reader-arabic text-right text-slate-900" dir="rtl">
        {tajweedEnabled ? (
          <TajweedText html={word.text_uthmani_tajweed} fallback={word.text_uthmani} />
        ) : (
          word.text_uthmani
        )}
      </p>

      {word.transliteration && (
        <p className="text-xs text-slate-500 italic">{word.transliteration}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/80 border border-slate-100 p-2.5">
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">English</p>
          <p className="text-sm text-slate-800">{word.translationEn || '—'}</p>
        </div>
        <div className="rounded-lg bg-white/80 border border-emerald-100 p-2.5">
          <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1 text-right">Urdu</p>
          <p className="text-sm text-slate-800 font-indopak text-right" dir="rtl">
            {word.translationUr || '—'}
          </p>
        </div>
      </div>

      {rules.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase text-violet-700 mb-1.5">Tajweed rules</p>
          <ul className="space-y-1.5">
            {rules.map((ruleId) => {
              const rule = getTajweedRule(ruleId);
              if (!rule) return null;
              return (
                <li
                  key={ruleId}
                  className="flex items-start gap-2 text-xs text-slate-700 bg-white/70 rounded-lg px-2.5 py-2 border border-slate-100"
                >
                  <span
                    className="mt-0.5 h-3 w-3 shrink-0 rounded-full border border-black/10"
                    style={{ backgroundColor: rule.color }}
                  />
                  <span>
                    <span className="font-semibold text-slate-900">{rule.label}</span>
                    {rule.labelAr && (
                      <span className="font-arabic text-slate-500 mr-1"> · {rule.labelAr}</span>
                    )}
                    <span className="block text-[11px] text-slate-500 mt-0.5">{rule.description}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
