'use client';

import { useState } from 'react';
import { ChevronDown, Palette } from 'lucide-react';
import {
  TAJWEED_DISPLAY_RULES,
  TAJWEED_LEGEND_GROUPS,
  getTajweedRule,
} from '@/data/tajweedRules';
import clsx from 'clsx';

type Props = {
  className?: string;
  defaultOpen?: boolean;
  /** `strip` = compact colour chips; `scroll` = horizontal chips for mobile; `grouped` = expandable categories */
  layout?: 'strip' | 'scroll' | 'grouped';
};

function RuleSwatch({ id }: { id: string }) {
  const rule = getTajweedRule(id);
  if (!rule) return null;
  return (
    <li
      className="flex items-start gap-2 text-xs text-slate-700"
      title={rule.description}
    >
      <span
        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border border-black/10"
        style={{ backgroundColor: rule.color }}
      />
      <span className="min-w-0">
        <span className="font-semibold">{rule.label}</span>
        {rule.labelAr && (
          <span className="text-slate-500 font-arabic mr-1"> · {rule.labelAr}</span>
        )}
      </span>
    </li>
  );
}

export default function TajweedLegend({ className, defaultOpen = false, layout = 'grouped' }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  if (layout === 'scroll') {
    return (
      <div className={clsx('rounded-xl border border-violet-200 bg-violet-50/60 overflow-hidden', className)}>
        <div className="px-3 py-2 border-b border-violet-100 flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-violet-600 shrink-0" />
          <span className="text-[11px] font-bold text-violet-900">Tajweed colours</span>
        </div>
        <ul className="flex gap-2 px-3 py-2.5 overflow-x-auto no-scrollbar">
          {TAJWEED_DISPLAY_RULES.map((rule) => (
            <li
              key={rule.id}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-violet-100 bg-white px-2 py-1"
              title={`${rule.label} — ${rule.description}`}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: rule.color }}
              />
              <span className="text-[10px] font-medium text-slate-700 whitespace-nowrap">{rule.label}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (layout === 'strip') {
    return (
      <div className={clsx('rounded-xl border border-violet-200 bg-violet-50/50 overflow-hidden', className)}>
        <div className="px-3 py-2.5 border-b border-violet-100 flex items-center gap-2">
          <Palette className="w-4 h-4 text-violet-600 shrink-0" />
          <span className="text-xs font-bold text-violet-900">Tajweed colours — each rule has its own colour</span>
        </div>
        <ul className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-2">
          {TAJWEED_DISPLAY_RULES.map((rule) => (
            <li key={rule.id} className="flex items-center gap-1.5 min-w-0">
              <span
                className="h-3 w-3 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: rule.color }}
              />
              <span className="text-[10px] sm:text-xs font-medium text-slate-700 truncate" title={rule.description}>
                {rule.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={clsx('rounded-xl border border-slate-200 bg-white overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Palette className="w-4 h-4 text-violet-600" />
          Tajweed colour key (17 rules)
        </span>
        <ChevronDown className={clsx('w-4 h-4 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
          {TAJWEED_LEGEND_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                {group.title}
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {group.ids.map((id) => (
                  <RuleSwatch key={id} id={id} />
                ))}
              </ul>
            </div>
          ))}
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Colours from Quran.com Uthmani Tajweed (Hafs). Tap the palette button to hide colours.
          </p>
        </div>
      )}
    </div>
  );
}
