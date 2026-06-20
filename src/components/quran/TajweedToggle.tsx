'use client';

import { Palette } from 'lucide-react';
import clsx from 'clsx';

type Props = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  compact?: boolean;
};

export default function TajweedToggle({ enabled, onChange, compact }: Props) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={clsx(
        'rounded-md transition-colors flex items-center gap-1 shrink-0 touch-manipulation',
        compact ? 'p-2' : 'p-2 px-2.5',
        enabled
          ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300'
          : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'
      )}
        title={enabled ? 'Hide Tajweed colours (tap words)' : 'Show Tajweed colours'}
    >
      <Palette className="w-4 h-4" />
      {!compact && <span className="text-xs font-bold hidden sm:inline">Tajweed</span>}
    </button>
  );
}
