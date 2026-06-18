'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import TajweedText from '@/components/quran/TajweedText';

export type AyahMeaning = {
  verse_key: string;
  text_uthmani: string;
  text_uthmani_tajweed?: string;
  translationEn?: string;
  translationUr?: string;
};

type Props = {
  ayah: AyahMeaning | null;
  open: boolean;
  onClose: () => void;
  tajweedEnabled?: boolean;
};

export default function AyahMeaningSheet({
  ayah,
  open,
  onClose,
  tajweedEnabled = true,
}: Props) {
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

  if (!mounted || !open || !ayah) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[220] bg-black/40"
        aria-label="Close ayah meaning"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Ayah ${ayah.verse_key} meaning`}
        className="fixed inset-x-0 bottom-0 z-[221] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[min(85dvh,640px)] overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white z-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
              Ayah {ayah.verse_key}
            </p>
            <p className="text-sm font-semibold text-slate-800">Full ayah meaning</p>
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

        <div className="p-4 sm:p-5 space-y-4">
          <div className="text-center py-2 px-2 rounded-xl bg-slate-50 border border-slate-100">
            <p
              className="font-arabic text-2xl sm:text-3xl md:text-4xl text-slate-900 leading-[1.9]"
              dir="rtl"
            >
              {tajweedEnabled ? (
                <TajweedText
                  html={ayah.text_uthmani_tajweed}
                  fallback={ayah.text_uthmani}
                />
              ) : (
                ayah.text_uthmani
              )}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">English</p>
            <p className="text-base sm:text-lg text-slate-900 leading-relaxed font-medium">
              {ayah.translationEn || 'Translation unavailable.'}
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
            <p className="text-[10px] font-bold uppercase text-emerald-600 mb-2 text-right">Urdu</p>
            <p
              className="text-base sm:text-lg text-slate-900 leading-loose font-medium font-indopak"
              dir="rtl"
            >
              {ayah.translationUr || 'ترجمہ دستیاب نہیں۔'}
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
