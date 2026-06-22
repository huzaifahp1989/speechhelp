'use client';

import clsx from 'clsx';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

type Props = {
  enabled: boolean;
  isListening: boolean;
  isSupported: boolean;
  activeVerseKey: string | null;
  completedCount: number;
  totalWords: number;
  error: string | null;
  onToggle: () => void;
  className?: string;
};

export default function RecitationCheckBar({
  enabled,
  isListening,
  isSupported,
  activeVerseKey,
  completedCount,
  totalWords,
  error,
  onToggle,
  className,
}: Props) {
  if (!isSupported) {
    return (
      <div className={clsx('flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2', className)}>
        <AlertCircle className="h-4 w-4 shrink-0" />
        Mistake check needs Chrome/Edge with microphone access.
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <button
        type="button"
        onClick={onToggle}
        className={clsx(
          'inline-flex items-center justify-center gap-2 min-h-[40px] px-3 rounded-xl text-sm font-bold border transition-all',
          enabled
            ? 'bg-red-50 border-red-300 text-red-800 shadow-sm'
            : 'bg-white border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-700'
        )}
        title="Tarteel-style mistake correction — recite and get instant feedback"
      >
        {enabled && isListening ? (
          <Mic className="h-4 w-4 animate-pulse text-red-600" />
        ) : enabled ? (
          <Mic className="h-4 w-4 text-red-600" />
        ) : (
          <MicOff className="h-4 w-4" />
        )}
        {enabled ? 'Mistake check on' : 'Mistake check'}
      </button>
      {enabled && (
        <p className="text-[11px] text-slate-500 leading-snug px-0.5">
          {activeVerseKey
            ? `Reciting ${activeVerseKey} · ${completedCount}/${totalWords} words${isListening ? ' · listening…' : ''}`
            : 'Tap an ayah to start reciting — wrong words show a red line and play the correct pronunciation'}
        </p>
      )}
      {error && (
        <p className="text-[11px] text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
