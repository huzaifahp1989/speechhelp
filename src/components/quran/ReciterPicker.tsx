'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Headphones, X, Check } from 'lucide-react';
import { RECITER_GROUPS, getReciterById } from '@/data/reciters';
import clsx from 'clsx';

type Props = {
  value: number;
  onChange: (id: number) => void;
  variant?: 'inline' | 'toolbar' | 'panel' | 'sticky';
  className?: string;
  /** Hide the "Reciter" label — panel variant only */
  hideLabel?: boolean;
};

export default function ReciterPicker({ value, onChange, variant = 'inline', className, hideLabel = false }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);
  const current = getReciterById(value);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open || variant === 'panel') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, variant]);

  // Portaled mobile sheet is outside rootRef — include mobileSheetRef so taps register
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (mobileSheetRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('click', onOutside);
    return () => document.removeEventListener('click', onOutside);
  }, [open]);

  const selectReciter = (id: number) => {
    onChange(id);
    setOpen(false);
  };

  const label = current?.shortName || current?.name || 'Reciter';

  const reciterById = (id: number) => getReciterById(id)!;

  if (variant === 'panel') {
    return (
      <details
        className={clsx(
          'reciter-panel group relative z-40 w-full min-w-0 rounded-xl border-2 border-slate-200 bg-white shadow-sm open:z-50 open:shadow-lg',
          className
        )}
      >
        <summary className="reciter-panel-summary flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 touch-manipulation select-none">
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
            <Headphones className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            <span className="min-w-0 flex-1">
              {!hideLabel && (
                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Reciter
                </span>
              )}
              <span className="block text-base font-semibold leading-snug text-slate-900 break-words">
                {current?.name ?? 'Choose reciter'}
              </span>
            </span>
          </span>
          <ChevronDown
            className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="border-t border-slate-100 max-h-[min(55dvh,360px)] overflow-y-auto overscroll-contain">
          {RECITER_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {group.label}
              </p>
              {group.ids.map((id) => {
                const r = reciterById(id);
                const selected = id === value;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={(e) => {
                      onChange(id);
                      const details = (e.currentTarget.closest('details') as HTMLDetailsElement | null);
                      if (details) details.open = false;
                    }}
                    className={clsx(
                      'flex w-full items-start justify-between gap-3 border-b border-slate-50 px-4 py-3.5 text-left text-base leading-snug touch-manipulation last:border-0',
                      selected
                        ? 'bg-emerald-50 font-semibold text-emerald-900'
                        : 'text-slate-800 active:bg-slate-50'
                    )}
                  >
                    <span className="min-w-0 flex-1 break-words">{r.name}</span>
                    {selected && <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </details>
    );
  }

  const mobileSheet =
    mounted && open ? (
      createPortal(
        <>
          <button
            type="button"
            className="sm:hidden fixed inset-0 z-[200] bg-black/50 touch-manipulation"
            aria-label="Close reciter list"
            onClick={() => setOpen(false)}
          />
          <div
            ref={mobileSheetRef}
            role="listbox"
            className="sm:hidden fixed inset-x-0 bottom-0 z-[201] flex flex-col bg-white rounded-t-2xl border-t border-slate-200 shadow-2xl max-h-[min(70dvh,480px)] pb-[env(safe-area-inset-bottom,0px)]"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
              <span className="font-bold text-slate-900">Choose reciter</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain p-2 flex-1 min-h-0">
              {RECITER_GROUPS.map((group) => (
                <div key={group.label} className="mb-2 last:mb-0">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {group.label}
                  </p>
                  {group.ids.map((id) => {
                    const r = reciterById(id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        role="option"
                        aria-selected={r.id === value}
                        onClick={() => selectReciter(r.id)}
                        className={clsx(
                          'w-full flex items-center justify-between gap-2 px-3 py-3 rounded-xl text-left text-sm touch-manipulation',
                          r.id === value
                            ? 'bg-emerald-50 text-emerald-800 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                        )}
                      >
                        <span className="min-w-0">{r.name}</span>
                        {r.id === value && <Check className="w-4 h-4 shrink-0 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>,
        document.body
      )
    ) : null;

  return (
    <div ref={rootRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex items-center gap-1.5 font-semibold transition-colors touch-manipulation',
          variant === 'sticky'
            ? 'min-h-[40px] w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 hover:border-emerald-400 justify-between'
            : variant === 'toolbar'
              ? 'h-10 max-w-[7.5rem] sm:max-w-[9rem] px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-emerald-400'
              : 'min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:border-emerald-400 w-full sm:w-auto'
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Headphones className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="truncate text-xs sm:text-sm">{label}</span>
        </span>
        <ChevronDown className={clsx('w-4 h-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {mobileSheet}

      {open && (
        <div
          role="listbox"
          className="hidden sm:block absolute right-0 top-full mt-1 z-[210] w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl py-1"
        >
          {RECITER_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 sticky top-0 bg-white/95 backdrop-blur-sm">
                {group.label}
              </p>
              {group.ids.map((id) => {
                const r = reciterById(id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected={r.id === value}
                    onClick={() => selectReciter(r.id)}
                    className={clsx(
                      'w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm',
                      r.id === value
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <span>{r.name}</span>
                    {r.id === value && <Check className="w-4 h-4 shrink-0 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
