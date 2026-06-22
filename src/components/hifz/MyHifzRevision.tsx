'use client';

import { useMemo, useState } from 'react';
import {
  Play,
  Trash2,
  Plus,
  ExternalLink,
  BookMarked,
  Bell,
} from 'lucide-react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useHifzBookmarks } from '@/hooks/useHifzBookmarks';
import {
  formatBookmarkLabel,
  formatLastRevised,
  isBookmarkDue,
  bookmarkToPracticeRange,
  getBookmarkNavigationUrl,
  getDueBookmarks,
} from '@/lib/hifzBookmarks';
import { HIFZ_CATEGORY_META, type HifzCategory } from '@/types/hifzBookmark';
import { recordRevisionStreak } from '@/lib/hifzStats';
import HifzBookmarkForm from './HifzBookmarkForm';
import HifzProgressDashboard from './HifzProgressDashboard';
import HifzRevisionSuggestions from './HifzRevisionSuggestions';
import HifzRecordingsSheet from '@/components/quran/HifzRecordingsSheet';
import type { HifzBookmark } from '@/types/hifzBookmark';

type Props = {
  initialCategory?: HifzCategory;
  initialView?: 'stats' | 'due' | 'suggestions';
  onPracticeRange?: (range: ReturnType<typeof bookmarkToPracticeRange>) => void;
};

const CATEGORIES: HifzCategory[] = ['sabak', 'sabak_para', 'dhor'];

export default function MyHifzRevision({ initialCategory, initialView, onPracticeRange }: Props) {
  const router = useRouter();
  const { bookmarks, addBookmark, removeBookmark, recordRevision } = useHifzBookmarks();
  const [adding, setAdding] = useState(false);
  const [addCategory, setAddCategory] = useState<HifzCategory>(initialCategory ?? 'sabak');
  const [filterCategory, setFilterCategory] = useState<HifzCategory | 'all'>(initialCategory ?? 'all');
  const [remindersOn, setRemindersOn] = useState(false);
  const [recordingsOpen, setRecordingsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (filterCategory === 'all') return bookmarks;
    return bookmarks.filter((b) => b.category === filterCategory);
  }, [bookmarks, filterCategory]);

  const dueBookmarks = useMemo(() => getDueBookmarks(), [bookmarks]);

  const openBookmark = (bookmark: HifzBookmark, opts?: { autoplay?: boolean; test?: boolean }) => {
    recordRevision(bookmark.id);
    recordRevisionStreak();
    const range = bookmarkToPracticeRange(bookmark);
    if (range && onPracticeRange) {
      onPracticeRange(range);
      return;
    }
    const url = getBookmarkNavigationUrl(bookmark, {
      autoplay: opts?.autoplay,
      memorize: true,
      testMode: opts?.test,
    });
    router.push(url);
  };

  const requestReminders = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setRemindersOn(perm === 'granted');
    if (perm === 'granted') {
      localStorage.setItem('hifz_reminders_enabled', '1');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {(initialView === 'stats' || !initialView) && <HifzProgressDashboard />}

      {(initialView === 'suggestions' || !initialView) && (
        <HifzRevisionSuggestions onPractice={(id) => {
          const b = bookmarks.find((x) => x.id === id);
          if (b) openBookmark(b, { autoplay: true });
        }} />
      )}

      {initialView === 'due' && dueBookmarks.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-bold text-amber-900 mb-2">Pages & portions due for revision</h2>
          <ul className="space-y-2">
            {dueBookmarks.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{formatBookmarkLabel(b)}</span>
                <button
                  type="button"
                  onClick={() => openBookmark(b, { autoplay: true })}
                  className="shrink-0 text-xs font-bold text-amber-800 underline"
                >
                  Revise
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => { setAddCategory(filterCategory === 'all' ? 'sabak' : filterCategory); setAdding(true); }}
          className="inline-flex items-center gap-2 min-h-[44px] rounded-xl bg-primary px-4 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          Add bookmark
        </button>
        <button
          type="button"
          onClick={() => setRecordingsOpen(true)}
          className="inline-flex items-center gap-2 min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold text-muted"
        >
          <BookMarked className="h-4 w-4" />
          My recordings
        </button>
        <button
          type="button"
          onClick={requestReminders}
          className={clsx(
            'inline-flex items-center gap-2 min-h-[44px] rounded-xl border px-4 text-sm font-semibold',
            remindersOn ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted'
          )}
        >
          <Bell className="h-4 w-4" />
          {remindersOn ? 'Reminders on' : 'Enable reminders'}
        </button>
      </div>

      {adding && (
        <HifzBookmarkForm
          defaultCategory={addCategory}
          onSave={(data) => {
            addBookmark(data);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilterCategory('all')}
          className={clsx(
            'shrink-0 min-h-[36px] px-3 rounded-full text-xs font-bold border',
            filterCategory === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border text-muted'
          )}
        >
          All ({bookmarks.length})
        </button>
        {CATEGORIES.map((c) => {
          const meta = HIFZ_CATEGORY_META[c];
          const count = bookmarks.filter((b) => b.category === c).length;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setFilterCategory(c)}
              className={clsx(
                'shrink-0 min-h-[36px] px-3 rounded-full text-xs font-bold border',
                filterCategory === c ? `${meta.bg} ${meta.color} ${meta.border}` : 'border-border text-muted'
              )}
            >
              {meta.shortLabel} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border">
          <BookMarked className="h-12 w-12 mx-auto mb-3 text-muted/30" />
          <p className="font-medium text-foreground">No Hifz bookmarks yet</p>
          <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
            Save Sabak (new lesson), Sabak Para (recent), or Dhor (full revision) portions here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {CATEGORIES.map((category) => {
            const items = filtered.filter((b) => b.category === category);
            if (filterCategory !== 'all' && filterCategory !== category) return null;
            if (items.length === 0 && filterCategory === 'all') return null;
            const meta = HIFZ_CATEGORY_META[category];

            return (
              <section key={category}>
                {filterCategory === 'all' && (
                  <h3 className={clsx('text-sm font-bold mb-2 flex items-center gap-2', meta.color)}>
                    <span className={clsx('w-2 h-2 rounded-full', category === 'sabak' ? 'bg-emerald-500' : category === 'sabak_para' ? 'bg-blue-500' : 'bg-purple-500')} />
                    {meta.label}
                  </h3>
                )}
                <div className="grid gap-2">
                  {items.map((bookmark) => (
                    <BookmarkCard
                      key={bookmark.id}
                      bookmark={bookmark}
                      meta={meta}
                      onPractice={() => openBookmark(bookmark, { autoplay: true })}
                      onTest={() => openBookmark(bookmark, { test: true })}
                      onOpen={() => openBookmark(bookmark)}
                      onDelete={() => {
                        if (confirm('Remove this bookmark?')) removeBookmark(bookmark.id);
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <HifzRecordingsSheet open={recordingsOpen} onClose={() => setRecordingsOpen(false)} />
    </div>
  );
}

function BookmarkCard({
  bookmark,
  meta,
  onPractice,
  onTest,
  onOpen,
  onDelete,
}: {
  bookmark: HifzBookmark;
  meta: (typeof HIFZ_CATEGORY_META)[HifzCategory];
  onPractice: () => void;
  onTest: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const due = isBookmarkDue(bookmark);
  return (
    <article className={clsx('rounded-2xl border p-4', meta.bg, meta.border)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={clsx('text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border', meta.color, meta.border, 'bg-white/60')}>
              {meta.shortLabel}
            </span>
            {bookmark.juz && (
              <span className="text-[10px] font-semibold text-muted">Juz {bookmark.juz}</span>
            )}
            {due && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Due
              </span>
            )}
          </div>
          <h4 className="font-bold text-foreground">{formatBookmarkLabel(bookmark)}</h4>
          <p className="text-xs text-muted mt-0.5">{formatLastRevised(bookmark)}</p>
          {bookmark.notes && (
            <p className="text-xs text-muted mt-1 italic line-clamp-2">{bookmark.notes}</p>
          )}
        </div>
        <button type="button" onClick={onDelete} className="p-2 text-muted hover:text-red-600 shrink-0">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPractice}
          className="inline-flex items-center gap-1.5 min-h-[36px] rounded-xl bg-primary px-3 text-xs font-bold text-white"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          Practice
        </button>
        <button
          type="button"
          onClick={onTest}
          className="min-h-[36px] rounded-xl border border-border bg-white/80 px-3 text-xs font-bold text-foreground"
        >
          Test mode
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1 min-h-[36px] rounded-xl border border-border bg-white/80 px-3 text-xs font-semibold text-muted"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </button>
      </div>
    </article>
  );
}
