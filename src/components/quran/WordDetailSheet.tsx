'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { QuranWord } from '@/types/quranWord';
import TajweedText from '@/components/quran/TajweedText';
import {
  extractTajweedRulesFromMarkup,
  getTajweedRule,
} from '@/data/tajweedRules';

type Props = {
  word: QuranWord | null;
  open: boolean;
  onClose: () => void;
  tajweedEnabled?: boolean;
};

export default function WordDetailSheet({ word, open, onClose, tajweedEnabled = true }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted || !open || !word) return null;

  const rules = extractTajweedRulesFromMarkup(word.text_uthmani_tajweed);
  const isEnd = word.char_type_name === 'end';

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[220] bg-black/40"
        aria-label="Close word details"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Word details"
        className="fixed inset-x-0 bottom-0 z-[221] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[min(85dvh,560px)] overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {word.verse_key ? `Ayah ${word.verse_key}` : 'Word'} · #{word.position}
            </p>
            <p className="text-sm font-semibold text-slate-800">Tap any word for tajweed & translation</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-center py-2">
            <p className="font-arabic text-4xl sm:text-5xl text-slate-900 leading-loose" dir="rtl">
              {tajweedEnabled ? (
                <TajweedText
                  html={word.text_uthmani_tajweed}
                  fallback={word.text_uthmani}
                />
              ) : (
                word.text_uthmani
              )}
            </p>
            {word.transliteration && (
              <p className="text-sm text-slate-500 mt-2 italic">{word.transliteration}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">English</p>
              <p className="text-sm font-medium text-slate-800">
                {word.translationEn || '—'}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Urdu</p>
              <p className="text-sm font-medium text-slate-800 font-indopak" dir="rtl">
                {word.translationUr || '—'}
              </p>
            </div>
          </div>

          {!isEnd && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700 mb-2">
                Tajweed rules {rules.length > 0 ? `(${rules.length})` : ''}
              </p>
              {rules.length === 0 ? (
                <p className="text-sm text-slate-500 rounded-xl bg-slate-50 p-3 border border-slate-100">
                  No special tajweed rule marked on this word — standard pronunciation applies.
                </p>
              ) : (
                <ul className="space-y-2">
                  {rules.map((ruleId) => {
                    const rule = getTajweedRule(ruleId);
                    if (!rule) return null;
                    return (
                      <li
                        key={ruleId}
                        className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 bg-white"
                      >
                        <span
                          className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-black/10"
                          style={{ backgroundColor: rule.color }}
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {rule.label}
                            {rule.labelAr && (
                              <span className="font-arabic text-slate-600 font-normal mr-1"> · {rule.labelAr}</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{rule.description}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
