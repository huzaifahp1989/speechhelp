
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Check, Play, Settings, Headphones } from 'lucide-react';
import { recordHifzSession } from '@/lib/hifzSessions';
import { deleteHifzGoal, loadHifzGoal, saveHifzGoal, type HifzGoalPlan } from '@/lib/hifzGoalStore';
import { getJuzBoundary } from '@/lib/juzBoundaries';

// Types
type Plan = HifzGoalPlan;

type Verse = {
  id: number;
  verse_key: string;
  text_uthmani: string;
  translations: { text: string }[];
  words: {
    id: number;
    position: number;
    text_uthmani: string;
    translation: { text: string };
    transliteration: { text: string };
  }[];
};

type GoalType = 'full_quran' | 'juz';

type Chapter = { id: number; name_simple: string; verses_count: number };

const LESSON_STEPS = [
    { id: 'listen', title: 'Listen', detail: 'Hear the selected reciter in the full Quran reader.' },
    { id: 'read', title: 'Read', detail: 'Read each verified ayah carefully.' },
    { id: 'repeat', title: 'Repeat', detail: 'Repeat each ayah aloud before moving on.' },
    { id: 'memorise', title: 'Memorise', detail: 'Practise the ayahs with the text hidden in Hifz mode.' },
    { id: 'recite', title: 'Recite', detail: 'Recite the lesson from memory.' },
    { id: 'test', title: 'Test', detail: 'Continue from a selected ayah without looking.' },
    { id: 'revision', title: 'Revision', detail: 'Review earlier memorisation in My Hifz & Revision.' },
] as const;
const STUDY_DAY_OPTIONS = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
];

function lessonStepsStorageKey(plan: Plan): string {
    const date = new Date();
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return `speechhelp_hifz_lesson_steps_${day}_${plan.currentSurah}_${plan.currentAyah}`;
}

function getStudyDaysUntil(targetDate: string, studyDays: number[]): number {
    const [year, month, day] = targetDate.split('-').map(Number);
    const target = new Date(year, month - 1, day);
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    if (target < current) return 0;

    let count = 0;
    for (const date = new Date(current); date <= target; date.setDate(date.getDate() + 1)) {
        if (studyDays.includes(date.getDay())) count += 1;
    }
    return count;
}

function estimateCompletionDate(remainingAyahs: number, dailyAmount: number, studyDays: number[]): Date | null {
    if (remainingAyahs <= 0 || dailyAmount <= 0 || studyDays.length === 0) return null;
    let remainingSessions = Math.ceil(remainingAyahs / dailyAmount);
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    while (remainingSessions > 0) {
        if (studyDays.includes(date.getDay())) remainingSessions -= 1;
        if (remainingSessions > 0) date.setDate(date.getDate() + 1);
    }
    return date;
}

function countAyahsBetween(chapters: Chapter[], startSurah: number, startAyah: number, endSurah: number, endAyah: number): number {
    return chapters.reduce((total, chapter) => {
        if (chapter.id < startSurah || chapter.id > endSurah) return total;
        const firstAyah = chapter.id === startSurah ? startAyah : 1;
        const lastAyah = chapter.id === endSurah ? endAyah : chapter.verses_count;
        return total + Math.max(0, lastAyah - firstAyah + 1);
    }, 0);
}

export default function InteractivePlanner() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'setup' | 'dashboard' | 'learning'>('dashboard');
  
  // Setup State
  const [setupSurah, setSetupSurah] = useState(1);
  const [setupAyah, setSetupAyah] = useState(1);
  const [setupAmount, setSetupAmount] = useState(5);
    const [setupGoalType, setSetupGoalType] = useState<GoalType>('full_quran');
    const [setupTargetJuz, setSetupTargetJuz] = useState(30);
    const [setupMinutes, setSetupMinutes] = useState(20);
    const [setupStudyDays, setSetupStudyDays] = useState([1, 2, 3, 4, 5, 6]);
    const [setupTargetDate, setSetupTargetDate] = useState('');
    const [planSaveStatus, setPlanSaveStatus] = useState<'synced' | 'local' | null>(null);

  // Learning State
  const [todaysVerses, setTodaysVerses] = useState<Verse[]>([]);
  const [fetchingVerses, setFetchingVerses] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);
    const [completedSteps, setCompletedSteps] = useState<string[]>([]);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [sessionSaveMessage, setSessionSaveMessage] = useState<string | null>(null);
    const sessionStartedAtRef = useRef<number | null>(null);

  // Surah list for dropdown (simplified for now)
    const [surahList, setSurahList] = useState<Chapter[]>([]);

  useEffect(() => {
        let mounted = true;
        void loadHifzGoal().then(({ plan: savedPlan, synced }) => {
            if (!mounted) return;
            setPlan(savedPlan);
            setView(savedPlan ? 'dashboard' : 'setup');
            setPlanSaveStatus(savedPlan ? (synced ? 'synced' : 'local') : null);
        }).finally(() => {
            if (mounted) setLoading(false);
        });

    fetch('https://api.quran.com/api/v4/chapters')
      .then(res => res.json())
            .then(data => {
                if (mounted) setSurahList(data.chapters || []);
            })
            .catch(() => {
                if (mounted) setSurahList([]);
            });
        return () => { mounted = false; };
  }, []);

    const selectedJuzBoundary = setupGoalType === 'juz' ? getJuzBoundary(setupTargetJuz) : null;
    const setupStart = selectedJuzBoundary
        ? selectedJuzBoundary.startVerse.split(':').map(Number)
        : [setupSurah, setupAyah];
    const setupEnd = selectedJuzBoundary
        ? selectedJuzBoundary.endVerse.split(':').map(Number)
        : [114, surahList.find((chapter) => chapter.id === 114)?.verses_count ?? 6];
    const remainingAyahs = surahList.length === 114
        ? countAyahsBetween(surahList, setupStart[0], setupStart[1], setupEnd[0], setupEnd[1])
        : null;
    const availableStudyDays = setupTargetDate ? getStudyDaysUntil(setupTargetDate, setupStudyDays) : null;
    const requiredAyahsPerStudyDay = remainingAyahs !== null && availableStudyDays
        ? Math.ceil(remainingAyahs / availableStudyDays)
        : null;
    const estimatedCompletion = remainingAyahs !== null
        ? estimateCompletionDate(remainingAyahs, setupAmount, setupStudyDays)
        : null;
    const planRemainingAyahs = plan && surahList.length === 114
        ? countAyahsBetween(
                surahList,
                plan.currentSurah,
                plan.currentAyah,
                plan.endSurah ?? 114,
                plan.endAyah ?? (surahList.find((chapter) => chapter.id === 114)?.verses_count ?? 6),
            )
        : null;
    const planEstimatedCompletion = plan && planRemainingAyahs !== null
        ? estimateCompletionDate(planRemainingAyahs, plan.dailyAmount, plan.studyDays ?? [1, 2, 3, 4, 5, 6])
        : null;

  const createPlan = () => {
        if (setupStudyDays.length === 0 || availableStudyDays === 0 || setupStart.length !== 2 || setupEnd.length !== 2) return;
    const newPlan: Plan = {
      id: Date.now().toString(),
            goalType: setupGoalType,
            targetJuz: setupGoalType === 'juz' ? setupTargetJuz : undefined,
            startSurah: setupStart[0],
            startAyah: setupStart[1],
            endSurah: setupEnd[0],
            endAyah: setupEnd[1],
      dailyAmount: setupAmount,
            currentSurah: setupStart[0],
            currentAyah: setupStart[1],
      createdAt: new Date().toISOString(),
      lastPracticed: null,
            streak: 0,
            dailyMinutes: setupMinutes,
            studyDays: setupStudyDays,
            targetDate: setupTargetDate || undefined,
    };
    setPlan(newPlan);
    setView('dashboard');
        void saveHifzGoal(newPlan).then(setPlanSaveStatus);
  };

  const deletePlan = () => {
    if (confirm('Are you sure you want to delete your plan? This cannot be undone.')) {
            void deleteHifzGoal().then((deleted) => {
                if (!deleted) {
                    window.alert('Unable to delete the account copy right now. Your plan has been kept. Please try again when you are online.');
                    return;
                }
                setPlan(null);
                setPlanSaveStatus(null);
                setView('setup');
            });
    }
  };

  const startSession = async () => {
    if (!plan) return;
                try {
                    const savedSteps = JSON.parse(localStorage.getItem(lessonStepsStorageKey(plan)) || '[]') as unknown;
                    setCompletedSteps(Array.isArray(savedSteps)
                        ? LESSON_STEPS.filter(({ id }) => savedSteps.includes(id)).map(({ id }) => id)
                        : []);
                } catch {
                    setCompletedSteps([]);
                }
        sessionStartedAtRef.current = null;
        setSessionStarted(false);
        setElapsedSeconds(0);
        setSessionSaveMessage(null);
    setFetchingVerses(true);
    setView('learning');
    
    // Logic to fetch next N verses starting from currentSurah:currentAyah
    // This is complex because we might cross Surah boundaries.
    // For MVP, we will fetch by chapter and filter.
    
    try {
        const verses: Verse[] = [];
        let currentS = plan.currentSurah;
        let currentA = plan.currentAyah;
        let count = 0;
        const endSurah = plan.endSurah ?? 114;
        const endAyah = plan.endAyah ?? (surahList.find((chapter) => chapter.id === 114)?.verses_count ?? 6);

        // Fetch loop (simplified: assumes within same surah for now, but handles boundary if simple)
        // Better approach: Fetch by verse_key individually or use a range endpoint if possible.
        // Quran.com API doesn't easily support multi-surah range fetching in one go.
        // We'll iterate.
        
        while (count < plan.dailyAmount) {
               if (currentS > endSurah || (currentS === endSurah && currentA > endAyah)) break;
             // Fetch using by_chapter with page=ayah per_page=1 to get specific verse with translations
             // using translations=20 (Saheeh International) as it is reliable
             const res = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${currentS}?language=en&words=true&translations=20&fields=text_uthmani&page=${currentA}&per_page=1`);
             
             if (!res.ok) {
                 // Might be end of Surah or error
                 // Check if next surah exists
                 if (currentS < 114) {
                     currentS++;
                     currentA = 1;
                     continue;
                 } else {
                     break; // End of Quran
                 }
             }

             const data = await res.json();
             if (data.verses && data.verses.length > 0) {
                 verses.push(data.verses[0]);
                 currentA++;
                 count++;
             } else {
                 // No verse found at this position, likely end of surah
                 if (currentS < 114) {
                    currentS++;
                    currentA = 1;
                    continue;
                 } else {
                    break;
                 }
             }
        }
        
                setTodaysVerses(verses);
                if (verses.length > 0) {
                    sessionStartedAtRef.current = Date.now();
                    setSessionStarted(true);
                }
    } catch (e) {
        console.error(e);
        alert("Failed to load verses. Please check connection.");
        sessionStartedAtRef.current = null;
        setSessionStarted(false);
        setView('dashboard');
    } finally {
        setFetchingVerses(false);
    }
  };

    const toggleLessonStep = (stepId: string) => {
        if (!plan) return;
        const next = completedSteps.includes(stepId)
            ? completedSteps.filter((id) => id !== stepId)
            : [...completedSteps, stepId];
        setCompletedSteps(next);
        try {
            localStorage.setItem(lessonStepsStorageKey(plan), JSON.stringify(next));
        } catch {
            // Keep the checklist usable if browser storage is unavailable.
        }
    };

    const completeSession = async () => {
    if (!plan || todaysVerses.length === 0) return;

        const startedAt = sessionStartedAtRef.current ?? Date.now();
    const lastVerse = todaysVerses[todaysVerses.length - 1];
        const firstVerse = todaysVerses[0];
    const [s, a] = lastVerse.verse_key.split(':').map(Number);
    
    // Update plan
    // Next ayah is a + 1
    // Logic for Surah crossing is handled by the fetcher essentially, 
    // but here we just set the pointer to the next one.
    // Wait, if we crossed a surah in the session, lastVerse is correct.
    // So next start is lastVerse + 1.
    
    // Check if lastVerse is end of its surah?
    // We can just set it to a + 1. If that doesn't exist, the fetcher next time will handle the jump (as per logic above).
    
    const updatedPlan: Plan = {
        ...plan,
        currentSurah: s,
        currentAyah: a + 1,
        goalCompleted: plan.goalType === 'juz' && s === plan.endSurah && a === plan.endAyah,
        lastPracticed: new Date().toISOString(),
        streak: plan.streak + 1
    };

    setPlan(updatedPlan);
    void saveHifzGoal(updatedPlan).then(setPlanSaveStatus);
    setCompletedToday(true);
    setView('dashboard');
        sessionStartedAtRef.current = null;
    setSessionStarted(false);

        const [startSurah, startAyah] = firstVerse.verse_key.split(':');
        const [endSurah, endAyah] = lastVerse.verse_key.split(':');
        const syncStatus = await recordHifzSession({
            session_type: 'memorized_new',
            minutes: Math.max(1, Math.ceil((Date.now() - startedAt) / 60_000)),
            ayat_count: todaysVerses.length,
            coverage_text: `Surah ${startSurah}:${startAyah}–${endSurah}:${endAyah}`,
            notes: 'Daily memorisation lesson',
        });
        setSessionSaveMessage(
            syncStatus === 'synced'
                ? 'Session saved to your account.'
                : 'Session saved on this device. It will stay available here.',
        );
  };

    useEffect(() => {
        if (view !== 'learning' || !sessionStarted || sessionStartedAtRef.current === null) return;
        const updateElapsed = () => {
            if (sessionStartedAtRef.current !== null) {
                setElapsedSeconds(Math.floor((Date.now() - sessionStartedAtRef.current) / 1000));
            }
        };
        updateElapsed();
        const timer = window.setInterval(updateElapsed, 1000);
        return () => window.clearInterval(timer);
    }, [view, sessionStarted]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted">Loading planner…</p>
      </div>
    );
  }

  if (view === 'setup') {
    return (
      <div className="bg-surface rounded-2xl shadow-sm border border-border p-5 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-3">
                <Settings className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Setup Your Hifz Plan</h2>
            <p className="text-sm text-muted mt-1">Create a routine to memorize the Quran verse by verse.</p>
        </div>

        <div className="space-y-5 max-w-xl mx-auto">
            <div>
                <label htmlFor="hifz-goal-type" className="block text-sm font-medium text-foreground mb-2">Memorisation goal</label>
                <select
                    id="hifz-goal-type"
                    value={setupGoalType}
                    onChange={(e) => setSetupGoalType(e.target.value as GoalType)}
                    className="w-full min-h-[48px] p-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    <option value="full_quran">Full Quran from a starting point</option>
                    <option value="juz">A specific Juz</option>
                </select>
            </div>

            {setupGoalType === 'juz' ? (
                <div className="space-y-3">
                    <label htmlFor="hifz-target-juz" className="block text-sm font-medium text-foreground">Choose Juz</label>
                    <select
                        id="hifz-target-juz"
                        value={setupTargetJuz}
                        onChange={(e) => setSetupTargetJuz(Number(e.target.value))}
                        className="w-full min-h-[48px] p-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {Array.from({ length: 30 }, (_, index) => index + 1).map((juz) => (
                            <option key={juz} value={juz}>Juz {juz}</option>
                        ))}
                    </select>
                    {selectedJuzBoundary && (
                        <p className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-foreground">
                            {selectedJuzBoundary.label}: <strong>{selectedJuzBoundary.startVerse}</strong> to <strong>{selectedJuzBoundary.endVerse}</strong>
                        </p>
                    )}
                </div>
            ) : (
              <>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Start From Surah</label>
                    <select
                        value={setupSurah}
                        onChange={(e) => setSetupSurah(Number(e.target.value))}
                        className="w-full min-h-[48px] p-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {surahList.map(s => (
                            <option key={s.id} value={s.id}>{s.id}. {s.name_simple}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Start From Ayah</label>
                    <input
                        type="number"
                        min="1"
                        value={setupAyah}
                        onChange={(e) => setSetupAyah(Number(e.target.value))}
                        className="w-full min-h-[48px] p-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>
              </>
            )}

            <div>
                <label className="block text-sm font-medium text-foreground mb-2">Daily Goal (Verses)</label>
                <select 
                    value={setupAmount}
                    onChange={(e) => setSetupAmount(Number(e.target.value))}
                    className="w-full min-h-[48px] p-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    <option value="1">1 Ayah</option>
                    <option value="3">3 Ayahs</option>
                    <option value="5">5 Ayahs</option>
                    <option value="10">10 Ayahs</option>
                    <option value="20">20 Ayahs</option>
                </select>
            </div>

            <div>
                <label htmlFor="hifz-daily-minutes" className="block text-sm font-medium text-foreground mb-2">Available time per study day</label>
                <select
                    id="hifz-daily-minutes"
                    value={setupMinutes}
                    onChange={(e) => setSetupMinutes(Number(e.target.value))}
                    className="w-full min-h-[48px] p-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    {[10, 15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="hifz-target-date" className="block text-sm font-medium text-foreground mb-2">Target completion date (optional)</label>
                    <input
                        id="hifz-target-date"
                        type="date"
                        min={new Date().toLocaleDateString('en-CA')}
                        value={setupTargetDate}
                        onChange={(e) => setSetupTargetDate(e.target.value)}
                        className="w-full min-h-[48px] p-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>
            </div>

            <fieldset>
                <legend className="block text-sm font-medium text-foreground mb-2">Study days ({setupStudyDays.length} per week)</legend>
                <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Choose study days">
                    {STUDY_DAY_OPTIONS.map(({ value, label }) => {
                        const selected = setupStudyDays.includes(value);
                        return (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setSetupStudyDays((days) => selected ? days.filter((day) => day !== value) : [...days, value].sort())}
                                className={`min-h-[44px] rounded-lg border text-xs font-bold transition-colors ${selected ? 'border-primary bg-primary text-white' : 'border-border bg-background text-muted hover:border-primary/50'}`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            <div className="rounded-xl border border-border bg-background p-4 text-sm">
                <p className="font-semibold text-foreground">
                    {estimatedCompletion && remainingAyahs !== null
                        ? `Estimated completion: ${estimatedCompletion.toLocaleDateString()} · ${remainingAyahs.toLocaleString()} ayahs in this goal`
                        : remainingAyahs === 0
                            ? 'Your starting point is at the end of the Quran.'
                            : 'Loading verified chapter totals to estimate completion…'}
                </p>
                {setupTargetDate && requiredAyahsPerStudyDay !== null && (
                    <p className={`mt-1 ${requiredAyahsPerStudyDay > setupAmount ? 'text-amber-800' : 'text-muted'}`}>
                        This date requires about {requiredAyahsPerStudyDay} ayahs per selected study day; your current goal is {setupAmount}.
                        {requiredAyahsPerStudyDay > setupAmount ? ' Consider extending the date or increasing your target.' : ''}
                    </p>
                )}
                {setupTargetDate && availableStudyDays === 0 && (
                    <p className="mt-1 text-amber-800">Choose a later date with at least one selected study day.</p>
                )}
                <p className="mt-1 text-xs text-muted">Estimates use Quran.com chapter verse counts and your selected pace. Actual progress may vary.</p>
            </div>

            <button 
                onClick={createPlan}
                disabled={setupStudyDays.length === 0 || availableStudyDays === 0}
                className="w-full min-h-[52px] py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-light active:scale-[0.99] transition-transform disabled:cursor-not-allowed disabled:opacity-50"
            >
                Create Plan
            </button>
        </div>
      </div>
    );
  }

  if (view === 'learning') {
      return (
          <div className="bg-surface rounded-2xl shadow-sm border border-border flex flex-col max-h-[calc(100dvh-12rem)] sm:max-h-none">
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border shrink-0">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">Today&apos;s Lesson</h2>
                  <button onClick={() => { sessionStartedAtRef.current = null; setSessionStarted(false); setView('dashboard'); }} className="min-h-[44px] px-3 text-sm font-medium text-muted hover:text-foreground">
                      Cancel
                  </button>
                  <span className="text-xs tabular-nums text-muted" aria-live="off">
                      {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
                  </span>
              </div>

              {fetchingVerses ? (
                  <div className="py-20 text-center text-muted">
                      <div className="h-8 w-8 mx-auto mb-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading your verses…
                  </div>
              ) : (
                  <>
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
                      <section className="rounded-xl border border-primary/15 bg-primary/5 p-4" aria-labelledby="lesson-steps-title">
                          <div className="flex items-center justify-between gap-3">
                              <div>
                                  <h3 id="lesson-steps-title" className="font-bold text-foreground">Today&apos;s Quran Lesson</h3>
                                  <p className="mt-1 text-sm text-muted">Goal: memorise {todaysVerses.length} new ayah{todaysVerses.length === 1 ? '' : 's'}</p>
                              </div>
                              <span className="shrink-0 text-sm font-bold tabular-nums text-primary">{Math.round((completedSteps.length / LESSON_STEPS.length) * 100)}%</span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-label="Daily lesson progress" aria-valuenow={Math.round((completedSteps.length / LESSON_STEPS.length) * 100)} aria-valuemin={0} aria-valuemax={100}>
                              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(completedSteps.length / LESSON_STEPS.length) * 100}%` }} />
                          </div>
                          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                              {LESSON_STEPS.map((step, index) => {
                                  const isComplete = completedSteps.includes(step.id);
                                  const readerHref = todaysVerses[0]
                                      ? `/quran/${todaysVerses[0].verse_key.split(':')[0]}?startingVerse=${todaysVerses[0].verse_key}&autoplay=true&memorize=1#verse-${todaysVerses[0].verse_key}`
                                      : '/quran';
                                  const isReaderStep = step.id === 'listen' || step.id === 'memorise' || step.id === 'recite' || step.id === 'test';
                                  return (
                                      <li key={step.id} className="flex min-w-0 items-start gap-3 rounded-lg border border-border bg-surface p-3">
                                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                                          <div className="min-w-0 flex-1">
                                              <p className="font-semibold text-foreground">{step.title}</p>
                                              <p className="mt-0.5 text-xs leading-relaxed text-muted">{step.detail}</p>
                                              <div className="mt-2 flex flex-wrap gap-2">
                                                  {step.id === 'revision' ? (
                                                      <Link href="/hifz-planner?tab=hifz&view=due" className="inline-flex min-h-[36px] items-center rounded-lg border border-primary/25 px-3 text-xs font-bold text-primary hover:bg-primary/5">Open revision</Link>
                                                  ) : isReaderStep ? (
                                                      <Link href={readerHref} className="inline-flex min-h-[36px] items-center rounded-lg border border-primary/25 px-3 text-xs font-bold text-primary hover:bg-primary/5">Open Hifz reader</Link>
                                                  ) : null}
                                                  <button type="button" onClick={() => toggleLessonStep(step.id)} className="inline-flex min-h-[36px] items-center rounded-lg border border-primary/25 px-3 text-xs font-bold text-primary hover:bg-primary/5">{isComplete ? 'Undo completion' : 'Mark complete'}</button>
                                              </div>
                                          </div>
                                          <Check className={`mt-1 h-4 w-4 shrink-0 ${isComplete ? 'text-emerald-600' : 'text-muted/30'}`} aria-label={isComplete ? 'Completed' : 'Not completed'} />
                                      </li>
                                  );
                              })}
                          </ol>
                      </section>
                      {todaysVerses.map((verse) => (
                          <div key={verse.id} className="border-b border-border/60 pb-6 last:border-0">
                              <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-lg mb-3">
                                  {verse.verse_key}
                              </span>
                              
                              <div className="text-right mb-4">
                                  <p className="text-[clamp(1.25rem,4.5vw,1.75rem)] font-arabic leading-[1.85] text-foreground" dir="rtl">
                                      {verse.text_uthmani}
                                  </p>
                              </div>

                              <div className="flex flex-wrap flex-row-reverse gap-1.5 sm:gap-2 mb-4 -mx-1 overflow-x-auto pb-1">
                                  {verse.words.map((word) => (
                                      <div key={word.id} className="text-center shrink-0 p-1.5 rounded-lg hover:bg-background min-w-[3.5rem]">
                                          <div className="text-lg sm:text-xl font-arabic mb-0.5">{word.text_uthmani}</div>
                                          <div className="text-[10px] sm:text-xs text-muted leading-tight">{word.translation.text}</div>
                                      </div>
                                  ))}
                              </div>

                              <div className="text-muted text-sm leading-relaxed">
                                  {verse.translations?.[0]?.text.replace(/<[^>]*>/g, '') || 'Translation loading…'}
                              </div>
                          </div>
                      ))}
                  </div>

                  <div className="shrink-0 p-4 sm:p-5 border-t border-border bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
                      {plan && todaysVerses[0] && (
                        <Link
                          href={`/quran/${plan.currentSurah}?startingVerse=${todaysVerses[0].verse_key}&autoplay=true&memorize=1#verse-${todaysVerses[0].verse_key}`}
                          className="w-full min-h-[44px] py-3 border border-border rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-background"
                        >
                          <Headphones className="w-4 h-4" />
                          Open in full reader with audio
                        </Link>
                      )}
                      <button 
                          onClick={completeSession}
                          className="w-full min-h-[52px] py-4 bg-primary hover:bg-primary-light text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                      >
                          <Check className="w-5 h-5" />
                          Mark as Completed
                      </button>
                  </div>
                  </>
              )}
          </div>
      );
  }

  // Dashboard View
  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-border p-5 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
            <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Your Progress</h2>
                <p className="text-sm text-muted">
                    {plan?.dailyMinutes ?? 20} minutes · {(plan?.studyDays ?? [1, 2, 3, 4, 5, 6]).length} study days per week
                    {planEstimatedCompletion ? ` · Estimated completion ${planEstimatedCompletion.toLocaleDateString()}` : ''}
                </p>
                <p className="mt-1 text-xs text-muted" aria-live="polite">
                    {planSaveStatus === 'synced' ? 'Goal saved to your account.' : planSaveStatus === 'local' ? 'Goal saved on this device.' : 'Saving goal…'}
                </p>
            </div>
            <button onClick={deletePlan} className="self-start min-h-[44px] px-3 text-red-600 hover:text-red-700 text-sm font-medium">
                Reset Plan
            </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/15 col-span-2 sm:col-span-1">
                <div className="text-primary text-xs sm:text-sm font-medium mb-1">Current Streak</div>
                <div className="text-2xl font-bold text-foreground">{plan?.streak || 0} days</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="text-blue-600 text-xs sm:text-sm font-medium mb-1">Next Verse</div>
                <div className="text-xl sm:text-2xl font-bold text-blue-900">{plan?.currentSurah}:{plan?.currentAyah}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <div className="text-purple-600 text-xs sm:text-sm font-medium mb-1">Daily Goal</div>
                <div className="text-xl sm:text-2xl font-bold text-purple-900">{plan?.dailyAmount} ayahs</div>
            </div>
        </div>

        {completedToday || plan?.goalCompleted ? (
             <div className="bg-green-50 border border-green-200 rounded-2xl p-6 sm:p-8 text-center">
                 <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-3">
                     <Check className="w-8 h-8 text-green-600" />
                 </div>
                 <h3 className="text-lg sm:text-xl font-bold text-green-900 mb-2">{plan?.goalCompleted ? 'Juz Goal Complete!' : 'Goal Achieved!'}</h3>
                 <p className="text-sm text-green-700">{plan?.goalCompleted ? `You completed Juz ${plan.targetJuz}.` : 'You\'ve completed your memorization for today. Come back tomorrow.'}</p>
                 {sessionSaveMessage && <p className="mt-3 text-xs text-green-800">{sessionSaveMessage}</p>}
             </div>
        ) : (
            <div className="text-center space-y-3">
                <button 
                    onClick={startSession}
                    className="w-full sm:w-auto min-h-[52px] px-8 py-4 bg-primary hover:bg-primary-light text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 mx-auto active:scale-[0.99] transition-transform"
                >
                    <Play className="w-5 h-5 fill-current" />
                    Start Today&apos;s Lesson
                </button>
                {plan && (
                  <Link
                    href={`/quran/${plan.currentSurah}?startingVerse=${plan.currentSurah}:${plan.currentAyah}&autoplay=true&memorize=1#verse-${plan.currentSurah}:${plan.currentAyah}`}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-background"
                  >
                    <Headphones className="w-4 h-4" />
                    Practice with audio (Hifz mode)
                  </Link>
                )}
                <p className="mt-2 text-sm text-muted px-2">
                    Next: {plan?.dailyAmount} verses from {plan?.currentSurah}:{plan?.currentAyah}
                </p>
            </div>
        )}
    </div>
  );
}
