'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Play, Repeat, Save, Trash2 } from 'lucide-react';
import { RECITERS } from '@/data/reciters';
import HifzPlayer from '@/components/hifz/HifzPlayer';
import HifzRangeSelector from '@/components/hifz/HifzRangeSelector';
import { getDefaultHifzReciterId, setDefaultHifzReciterId } from '@/lib/hifzReciters';
import { getDefaultHifzSpeed, setDefaultHifzSpeed } from '@/lib/hifzReciters';
import type { HifzPracticeRange } from '@/lib/hifzBookmarks';

type RepeatMode = 'ayah' | 'section' | 'both';
type PortionKind = 'surah' | 'juz' | 'hizb' | 'page';
type TranslationMode = 'arabic' | 'both' | 'translation';
type FullRepeatRange = HifzPracticeRange & { displayName?: string };

type RepeatSetup = {
  id: string;
  name: string;
  range: FullRepeatRange;
  verseKeys?: string[];
  repeatMode: RepeatMode;
  repeatEach: number;
  repeatSection: number;
  speed: number;
  reciterId: number;
  translationMode: TranslationMode;
};

type Preset = {
  name: string;
  description: string;
  repeatMode: RepeatMode;
  repeatEach: number;
  repeatSection: number;
  speed: number;
};

const STORAGE_KEY = 'speechhelp_full_repeat_setups_v1';
const REPEAT_COUNTS = [1, 3, 6, 10, 20, 50, 100] as const;
const PRESETS: Preset[] = [
  { name: 'Beginner', description: '0.75x · each ayah 5 times', repeatMode: 'ayah', repeatEach: 5, repeatSection: 1, speed: 0.75 },
  { name: 'Memorisation', description: 'Each ayah 5x · section 5x', repeatMode: 'both', repeatEach: 5, repeatSection: 5, speed: 1 },
  { name: 'Revision', description: 'Full section 3 times', repeatMode: 'section', repeatEach: 1, repeatSection: 3, speed: 1 },
  { name: 'Listening', description: 'Continuous section playback', repeatMode: 'section', repeatEach: 1, repeatSection: Infinity, speed: 1 },
];

function makeSetupId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseSavedSetups(): RepeatSetup[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    const setups = parsed.filter((item): item is RepeatSetup =>
      item && typeof item === 'object' &&
      typeof item.id === 'string' && typeof item.name === 'string' &&
      typeof item.range?.surah?.id === 'number' &&
      typeof item.range?.startAyah === 'number' && typeof item.range?.endAyah === 'number',
    );
    return setups.map((setup) => ({
      ...setup,
      repeatEach: (setup.repeatEach as number | 'continuous' | null) === 'continuous' || setup.repeatEach === null
        ? Infinity
        : setup.repeatEach,
      repeatSection: (setup.repeatSection as number | 'continuous' | null) === 'continuous' || setup.repeatSection === null
        ? Infinity
        : setup.repeatSection,
    }));
  } catch {
    return [];
  }
}

export default function FullRepeatMode() {
  const [range, setRange] = useState<FullRepeatRange | null>(null);
  const [verseKeys, setVerseKeys] = useState<string[] | undefined>();
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('both');
  const [repeatEach, setRepeatEach] = useState(5);
  const [repeatSection, setRepeatSection] = useState(5);
  const [speed, setSpeed] = useState(getDefaultHifzSpeed);
  const [reciterId, setReciterId] = useState(getDefaultHifzReciterId);
  const [translationMode, setTranslationMode] = useState<TranslationMode>('both');
  const [setupName, setSetupName] = useState('My Qur’an practice');
  const [savedSetups, setSavedSetups] = useState<RepeatSetup[]>([]);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [selectingRange, setSelectingRange] = useState(true);
  const [portionKind, setPortionKind] = useState<PortionKind>('surah');
  const [portionNumber, setPortionNumber] = useState(1);
  const [portionLoading, setPortionLoading] = useState(false);
  const [portionError, setPortionError] = useState<string | null>(null);

  useEffect(() => {
    setSavedSetups(parseSavedSetups());
  }, []);

  const applyPreset = (preset: Preset) => {
    setRepeatMode(preset.repeatMode);
    setRepeatEach(preset.repeatEach);
    setRepeatSection(preset.repeatSection);
    setSpeed(preset.speed);
    setDefaultHifzSpeed(preset.speed);
  };

  const selectRange = (selection: Omit<HifzPracticeRange, 'id'>) => {
    const id = `full-repeat-${makeSetupId()}`;
    const selected: HifzPracticeRange = { ...selection, id };

    try {
      const savedRanges: unknown = JSON.parse(localStorage.getItem('hifz_ranges') || '[]');
      const ranges = Array.isArray(savedRanges) ? savedRanges : [];
      const existing = ranges.find((item: HifzPracticeRange) =>
        item.surah?.id === selection.surah.id &&
        item.startAyah === selection.startAyah &&
        item.endAyah === selection.endAyah,
      ) as HifzPracticeRange | undefined;
      if (existing) {
        setRange(existing);
      } else {
        const trackedRange = { ...selected, createdAt: Date.now(), label: 'Full Repeat' };
        localStorage.setItem('hifz_ranges', JSON.stringify([trackedRange, ...ranges]));
        window.dispatchEvent(new Event('hifz-range-progress-updated'));
        setRange(trackedRange);
      }
    } catch {
      setRange(selected);
    }

    setSelectingRange(false);
    setVerseKeys(undefined);
    setSetupName(`${selection.surah.name_simple} Practice`);
  };

  const loadPortion = async () => {
    if (portionKind === 'surah') return;
    setPortionLoading(true);
    setPortionError(null);
    try {
      const url = `https://api.quran.com/api/v4/verses/by_${portionKind}/${portionNumber}?language=en&words=false&per_page=1000&fields=text_uthmani&translations=20`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Portion request failed');
      const data = await response.json();
      if (!Array.isArray(data.verses) || data.verses.length === 0) throw new Error('No verses returned');

      const selectedKeys = data.verses.map((verse: { verse_key: string }) => verse.verse_key);
      const [firstSurah, firstAyah] = selectedKeys[0].split(':').map(Number);
      const [, lastAyah] = selectedKeys[selectedKeys.length - 1].split(':').map(Number);
      const displayName = `${portionKind[0].toUpperCase()}${portionKind.slice(1)} ${portionNumber}`;
      const selected: FullRepeatRange = {
        id: `full-repeat-${makeSetupId()}`,
        juz: data.verses[0].juz_number ?? 1,
        surah: { id: firstSurah, name_simple: displayName, verses_count: data.verses.length },
        startAyah: firstAyah,
        endAyah: lastAyah,
        displayName,
      };

      const trackedRange = { ...selected, createdAt: Date.now(), label: displayName };
      try {
        const savedRanges: unknown = JSON.parse(localStorage.getItem('hifz_ranges') || '[]');
        localStorage.setItem('hifz_ranges', JSON.stringify([trackedRange, ...(Array.isArray(savedRanges) ? savedRanges : [])]));
        window.dispatchEvent(new Event('hifz-range-progress-updated'));
      } catch {
        setPortionError('The selection is ready, but Hifz progress could not be saved on this device.');
      }

      setRange(trackedRange);
      setVerseKeys(selectedKeys);
      setSetupName(`${displayName} Practice`);
      setSelectingRange(false);
    } catch {
      setPortionError(`Could not load this ${portionKind}. Check your connection and try again.`);
    } finally {
      setPortionLoading(false);
    }
  };

  const saveSetup = () => {
    if (!range) return;
    const setup: RepeatSetup = {
      id: makeSetupId(),
      name: setupName.trim() || `${range.displayName || range.surah.name_simple} Practice`,
      range,
      verseKeys,
      repeatMode,
      repeatEach,
      repeatSection,
      speed,
      reciterId,
      translationMode,
    };
    const next = [setup, ...savedSetups.filter((item) => item.name !== setup.name)].slice(0, 8);
    setSavedSetups(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next, (_key, value: unknown) => value === Infinity ? 'continuous' : value));
  };

  const loadSetup = (setup: RepeatSetup) => {
    setRange(setup.range);
    setVerseKeys(setup.verseKeys);
    setSetupName(setup.name);
    setRepeatMode(setup.repeatMode);
    setRepeatEach(setup.repeatEach);
    setRepeatSection(setup.repeatSection);
    setSpeed(setup.speed);
    setDefaultHifzSpeed(setup.speed);
    setReciterId(setup.reciterId);
    setTranslationMode(setup.translationMode);
    setSelectingRange(false);
  };

  const deleteSetup = (id: string) => {
    const next = savedSetups.filter((setup) => setup.id !== id);
    setSavedSetups(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next, (_key, value: unknown) => value === Infinity ? 'continuous' : value));
  };

  const startRepeat = () => {
    if (!range) return;
    setDefaultHifzReciterId(reciterId);
    setPlayerOpen(true);
  };

  if (playerOpen && range) {
    return (
      <HifzPlayer
        range={range}
        onBack={() => setPlayerOpen(false)}
        autoPlay
        fullRepeatMode
        initialRepeatCount={repeatMode === 'section' ? 1 : repeatEach}
        initialSectionRepeatCount={repeatMode === 'ayah' ? 1 : repeatSection}
        initialPlaybackSpeed={speed}
        initialTranslationMode={translationMode}
        initialVerseKeys={verseKeys}
      />
    );
  }

  return (
    <main className="min-h-screen bg-background pb-10">
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 sm:px-6 sm:py-8">
        <Link href="/hifz-planner" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Hifz Assistant
        </Link>

        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-[#12336b]">
            <Repeat className="h-5 w-5" /> FULL REPEAT MODE
          </div>
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">Listen, repeat, and learn</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            Choose a Surah or ayah range, set the repetition pattern, then start the existing Quran audio player.
          </p>
        </header>

        {savedSetups.length > 0 && (
          <section className="space-y-2" aria-labelledby="saved-repeat-title">
            <h2 id="saved-repeat-title" className="text-sm font-bold text-foreground">Saved repeat sessions</h2>
            <div className="space-y-2">
              {savedSetups.map((setup) => (
                <div key={setup.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3">
                  <button type="button" onClick={() => loadSetup(setup)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-bold text-foreground">{setup.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {setup.range.displayName || setup.range.surah.name_simple} · {setup.range.startAyah}–{setup.range.endAyah} · {setup.speed}x
                                          {setup.range.displayName || setup.range.surah.name_simple} · {setup.verseKeys ? `${setup.verseKeys[0]}–${setup.verseKeys.at(-1)} · ${setup.verseKeys.length} ayahs` : `${setup.range.startAyah}–${setup.range.endAyah}`} · {setup.speed}x
                    </span>
                  </button>
                  <button type="button" onClick={() => deleteSetup(setup.id)} className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${setup.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {selectingRange || !range ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#12336b]" />
              <h2 className="text-lg font-bold text-foreground">Choose a Quran portion</h2>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([
                ['surah', 'Surah / range'],
                ['juz', 'Juz'],
                ['hizb', 'Hizb'],
                ['page', 'Page'],
              ] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => { setPortionError(null); setSelectingRange(true); setPortionKind(value); }} aria-pressed={portionKind === value} className="min-h-11 rounded-lg border border-border px-2 text-xs font-bold text-foreground aria-pressed:border-[#12336b] aria-pressed:bg-[#12336b]/10 aria-pressed:text-[#12336b] sm:text-sm">
                  {label}
                </button>
              ))}
            </div>
            {portionKind === 'juz' && (
              <div className="rounded-xl border border-border bg-surface p-4">
                <label htmlFor="repeat-juz" className="text-sm font-semibold text-foreground">Juz</label>
                <div className="mt-2 flex gap-2">
                  <select id="repeat-juz" value={portionNumber} onChange={(event) => setPortionNumber(Number(event.target.value))} className="min-h-11 flex-1 rounded-lg border border-border bg-background px-3">
                    {Array.from({ length: 30 }, (_, index) => index + 1).map((number) => <option key={number} value={number}>Juz {number}</option>)}
                  </select>
                  <button type="button" disabled={portionLoading} onClick={() => void loadPortion()} className="min-h-11 rounded-lg bg-[#12336b] px-4 text-sm font-bold text-white hover:bg-[#0c2856] disabled:opacity-50">
                    {portionLoading ? 'Loading…' : 'Select Juz'}
                  </button>
                </div>
              </div>
            )}
            {(portionKind === 'hizb' || portionKind === 'page') && (
              <div className="rounded-xl border border-border bg-surface p-4">
                <label htmlFor="repeat-portion" className="text-sm font-semibold text-foreground">{portionKind === 'hizb' ? 'Hizb (1–60)' : 'Page (1–604)'}</label>
                <div className="mt-2 flex gap-2">
                  <input id="repeat-portion" type="number" min={1} max={portionKind === 'hizb' ? 60 : 604} value={portionNumber} onChange={(event) => setPortionNumber(Math.max(1, Math.min(portionKind === 'hizb' ? 60 : 604, Number(event.target.value) || 1)))} className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3" />
                  <button type="button" disabled={portionLoading} onClick={() => void loadPortion()} className="min-h-11 rounded-lg bg-[#12336b] px-4 text-sm font-bold text-white hover:bg-[#0c2856] disabled:opacity-50">
                    {portionLoading ? 'Loading…' : `Select ${portionKind}`}
                  </button>
                </div>
              </div>
            )}
            {portionError && <p role="alert" className="text-sm text-red-700">{portionError}</p>}
            {portionKind === 'surah' && <HifzRangeSelector onRangeAdd={selectRange} onCancel={() => setSelectingRange(false)} />}
          </section>
        ) : (
          <section className="space-y-5 rounded-2xl border border-border bg-surface p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-foreground">{range.displayName || range.surah.name_simple}</h2>
                <p className="text-sm text-muted">Ayahs {range.startAyah}–{range.endAyah} · Juz {range.juz}</p>
                              <p className="text-sm text-muted">
                                {verseKeys ? `${verseKeys[0]}–${verseKeys.at(-1)} · ${verseKeys.length} ayahs` : `Ayahs ${range.startAyah}–${range.endAyah} · Juz ${range.juz}`}
                              </p>
                                  <option value="continuous">∞ Continuous</option>
              </div>
              <button type="button" onClick={() => setSelectingRange(true)} className="min-h-10 rounded-lg border border-border px-3 text-sm font-semibold text-muted hover:bg-background">
                Change range
              </button>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Learning preset</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRESETS.map((preset) => (
                  <button key={preset.name} type="button" onClick={() => applyPreset(preset)} className="min-h-[64px] rounded-xl border border-border px-3 py-2 text-left hover:border-[#12336b]/40 hover:bg-[#12336b]/5">
                    <span className="block text-sm font-bold text-foreground">{preset.name}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-muted">{preset.description}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Repeat pattern</legend>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['ayah', 'Each ayah'],
                  ['section', 'Section'],
                  ['both', 'Ayah + section'],
                ] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setRepeatMode(value)} aria-pressed={repeatMode === value} className={`min-h-[44px] rounded-lg border px-2 text-xs font-bold sm:text-sm ${repeatMode === value ? 'border-[#12336b] bg-[#12336b]/10 text-[#12336b]' : 'border-border text-muted'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              {repeatMode !== 'section' && (
                <label className="text-sm font-semibold text-foreground">
                  Repeat each ayah
                  <select value={repeatEach === Infinity ? 'continuous' : repeatEach} onChange={(event) => setRepeatEach(event.target.value === 'continuous' ? Infinity : Number(event.target.value))} className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3">
                    {REPEAT_COUNTS.map((count) => <option key={count} value={count}>{count}x</option>)}
                    <option value="continuous">∞ Continuous</option>
                  </select>
                </label>
              )}
              {repeatMode !== 'ayah' && (
                <label className="text-sm font-semibold text-foreground">
                  Repeat section
                  <select value={repeatSection === Infinity ? 'continuous' : repeatSection} onChange={(event) => setRepeatSection(event.target.value === 'continuous' ? Infinity : Number(event.target.value))} className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3">
                    {REPEAT_COUNTS.map((count) => <option key={count} value={count}>{count}x</option>)}
                    <option value="continuous">∞ Continuous</option>
                  </select>
                </label>
              )}
              <label className="text-sm font-semibold text-foreground">
                Reciter
                <select value={reciterId} onChange={(event) => setReciterId(Number(event.target.value))} className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3">
                  {RECITERS.map((reciter) => <option key={reciter.id} value={reciter.id}>{reciter.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-foreground">
                Playback speed
                <select value={speed} onChange={(event) => { const nextSpeed = Number(event.target.value); setSpeed(nextSpeed); setDefaultHifzSpeed(nextSpeed); }} className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3">
                  {[0.5, 0.75, 1, 1.25].map((rate) => <option key={rate} value={rate}>{rate}x</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-foreground">
                Translation
                <select value={translationMode} onChange={(event) => setTranslationMode(event.target.value as TranslationMode)} className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3">
                  <option value="arabic">Arabic only</option>
                  <option value="both">Arabic + translation</option>
                  <option value="translation">Translation only</option>
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row">
              <button type="button" onClick={startRepeat} className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#12336b] px-5 text-sm font-extrabold text-white hover:bg-[#0c2856]">
                <Play className="h-5 w-5 fill-current" /> Start Full Repeat
              </button>
              <div className="flex flex-1 gap-2">
                <input value={setupName} onChange={(event) => setSetupName(event.target.value)} aria-label="Repeat session name" className="min-h-[48px] min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm" />
                <button type="button" onClick={saveSetup} className="inline-flex min-h-[48px] items-center gap-2 rounded-lg border border-border px-3 text-sm font-bold text-foreground hover:bg-background">
                  <Save className="h-4 w-4" /> Save
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}