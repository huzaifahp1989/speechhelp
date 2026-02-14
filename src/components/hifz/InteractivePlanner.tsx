
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

  if (loading) return <div className="p-8 text-center">Loading Planner...</div>;

  if (view === 'setup') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-emerald-100 rounded-full mb-4">
                <Settings className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Setup Your Hifz Plan</h2>
            <p className="text-slate-500">Create a routine to memorize the Quran verse by verse.</p>
        </div>

        <div className="space-y-6 max-w-md mx-auto">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Start From Surah</label>
                <select 
                    value={setupSurah}
                    onChange={(e) => setSetupSurah(Number(e.target.value))}
                    className="w-full p-3 border border-slate-200 rounded-lg"
                >
                    {surahList.map(s => (
                        <option key={s.id} value={s.id}>{s.id}. {s.name_simple}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Start From Ayah</label>
                <input 
                    type="number" 
                    min="1"
                    value={setupAyah}
                    onChange={(e) => setSetupAyah(Number(e.target.value))}
                    className="w-full p-3 border border-slate-200 rounded-lg"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Daily Goal (Verses)</label>
                <select 
                    value={setupAmount}
                    onChange={(e) => setSetupAmount(Number(e.target.value))}
                    className="w-full p-3 border border-slate-200 rounded-lg"
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
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition"
            >
                Create Plan
            </button>
        </div>
      </div>
    );
  }

  if (view === 'learning') {
      return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Today&apos;s Lesson</h2>
                  <button onClick={() => setView('dashboard')} className="text-sm text-slate-500 hover:text-slate-800">
                      Cancel
                  </button>
              </div>

              {fetchingVerses ? (
                  <div className="py-20 text-center text-slate-500">
                      Loading your verses...
                  </div>
              ) : (
                  <div className="space-y-8">
                      {todaysVerses.map((verse) => (
                          <div key={verse.id} className="border-b border-slate-100 pb-6 last:border-0">
                              <div className="flex justify-between items-start mb-4">
                                  <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                      {verse.verse_key}
                                  </span>
                              </div>
                              
                              {/* Arabic Text */}
                              <div className="text-right mb-6">
                                  <p className="text-3xl font-amiri leading-loose text-slate-800" dir="rtl">
                                      {verse.text_uthmani}
                                  </p>
                              </div>

                              {/* Word by Word */}
                              <div className="flex flex-wrap flex-row-reverse gap-2 mb-4">
                                  {verse.words.map((word) => (
                                      <div key={word.id} className="text-center group relative cursor-pointer p-1 rounded hover:bg-slate-50">
                                          <div className="text-xl font-amiri mb-1">{word.text_uthmani}</div>
                                          <div className="text-xs text-slate-500">{word.translation.text}</div>
                                      </div>
                                  ))}
                              </div>

                              {/* Translation */}
                              <div className="text-slate-600 italic">
                                  {verse.translations && verse.translations.length > 0 
                                    ? verse.translations[0].text.replace(/<[^>]*>/g, '') 
                                    : 'Translation loading...'}
                              </div>
                          </div>
                      ))}

                      <div className="pt-6">
                          <button 
                              onClick={completeSession}
                              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
                          >
                              <Check className="w-5 h-5" />
                              Mark as Completed
                          </button>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // Dashboard View
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Your Progress</h2>
                <p className="text-slate-500">Keep up the good work!</p>
            </div>
            <button onClick={deletePlan} className="text-red-500 hover:text-red-700 text-sm">
                Reset Plan
            </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <div className="text-emerald-600 text-sm font-medium mb-1">Current Streak</div>
                <div className="text-2xl font-bold text-emerald-900">{plan?.streak || 0} Days</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="text-blue-600 text-sm font-medium mb-1">Next Verse</div>
                <div className="text-2xl font-bold text-blue-900">{plan?.currentSurah}:{plan?.currentAyah}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <div className="text-purple-600 text-sm font-medium mb-1">Daily Goal</div>
                <div className="text-2xl font-bold text-purple-900">{plan?.dailyAmount} Ayahs</div>
            </div>
        </div>

        {completedToday ? (
             <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                 <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-4">
                     <Check className="w-8 h-8 text-green-600" />
                 </div>
                 <h3 className="text-xl font-bold text-green-900 mb-2">Goal Achieved!</h3>
                 <p className="text-green-700">You&apos;ve completed your memorization for today. Come back tomorrow.</p>
             </div>
        ) : (
            <div className="text-center">
                <button 
                    onClick={startSession}
                    className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mx-auto"
                >
                    <Play className="w-5 h-5" />
                    Start Today&apos;s Lesson
                </button>
                <p className="mt-4 text-sm text-slate-500">
                    Next up: {plan?.dailyAmount} verses starting from {plan?.currentSurah}:{plan?.currentAyah}
                </p>
            </div>
        )}
    </div>
  );
}
