
'use client';

import { useState, useEffect } from 'react';
import { Check, Play, Settings } from 'lucide-react';

// Types
type Plan = {
  id: string;
  startSurah: number; // 1-114
  startAyah: number;
  dailyAmount: number; // verses per day
  currentSurah: number;
  currentAyah: number;
  createdAt: string;
  lastPracticed: string | null;
  streak: number;
};

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

export default function InteractivePlanner() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'setup' | 'dashboard' | 'learning'>('dashboard');
  
  // Setup State
  const [setupSurah, setSetupSurah] = useState(1);
  const [setupAyah, setSetupAyah] = useState(1);
  const [setupAmount, setSetupAmount] = useState(5);

  // Learning State
  const [todaysVerses, setTodaysVerses] = useState<Verse[]>([]);
  const [fetchingVerses, setFetchingVerses] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);

  // Surah list for dropdown (simplified for now)
  const [surahList, setSurahList] = useState<{id: number, name_simple: string}[]>([]);

  useEffect(() => {
    // Load plan from local storage
    const savedPlan = localStorage.getItem('hifz_plan');
    if (savedPlan) {
      setPlan(JSON.parse(savedPlan));
      setView('dashboard');
    } else {
      setView('setup');
    }
    setLoading(false);

    // Fetch Surah list
    fetch('https://api.quran.com/api/v4/chapters')
      .then(res => res.json())
      .then(data => setSurahList(data.chapters || []));
  }, []);

  const createPlan = () => {
    const newPlan: Plan = {
      id: Date.now().toString(),
      startSurah: setupSurah,
      startAyah: setupAyah,
      dailyAmount: setupAmount,
      currentSurah: setupSurah,
      currentAyah: setupAyah,
      createdAt: new Date().toISOString(),
      lastPracticed: null,
      streak: 0
    };
    localStorage.setItem('hifz_plan', JSON.stringify(newPlan));
    setPlan(newPlan);
    setView('dashboard');
  };

  const deletePlan = () => {
    if (confirm('Are you sure you want to delete your plan? This cannot be undone.')) {
      localStorage.removeItem('hifz_plan');
      setPlan(null);
      setView('setup');
    }
  };

  const startSession = async () => {
    if (!plan) return;
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

        // Fetch loop (simplified: assumes within same surah for now, but handles boundary if simple)
        // Better approach: Fetch by verse_key individually or use a range endpoint if possible.
        // Quran.com API doesn't easily support multi-surah range fetching in one go.
        // We'll iterate.
        
        while (count < plan.dailyAmount) {
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
    } catch (e) {
        console.error(e);
        alert("Failed to load verses. Please check connection.");
        setView('dashboard');
    } finally {
        setFetchingVerses(false);
    }
  };

  const completeSession = () => {
    if (!plan || todaysVerses.length === 0) return;

    const lastVerse = todaysVerses[todaysVerses.length - 1];
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
        lastPracticed: new Date().toISOString(),
        streak: plan.streak + 1
    };

    setPlan(updatedPlan);
    localStorage.setItem('hifz_plan', JSON.stringify(updatedPlan));
    setCompletedToday(true);
    setView('dashboard');
  };

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

        <div className="space-y-5 max-w-md mx-auto">
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

            <button 
                onClick={createPlan}
                className="w-full min-h-[52px] py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-light active:scale-[0.99] transition-transform"
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
                  <button onClick={() => setView('dashboard')} className="min-h-[44px] px-3 text-sm font-medium text-muted hover:text-foreground">
                      Cancel
                  </button>
              </div>

              {fetchingVerses ? (
                  <div className="py-20 text-center text-muted">
                      <div className="h-8 w-8 mx-auto mb-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading your verses…
                  </div>
              ) : (
                  <>
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
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

                  <div className="shrink-0 p-4 sm:p-5 border-t border-border bg-surface pb-[max(1rem,env(safe-area-inset-bottom))]">
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
                <p className="text-sm text-muted">Keep up the good work!</p>
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

        {completedToday ? (
             <div className="bg-green-50 border border-green-200 rounded-2xl p-6 sm:p-8 text-center">
                 <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-3">
                     <Check className="w-8 h-8 text-green-600" />
                 </div>
                 <h3 className="text-lg sm:text-xl font-bold text-green-900 mb-2">Goal Achieved!</h3>
                 <p className="text-sm text-green-700">You&apos;ve completed your memorization for today. Come back tomorrow.</p>
             </div>
        ) : (
            <div className="text-center">
                <button 
                    onClick={startSession}
                    className="w-full sm:w-auto min-h-[52px] px-8 py-4 bg-primary hover:bg-primary-light text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 mx-auto active:scale-[0.99] transition-transform"
                >
                    <Play className="w-5 h-5 fill-current" />
                    Start Today&apos;s Lesson
                </button>
                <p className="mt-4 text-sm text-muted px-2">
                    Next: {plan?.dailyAmount} verses from {plan?.currentSurah}:{plan?.currentAyah}
                </p>
            </div>
        )}
    </div>
  );
}
