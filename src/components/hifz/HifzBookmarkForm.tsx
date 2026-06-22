'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, Plus, X } from 'lucide-react';
import type { HifzCategory, HifzBookmarkScope } from '@/types/hifzBookmark';
import { HIFZ_CATEGORY_META } from '@/types/hifzBookmark';

type Surah = { id: number; name_simple: string; verses_count: number };

type Props = {
  defaultCategory?: HifzCategory;
  onSave: (data: {
    category: HifzCategory;
    scope: HifzBookmarkScope;
    juz?: number;
    notes?: string;
  }) => void;
  onCancel: () => void;
};

type ScopeKind = 'ayah_range' | 'surah' | 'juz' | 'page';

export default function HifzBookmarkForm({ defaultCategory = 'sabak', onSave, onCancel }: Props) {
  const [category, setCategory] = useState<HifzCategory>(defaultCategory);
  const [scopeKind, setScopeKind] = useState<ScopeKind>('ayah_range');
  const [juz, setJuz] = useState(1);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [startAyah, setStartAyah] = useState(1);
  const [endAyah, setEndAyah] = useState(1);
  const [page, setPage] = useState(1);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (scopeKind === 'ayah_range' || scopeKind === 'surah') {
      setLoading(true);
      fetch(`https://api.quran.com/api/v4/chapters?juz=${juz}`)
        .then((r) => r.json())
        .then((data) => {
          setSurahs(data.chapters ?? []);
          setSelectedSurah(null);
        })
        .finally(() => setLoading(false));
    }
  }, [juz, scopeKind]);

  const handleSubmit = () => {
    let scope: HifzBookmarkScope;
    if (scopeKind === 'juz') {
      scope = { kind: 'juz', juz };
    } else if (scopeKind === 'page') {
      scope = { kind: 'page', page };
    } else if (scopeKind === 'surah' && selectedSurah) {
      scope = {
        kind: 'surah',
        surahId: selectedSurah.id,
        surahName: selectedSurah.name_simple,
        versesCount: selectedSurah.verses_count,
      };
    } else if (scopeKind === 'ayah_range' && selectedSurah) {
      scope = {
        kind: 'ayah_range',
        surahId: selectedSurah.id,
        surahName: selectedSurah.name_simple,
        startAyah,
        endAyah,
        versesCount: selectedSurah.verses_count,
      };
    } else {
      return;
    }

    onSave({
      category,
      scope,
      juz: scopeKind === 'juz' ? juz : juz,
      notes: notes.trim() || undefined,
    });
  };

  const canSave =
    scopeKind === 'juz' ||
    scopeKind === 'page' ||
    (scopeKind === 'surah' && selectedSurah) ||
    (scopeKind === 'ayah_range' && selectedSurah && startAyah <= endAyah);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-foreground">Add Hifz Bookmark</h3>
        <button type="button" onClick={onCancel} className="p-2 rounded-xl border border-border text-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Category</p>
        <div className="grid grid-cols-3 gap-2">
          {(['sabak', 'sabak_para', 'dhor'] as HifzCategory[]).map((c) => {
            const meta = HIFZ_CATEGORY_META[c];
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`min-h-[44px] rounded-xl border px-2 py-2 text-xs font-bold transition-all ${
                  category === c
                    ? `${meta.bg} ${meta.color} ${meta.border}`
                    : 'border-border text-muted hover:bg-background'
                }`}
              >
                {meta.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">What to save</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              ['ayah_range', 'Ayah range'],
              ['surah', 'Full surah'],
              ['juz', 'Full juz'],
              ['page', 'Page'],
            ] as const
          ).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              onClick={() => setScopeKind(kind)}
              className={`min-h-[40px] rounded-xl border px-2 text-xs font-semibold ${
                scopeKind === kind ? 'bg-primary text-white border-primary' : 'border-border text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {(scopeKind === 'ayah_range' || scopeKind === 'surah' || scopeKind === 'juz') && (
        <div>
          <label className="text-xs font-semibold text-muted">Juz</label>
          <select
            value={juz}
            onChange={(e) => setJuz(Number(e.target.value))}
            className="mt-1 w-full min-h-[44px] rounded-xl border border-border px-3 text-sm"
          >
            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>Juz {n}</option>
            ))}
          </select>
        </div>
      )}

      {(scopeKind === 'ayah_range' || scopeKind === 'surah') && (
        <div>
          <label className="text-xs font-semibold text-muted">Surah</label>
          <select
            value={selectedSurah?.id ?? ''}
            onChange={(e) => {
              const s = surahs.find((x) => x.id === Number(e.target.value));
              setSelectedSurah(s ?? null);
              if (s) {
                setStartAyah(1);
                setEndAyah(Math.min(15, s.verses_count));
              }
            }}
            disabled={loading}
            className="mt-1 w-full min-h-[44px] rounded-xl border border-border px-3 text-sm"
          >
            <option value="">Select surah…</option>
            {surahs.map((s) => (
              <option key={s.id} value={s.id}>{s.name_simple}</option>
            ))}
          </select>
        </div>
      )}

      {scopeKind === 'ayah_range' && selectedSurah && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted">From ayah</label>
            <input
              type="number"
              min={1}
              max={selectedSurah.verses_count}
              value={startAyah}
              onChange={(e) => setStartAyah(Number(e.target.value))}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-border px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted">To ayah</label>
            <input
              type="number"
              min={startAyah}
              max={selectedSurah.verses_count}
              value={endAyah}
              onChange={(e) => setEndAyah(Number(e.target.value))}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-border px-3 text-sm"
            />
          </div>
        </div>
      )}

      {scopeKind === 'page' && (
        <div>
          <label className="text-xs font-semibold text-muted">Mushaf page (1–604)</label>
          <input
            type="number"
            min={1}
            max={604}
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
            className="mt-1 w-full min-h-[44px] rounded-xl border border-border px-3 text-sm"
          />
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-muted">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Teacher notes, weak spots…"
          className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm resize-none"
        />
      </div>

      <button
        type="button"
        disabled={!canSave}
        onClick={handleSubmit}
        className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-primary text-white font-bold disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
        Save bookmark
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
