'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark as BookmarkIcon,
  Edit3,
  Trash2,
  Save,
  X,
  Play,
  Brain,
  ChevronRight,
} from 'lucide-react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useJuzProgress } from '@/hooks/useJuzProgress';
import { getAllJuzBoundaries, getQuarterBoundary } from '@/lib/juzBoundaries';
import { stopGlobalQuranAudio } from '@/lib/quranAudio';

export default function JuzIndexPage() {
  const juzList = getAllJuzBoundaries();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const { getJuzProgress, updateJuzProgress } = useJuzProgress();

  const [editingJuz, setEditingJuz] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ toMemorize: '', weakParts: '', notes: '' });
  const [expandedJuz, setExpandedJuz] = useState<number | null>(null);

  useEffect(() => {
    stopGlobalQuranAudio();
  }, []);

  const handleEditOpen = (juzId: number) => {
    setEditForm(getJuzProgress(juzId));
    setEditingJuz(juzId);
  };

  const handleSave = (juzId: number) => {
    updateJuzProgress(juzId, editForm);
    setEditingJuz(null);
  };

  return (
    <div className="min-h-screen bg-background pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <header className="text-center mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-2">Juz Index</h1>
          <p className="text-sm sm:text-base text-muted max-w-lg mx-auto">
            Standard Hafs juz boundaries — accurate start and end ayahs for memorization.
          </p>
          <Link
            href="/hifz-planner"
            className="inline-flex items-center gap-2 mt-4 min-h-[44px] px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-light"
          >
            <Brain className="w-4 h-4" />
            Open Hifz Companion
          </Link>
        </header>

        {/* Bookmarks */}
        {bookmarks.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <BookmarkIcon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Your Bookmarks</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {bookmarks
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 6)
                .map((b) => (
                  <div
                    key={b.id}
                    className="bg-surface p-4 rounded-xl border border-border flex items-start justify-between gap-2"
                  >
                    <Link
                      href={
                        b.type === 'surah'
                          ? `/quran/${b.refId}#verse-${b.verseKey}`
                          : `/quran/juz/${b.refId}#verse-${b.verseKey}`
                      }
                      className="flex-1 min-w-0"
                    >
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {b.type === 'surah' ? 'Surah' : 'Juz'} {b.refId}
                      </span>
                      <p className="font-bold text-foreground mt-1">Ayah {b.verseKey}</p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleBookmark(b.type, b.refId, b.verseKey)}
                      className="p-2 text-muted hover:text-red-500 rounded-lg"
                      aria-label="Remove bookmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Juz cards */}
        <div className="space-y-3 sm:space-y-4">
          {juzList.map((juz) => {
            const progress = getJuzProgress(juz.juz);
            const isEditing = editingJuz === juz.juz;
            const isExpanded = expandedJuz === juz.juz;
            const hasNotes = progress.toMemorize || progress.weakParts || progress.notes;

            return (
              <article
                key={juz.juz}
                className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <Link
                      href={`/quran/juz/${juz.juz}`}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg hover:bg-primary/15"
                    >
                      {juz.juz}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link href={`/quran/juz/${juz.juz}`} className="block group">
                        <h3 className="font-bold text-lg text-foreground group-hover:text-primary">
                          {juz.label}
                        </h3>
                        <p className="text-sm text-muted mt-0.5">
                          <span className="font-semibold text-primary">{juz.startVerse}</span>
                          {' → '}
                          <span className="font-semibold text-primary">{juz.endVerse}</span>
                        </p>
                        <p className="text-xs text-muted/80 mt-1 hidden sm:block">
                          {juz.startDescription} → {juz.endDescription}
                        </p>
                      </Link>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <Link
                          href={`/quran/juz/${juz.juz}`}
                          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-light"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Open Juz
                        </Link>
                        <Link
                          href={`/hifz-planner?juz=${juz.juz}`}
                          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-foreground hover:bg-background"
                        >
                          <Brain className="w-3.5 h-3.5" />
                          Add range
                        </Link>
                        <button
                          type="button"
                          onClick={() => setExpandedJuz(isExpanded ? null : juz.juz)}
                          className="inline-flex items-center gap-1 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold text-muted hover:bg-background"
                        >
                          Quarters
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {([1, 2, 3, 4] as const).map((q) => {
                            const quarter = getQuarterBoundary(juz.juz, q);
                            if (!quarter) return null;
                            return (
                              <Link
                                key={q}
                                href={`/quran/juz/${juz.juz}?startingVerse=${quarter.startVerse}&autoplay=true`}
                                className="p-2.5 rounded-lg border border-border bg-background hover:border-primary text-left"
                              >
                                <span className="text-[10px] font-bold text-primary uppercase">Quarter {q}</span>
                                <p className="text-xs text-muted mt-0.5 font-mono">
                                  {quarter.startVerse} – {quarter.endVerse}
                                </p>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-border/60 pt-3 bg-background/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase text-muted tracking-wider">My notes</span>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleEditOpen(juz.juz)}
                        className="text-primary text-xs font-bold flex items-center gap-1 min-h-[32px] px-2"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editForm.toMemorize}
                        onChange={(e) => setEditForm({ ...editForm, toMemorize: e.target.value })}
                        placeholder="To memorize (e.g. Q1–Q2)"
                        className="w-full min-h-[40px] text-sm px-3 py-2 border border-border rounded-lg bg-surface focus:ring-2 focus:ring-primary/20"
                      />
                      <input
                        type="text"
                        value={editForm.weakParts}
                        onChange={(e) => setEditForm({ ...editForm, weakParts: e.target.value })}
                        placeholder="Weak parts"
                        className="w-full min-h-[40px] text-sm px-3 py-2 border border-border rounded-lg bg-surface focus:ring-2 focus:ring-primary/20"
                      />
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        placeholder="Notes"
                        rows={2}
                        className="w-full text-sm px-3 py-2 border border-border rounded-lg bg-surface resize-none focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSave(juz.juz)}
                          className="flex-1 min-h-[40px] bg-primary text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                        >
                          <Save className="w-3 h-3" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingJuz(null)}
                          className="min-h-[40px] px-4 border border-border rounded-lg text-muted"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : hasNotes ? (
                    <div className="space-y-2 text-sm">
                      {progress.toMemorize && (
                        <p><span className="text-muted text-xs">To memorize: </span>{progress.toMemorize}</p>
                      )}
                      {progress.weakParts && (
                        <p><span className="text-muted text-xs">Weak: </span>{progress.weakParts}</p>
                      )}
                      {progress.notes && (
                        <p className="text-muted">{progress.notes}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted/70 italic">No notes yet.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
