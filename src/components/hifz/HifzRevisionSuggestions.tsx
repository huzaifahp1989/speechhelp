'use client';

import { AlertCircle, CheckCircle2, Info, Play } from 'lucide-react';
import { getHifzRevisionSuggestions } from '@/lib/hifzAssistant';
import { HIFZ_BOOKMARKS_UPDATED } from '@/lib/hifzBookmarks';
import { useEffect, useState } from 'react';
import type { HifzSuggestion } from '@/lib/hifzAssistant';

type Props = {
  onPractice?: (bookmarkId: string) => void;
};

export default function HifzRevisionSuggestions({ onPractice }: Props) {
  const [suggestions, setSuggestions] = useState<HifzSuggestion[]>([]);

  useEffect(() => {
    const refresh = () => setSuggestions(getHifzRevisionSuggestions());
    refresh();
    window.addEventListener(HIFZ_BOOKMARKS_UPDATED, refresh);
    return () => window.removeEventListener(HIFZ_BOOKMARKS_UPDATED, refresh);
  }, []);

  const iconFor = (tone: HifzSuggestion['tone']) => {
    if (tone === 'warning') return <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />;
    if (tone === 'success') return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />;
    return <Info className="h-4 w-4 text-blue-600 shrink-0" />;
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-3">
      <h2 className="text-lg font-bold text-foreground">Revision Assistant</h2>
      <p className="text-sm text-muted">Smart suggestions based on your Sabak, Sabak Para, and Dhor schedule.</p>
      <ul className="space-y-2">
        {suggestions.map((s) => (
          <li
            key={s.id}
            className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
              s.tone === 'warning'
                ? 'border-amber-200 bg-amber-50'
                : s.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-border bg-background'
            }`}
          >
            {iconFor(s.tone)}
            <div className="flex-1 min-w-0">
              <p className="text-foreground leading-snug">{s.message}</p>
              {s.bookmarkId && onPractice && (
                <button
                  type="button"
                  onClick={() => onPractice(s.bookmarkId!)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
                >
                  <Play className="h-3 w-3 fill-current" />
                  Revise now
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
