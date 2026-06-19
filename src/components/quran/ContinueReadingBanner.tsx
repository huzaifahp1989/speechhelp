'use client';

import Link from 'next/link';
import { Bookmark, ChevronRight, Clock, X } from 'lucide-react';
import clsx from 'clsx';
import { useQuranReadingProgress } from '@/hooks/useQuranReadingProgress';
import {
  getProgressResumeUrl,
  getProgressSubtitle,
  getProgressTitle,
} from '@/lib/quranReadingProgress';

type Props = {
  className?: string;
  variant?: 'card' | 'compact' | 'hero';
  onDismiss?: () => void;
  dismissible?: boolean;
};

export default function ContinueReadingBanner({
  className = '',
  variant = 'card',
  onDismiss,
  dismissible = false,
}: Props) {
  const { progress, clear, mounted } = useQuranReadingProgress();

  if (!mounted || !progress) return null;

  const href = getProgressResumeUrl(progress);
  const title = getProgressTitle(progress);
  const subtitle = getProgressSubtitle(progress);
  const isPrayer = progress.activity === 'prayer';

  if (variant === 'compact') {
    return (
      <Link
        href={href}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors touch-manipulation',
          isPrayer
            ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100',
          className
        )}
      >
        <Clock className="w-4 h-4 shrink-0" />
        <span className="truncate flex-1">Continue: {title}</span>
        <ChevronRight className="w-4 h-4 shrink-0" />
      </Link>
    );
  }

  if (variant === 'hero') {
    return (
      <div
        className={clsx(
          'relative rounded-2xl border p-4 sm:p-5 text-left shadow-sm',
          isPrayer
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
            : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200',
          className
        )}
      >
        {dismissible && (
          <button
            type="button"
            onClick={() => {
              clear();
              onDismiss?.();
            }}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-start gap-3 pr-8">
          <div
            className={clsx(
              'p-2.5 rounded-xl shrink-0',
              isPrayer ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            )}
          >
            {isPrayer ? <Bookmark className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
              {isPrayer ? 'Resume prayer' : 'Pick up where you left off'}
            </p>
            <p className="font-bold text-slate-900 text-base sm:text-lg leading-snug">{title}</p>
            <p className="text-sm text-slate-600 mt-0.5">{subtitle}</p>
            <Link
              href={href}
              className={clsx(
                'inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white',
                isPrayer ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              )}
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'rounded-xl border p-4 flex items-center gap-3',
        isPrayer ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200',
        className
      )}
    >
      <div
        className={clsx(
          'p-2 rounded-lg shrink-0',
          isPrayer ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
        )}
      >
        {isPrayer ? <Bookmark className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-900 truncate">{title}</p>
        <p className="text-xs text-slate-600">{subtitle}</p>
      </div>
      <Link
        href={href}
        className={clsx(
          'shrink-0 px-3 py-2 rounded-lg text-sm font-bold text-white',
          isPrayer ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
        )}
      >
        Go
      </Link>
    </div>
  );
}
