'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import {
  Brain,
  BookOpen,
  Plus,
  Play,
  Trash2,
  Clock,
  Edit3,
  Save,
  X,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
} from 'lucide-react';
import InteractivePlanner from '@/components/hifz/InteractivePlanner';
import AiPromptGenerator from '@/components/hifz/AiPromptGenerator';
import HifzRangeSelector from '@/components/hifz/HifzRangeSelector';
import HifzPlayer from '@/components/hifz/HifzPlayer';
import clsx from 'clsx';
import { useSearchParams } from 'next/navigation';
import {
  formatLastPracticed,
  getRangeMemorizedPercent,
  getRangeProgress,
  isRangeDueForReview,
  sortRangesForRevision,
} from '@/lib/hifzRangeProgress';

type HifzRange = {
  id: string;
  juz: number;
  surah: { id: number; name_simple: string };
  startAyah: number;
  endAyah: number;
  createdAt: number;
  label?: string;
};

type TabId = 'ranges' | 'daily' | 'ai';

const TABS: { id: TabId; label: string; shortLabel: string; icon: typeof BookOpen; color: string }[] = [
  { id: 'ranges', label: 'My Ranges', shortLabel: 'Ranges', icon: BookOpen, color: 'primary' },
  { id: 'daily', label: 'Daily Plan', shortLabel: 'Daily', icon: LayoutGrid, color: 'blue' },
  { id: 'ai', label: 'AI Generator', shortLabel: 'AI', icon: Brain, color: 'purple' },
];

function RangeCard({
  range,
  isFirst,
  isLast,
  editingLabelId,
  labelDraft,
  menuOpenId,
  onMenuToggle,
  onEditLabel,
  onLabelChange,
  onSaveLabel,
  onCancelEdit,
  onMove,
  onDelete,
  onPractice,
  memorizedPct,
  lastPracticedLabel,
  dueForReview,
}: {
  range: HifzRange;
  isFirst: boolean;
  isLast: boolean;
  editingLabelId: string | null;
  labelDraft: string;
  menuOpenId: string | null;
  onMenuToggle: (id: string | null) => void;
  onEditLabel: (id: string, label: string) => void;
  onLabelChange: (v: string) => void;
  onSaveLabel: (id: string) => void;
  onCancelEdit: () => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onDelete: (id: string) => void;
  onPractice: (range: HifzRange) => void;
  memorizedPct: number;
  lastPracticedLabel: string;
  dueForReview: boolean;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const isEditing = editingLabelId === range.id;
  const menuOpen = menuOpenId === range.id;
  const ayahCount = range.endAyah - range.startAyah + 1;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onMenuToggle(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen, onMenuToggle]);

  return (
    <article className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
            J{range.juz}
          </div>

          <div className="min-w-0 flex-1">
            {range.label?.trim() && !isEditing && (
              <span className="mb-1 inline-block max-w-full truncate rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {range.label}
              </span>
            )}
            <h3 className="text-lg font-bold text-foreground leading-tight">{range.surah.name_simple}</h3>
            <p className="text-sm text-muted mt-0.5">
              Ayah {range.startAyah}–{range.endAyah}
              <span className="text-muted/70"> · {ayahCount} ayah{ayahCount !== 1 ? 's' : ''}</span>
              {memorizedPct > 0 && (
                <span className="text-primary font-semibold"> · {memorizedPct}% done</span>
              )}
            </p>
            {memorizedPct > 0 && (
              <div className="mt-2 h-1.5 rounded-full bg-background overflow-hidden max-w-xs">
                <div className="h-full bg-primary" style={{ width: `${memorizedPct}%` }} />
              </div>
            )}
          </div>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => onMenuToggle(menuOpen ? null : range.id)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted hover:bg-background hover:text-foreground"
              aria-label="Range options"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-border bg-surface py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => { onEditLabel(range.id, range.label || ''); onMenuToggle(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-primary/5"
                >
                  <Edit3 className="h-4 w-4" /> Edit label
                </button>
                <button
                  type="button"
                  onClick={() => { onMove(range.id, 'up'); onMenuToggle(null); }}
                  disabled={isFirst}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-primary/5 disabled:opacity-40"
                >
                  <ChevronUp className="h-4 w-4" /> Move up
                </button>
                <button
                  type="button"
                  onClick={() => { onMove(range.id, 'down'); onMenuToggle(null); }}
                  disabled={isLast}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-primary/5 disabled:opacity-40"
                >
                  <ChevronDown className="h-4 w-4" /> Move down
                </button>
                <button
                  type="button"
                  onClick={() => { onDelete(range.id); onMenuToggle(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={labelDraft}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder="Label (e.g. Juz 1 revision)"
              className="min-h-[44px] flex-1 rounded-xl border border-border px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => onSaveLabel(range.id)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white"
              aria-label="Save label"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 text-xs text-muted min-w-0">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{lastPracticedLabel}</span>
            </span>
            {dueForReview && (
              <span className="text-amber-700 font-semibold">Due for revision</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onPractice(range)}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-light active:scale-[0.98] transition-transform"
          >
            <Play className="h-4 w-4 fill-current" />
            Practice
          </button>
        </div>
      </div>
    </article>
  );
}

function TabBar({
  activeTab,
  onChange,
  className,
  variant,
}: {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
  className?: string;
  variant: 'mobile' | 'desktop';
}) {
  return (
    <div className={className}>
      {TABS.map(({ id, label, shortLabel, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={clsx(
              'relative flex items-center justify-center gap-2 font-semibold transition-all',
              variant === 'mobile'
                ? clsx(
                    'flex-1 flex-col gap-1 py-2.5 min-h-[56px] text-[11px]',
                    active ? 'text-primary' : 'text-muted'
                  )
                : clsx(
                    'px-4 md:px-6 py-2.5 rounded-lg text-sm whitespace-nowrap',
                    active
                      ? id === 'ranges'
                        ? 'bg-primary text-white shadow-md'
                        : id === 'daily'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-purple-600 text-white shadow-md'
                      : 'text-muted hover:bg-background hover:text-foreground'
                  )
            )}
          >
            <Icon className={clsx(variant === 'mobile' ? 'h-5 w-5' : 'h-4 w-4', active && variant === 'mobile' && 'text-primary')} />
            <span>{variant === 'mobile' ? shortLabel : label}</span>
            {active && variant === 'mobile' && (
              <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function HifzPlannerContent() {
  const searchParams = useSearchParams();
  const initialJuz = searchParams.get('juz');

  const [activeTab, setActiveTab] = useState<TabId>('ranges');
  const [ranges, setRanges] = useState<HifzRange[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [playingRange, setPlayingRange] = useState<HifzRange | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [progressTick, setProgressTick] = useState(0);

  useEffect(() => {
    const onProgress = () => setProgressTick((t) => t + 1);
    window.addEventListener('hifz-range-progress-updated', onProgress);
    return () => window.removeEventListener('hifz-range-progress-updated', onProgress);
  }, []);

  useEffect(() => {
    const g = globalThis as typeof globalThis & { __SPEECHHELP_AUDIO__?: HTMLAudioElement };
    if (g.__SPEECHHELP_AUDIO__) {
      g.__SPEECHHELP_AUDIO__.pause();
      g.__SPEECHHELP_AUDIO__.src = '';
    }
    return () => {
      if (g.__SPEECHHELP_AUDIO__) {
        g.__SPEECHHELP_AUDIO__.pause();
        g.__SPEECHHELP_AUDIO__.src = '';
      }
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('hifz_ranges');
    if (saved) {
      try {
        setRanges(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    if (initialJuz) {
      setActiveTab('ranges');
      setIsAdding(true);
    }
  }, [initialJuz]);

  const persistRanges = (updated: HifzRange[]) => {
    setRanges(updated);
    localStorage.setItem('hifz_ranges', JSON.stringify(updated));
  };

  const addRange = (rangeData: Omit<HifzRange, 'id' | 'createdAt'>) => {
    const newRange: HifzRange = {
      ...rangeData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      label: rangeData.label || '',
    };
    persistRanges([newRange, ...ranges]);
    setIsAdding(false);
  };

  const deleteRange = (id: string) => {
    if (confirm('Delete this range?')) {
      persistRanges(ranges.filter((r) => r.id !== id));
    }
  };

  const saveLabel = (id: string) => {
    persistRanges(ranges.map((r) => (r.id === id ? { ...r, label: labelDraft.trim() } : r)));
    setEditingLabelId(null);
    setLabelDraft('');
  };

  const moveRange = (id: string, direction: 'up' | 'down') => {
    const index = ranges.findIndex((r) => r.id === id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ranges.length) return;
    const updated = [...ranges];
    const [removed] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, removed);
    persistRanges(updated);
  };

  if (playingRange) {
    return <HifzPlayer range={playingRange} onBack={() => { setPlayingRange(null); setProgressTick((t) => t + 1); }} />;
  }

  const sortedRanges = sortRangesForRevision(ranges);
  void progressTick;
  const nextDue = sortedRanges.find((r) => isRangeDueForReview(r.id));

  const showTabs = !isAdding;

  return (
    <div className="min-h-screen bg-background pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 space-y-5 sm:space-y-8">
        {showTabs && (
          <header className="text-center space-y-2 sm:space-y-3">
            <div className="inline-flex items-center justify-center p-2.5 sm:p-3 bg-primary/10 rounded-2xl">
              <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              Hifz Companion
            </h1>
            <p className="text-sm sm:text-base text-muted max-w-md mx-auto px-2">
              Memorize with custom ranges, daily goals, and guided practice.
            </p>
            {activeTab === 'ranges' && ranges.length > 0 && (
              <p className="text-xs font-medium text-primary/80">
                {ranges.length} saved range{ranges.length !== 1 ? 's' : ''}
              </p>
            )}
          </header>
        )}

        {showTabs && (
          <div className="hidden md:flex justify-center">
            <div className="bg-surface p-1 rounded-xl border border-border shadow-sm inline-flex">
              <TabBar activeTab={activeTab} onChange={setActiveTab} variant="desktop" />
            </div>
          </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'daily' && <InteractivePlanner />}
          {activeTab === 'ai' && <AiPromptGenerator />}

          {activeTab === 'ranges' && (
            <div className="space-y-4 sm:space-y-6">
              {isAdding ? (
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">Add Hifz Range</h2>
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                  <HifzRangeSelector
                    initialJuz={initialJuz ? parseInt(initialJuz) : undefined}
                    onRangeAdd={addRange}
                    onCancel={() => setIsAdding(false)}
                  />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    className="w-full min-h-[52px] py-4 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-2.5 text-muted hover:border-primary hover:text-primary hover:bg-primary/5 transition-all active:scale-[0.99]"
                  >
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-bold">Add New Range</span>
                  </button>

                  {nextDue && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-800 mb-1">Revision due</p>
                        <p className="font-bold text-foreground truncate">
                          {nextDue.label?.trim() || nextDue.surah.name_simple}
                        </p>
                        <p className="text-sm text-muted">
                          Juz {nextDue.juz} · Ayah {nextDue.startAyah}–{nextDue.endAyah}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPlayingRange(nextDue)}
                        className="shrink-0 flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        Revise now
                      </button>
                    </div>
                  )}

                  {ranges.length === 0 ? (
                    <div className="text-center py-14 px-4 rounded-2xl border border-dashed border-border bg-surface/50">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted/30" />
                      <p className="font-medium text-foreground mb-1">No ranges yet</p>
                      <p className="text-sm text-muted">Pick a Juz, Surah, and ayah range to start practicing.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                      {sortedRanges.map((range, idx) => {
                        const ayahCount = range.endAyah - range.startAyah + 1;
                        const { lastPracticed } = getRangeProgress(range.id);
                        return (
                        <RangeCard
                          key={range.id}
                          range={range}
                          isFirst={idx === 0}
                          isLast={idx === sortedRanges.length - 1}
                          editingLabelId={editingLabelId}
                          labelDraft={labelDraft}
                          menuOpenId={menuOpenId}
                          onMenuToggle={setMenuOpenId}
                          onEditLabel={(id, label) => {
                            setEditingLabelId(id);
                            setLabelDraft(label);
                          }}
                          onLabelChange={setLabelDraft}
                          onSaveLabel={saveLabel}
                          onCancelEdit={() => {
                            setEditingLabelId(null);
                            setLabelDraft('');
                          }}
                          onMove={moveRange}
                          onDelete={deleteRange}
                          onPractice={setPlayingRange}
                          memorizedPct={getRangeMemorizedPercent(range.id, ayahCount)}
                          lastPracticedLabel={formatLastPracticed(lastPracticed)}
                          dueForReview={isRangeDueForReview(range.id)}
                        />
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showTabs && (
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]"
          aria-label="Hifz sections"
        >
          <div className="relative flex max-w-lg mx-auto">
            <TabBar activeTab={activeTab} onChange={setActiveTab} variant="mobile" />
          </div>
        </nav>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 px-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted">Loading Hifz Companion…</p>
    </div>
  );
}

export default function HifzPlannerPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HifzPlannerContent />
    </Suspense>
  );
}
