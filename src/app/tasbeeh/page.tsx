'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, RotateCcw, Volume2, VolumeX, Check, Info, Trophy } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';

type Zikr = {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  target: number;
  reference: string;
  virtue: string;
};

const ZIKR_LIST: Zikr[] = [
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ',
    transliteration: 'SubhanAllah',
    translation: 'Glory be to Allah',
    target: 33,
    reference: 'Sahih Muslim 597',
    virtue: 'Prophet (ﷺ) said: "He who recites after every prayer: Subhan-Allah 33 times; Al-hamdu lillah 33 times; Allahu Akbar 33 times; and completes the hundred with: La ilaha illallahu, wahdahu la sharika lahu, lahul-mulku wa lahul-hamdu, wa Huwa ala kulli shaiin qadir, will have all his sins pardoned even if they may be as large as the foam on the surface of the sea."',
  },
  {
    id: 'alhamdulillah',
    arabic: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Alhamdulillah',
    translation: 'All praise is due to Allah',
    target: 33,
    reference: 'Sahih Muslim 597',
    virtue: 'Part of the post-prayer dhikr that leads to forgiveness of sins.',
  },
  {
    id: 'allahuakbar',
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'Allahu Akbar',
    translation: 'Allah is the Greatest',
    target: 34,
    reference: 'Sahih Muslim 597',
    virtue: 'Recommended to recite 34 times before sleep (Sahih al-Bukhari 3113) or 33 times after prayer.',
  },
  {
    id: 'subhanallahi-wabihamdihi',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    transliteration: 'SubhanAllahi wa bihamdihi',
    translation: 'Glory is to Allah and all praise is to Him',
    target: 100,
    reference: 'Sahih Al-Bukhari 6405',
    virtue: 'Prophet (ﷺ) said: "Whoever says, \'Subhan Allah wa bihamdihi,\' one hundred times a day, will be forgiven all his sins even if they were as much as the foam of the sea."',
  },
  {
    id: 'la-ilaha-illallah',
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'La ilaha illallahu wahdahu la sharika lahu, lahul-mulku wa lahul-hamdu wa huwa ala kulli shayin qadir',
    translation: 'There is no god but Allah alone, with no partner or associate; His is the dominion, to Him be praise, and He has power over all things',
    target: 100,
    reference: 'Sahih Al-Bukhari 6403',
    virtue: 'Prophet (ﷺ) said: "Whoever says this 100 times will get the reward of manumitting ten slaves, and one hundred good deeds will be written in his account, and one hundred bad deeds will be wiped off or erased from his account, and on that day he will be protected from the morning till evening from Satan, and nobody will be superior to him except one who has done more than that which he has done."',
  },
  {
    id: 'astaghfirullah',
    arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfirullaha wa atubu ilayhi',
    translation: 'I seek forgiveness from Allah and repent to Him',
    target: 100,
    reference: 'Sahih Al-Bukhari 6307',
    virtue: 'Prophet (ﷺ) said: "By Allah! I ask for forgiveness from Allah and turn to Him in repentance more than seventy times a day."',
  },
  {
    id: 'subhanallah-walhamdulillah',
    arabic: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ',
    transliteration: 'SubhanAllah wal hamdulillah wa la ilaha illallah wallahu akbar',
    translation: 'Glory is to Allah, and praise is to Allah, and there is none worthy of worship but Allah, and Allah is the Greatest',
    target: 0, // No specific limit
    reference: 'Sahih Muslim 2695',
    virtue: 'Prophet (ﷺ) said: "The most beloved words to Allah are four: SubhanAllah, Alhamdulillah, La ilaha illallah, and Allahu Akbar."',
  },
  {
    id: 'salawat',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ',
    transliteration: 'Allahumma salli ala Muhammadin wa ala ali Muhammad',
    translation: 'O Allah, send prayers upon Muhammad and upon the family of Muhammad',
    target: 10,
    reference: 'Sahih Muslim 408',
    virtue: 'Prophet (ﷺ) said: "Whoever sends blessings upon me once, Allah will send blessings upon him tenfold."',
  }
];

function pad2(v: number) {
  return String(v).padStart(2, '0');
}

function getIsoWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad2(weekNo)}`;
}

function readLocalInt(key: string) {
  try {
    const raw = localStorage.getItem(key);
    const n = raw ? Math.floor(Number(raw)) : NaN;
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, n);
  } catch {
    return 0;
  }
}

function getTrackerDailyGoalForZikr() {
  try {
    const raw = localStorage.getItem('tracker_goals_v1');
    if (!raw) return 100;
    const parsed = JSON.parse(raw) as any;
    const n = Math.floor(Number(parsed?.tasbeeh?.daily));
    if (!Number.isFinite(n) || n < 0) return 100;
    return n;
  } catch {
    return 100;
  }
}

async function ensureAnonymousSession() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;

    // Sign in anonymously
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      console.error('Failed to create anonymous session:', error);
      return null;
    }

    // Create a default display name for anonymous users
    const anonName = `Anonymous #${Math.floor(Math.random() * 9000) + 1000}`;
    try {
      await supabase.from('public_profiles').upsert(
        { user_id: data.user.id, display_name: anonName },
        { onConflict: 'user_id' }
      );
    } catch (e) {
      // Silently fail - it's ok if profile creation fails
    }

    return data.user;
  } catch (err) {
    console.error('Error in ensureAnonymousSession:', err);
    return null;
  }
}

export default function TasbeehPage() {
  const [activeZikr, setActiveZikr] = useState<Zikr | null>(null);
  const [count, setCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [viewTab, setViewTab] = useState<'zikr' | 'tracker'>('zikr');
  const [dayKey] = useState(() => new Date().toISOString().slice(0, 10));
  const [monthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [weekKey] = useState(() => getIsoWeekKey(new Date()));
  const [zikrTotals, setZikrTotals] = useState<Record<string, { total: number; today: number }>>(() => {
    if (typeof window === 'undefined') return {};
    const next: Record<string, { total: number; today: number }> = {};
    ZIKR_LIST.forEach((z) => {
      next[z.id] = {
        total: readLocalInt(`tasbeeh_zikr_total_${z.id}`),
        today: readLocalInt(`tasbeeh_zikr_day_${new Date().toISOString().slice(0, 10)}_${z.id}`),
      };
    });
    return next;
  });
  const [dayTotal, setDayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const lastSyncedDayTotalRef = useRef<number | null>(null);
  const lastSyncedTotalRef = useRef<number | null>(null);
  const lastSyncedWeekTotalRef = useRef<number | null>(null);
  const dayTotalRef = useRef(0);
  const monthTotalRef = useRef(0);
  const weekTotalRef = useRef(0);

  const syncTasbeehProgressNow = async (nextDay: number, nextMonth: number, nextWeek: number) => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;

    const dayCount = Math.max(0, Math.floor(nextDay));
    const monthCount = Math.max(0, Math.floor(nextMonth));
    const weekCount = Math.max(0, Math.floor(nextWeek));
    const goal = getTrackerDailyGoalForZikr();

    const dailyPayload: Record<string, any> = {
      user_id: user.id,
      day: dayKey,
      activity: 'tasbeeh',
      count: dayCount,
      goal,
    };

    if (goal > 0 && dayCount >= goal) {
      dailyPayload.completed = true;
      dailyPayload.completed_at = new Date().toISOString();
    }

    const [{ error: dayError }, { error: monthError }, { error: weekError }] = await Promise.all([
      supabase.from('user_daily_activity').upsert(dailyPayload, { onConflict: 'user_id,day,activity' }),
      supabase.from('user_monthly_activity').upsert(
        {
          user_id: user.id,
          month: monthKey,
          activity: 'tasbeeh',
          count: monthCount,
        },
        { onConflict: 'user_id,month,activity' }
      ),
      supabase.from('user_weekly_activity').upsert(
        {
          user_id: user.id,
          week: weekKey,
          activity: 'tasbeeh',
          count: weekCount,
        },
        { onConflict: 'user_id,week,activity' }
      ),
    ]);

    if (!dayError) lastSyncedDayTotalRef.current = dayCount;
    if (!monthError) lastSyncedTotalRef.current = monthCount;
    if (!weekError) lastSyncedWeekTotalRef.current = weekCount;
  };
  
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup audio context on unmount
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    dayTotalRef.current = dayTotal;
  }, [dayTotal]);

  useEffect(() => {
    monthTotalRef.current = monthTotal;
  }, [monthTotal]);

  useEffect(() => {
    weekTotalRef.current = weekTotal;
  }, [weekTotal]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`tasbeeh_day_total_${dayKey}`);
      if (saved) setDayTotal(Number(saved) || 0);
    } catch {}

    try {
      const saved = localStorage.getItem(`tasbeeh_month_total_${monthKey}`);
      if (saved) setMonthTotal(Number(saved) || 0);
    } catch {}

    try {
      const saved = localStorage.getItem(`tasbeeh_week_total_${weekKey}`);
      if (saved) setWeekTotal(Number(saved) || 0);
    } catch {}

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUser(data.session.user);
      } else {
        // No authenticated user, create anonymous session
        const anonUser = await ensureAnonymousSession();
        setUser(anonUser);
      }
    };

    initAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [dayKey, monthKey, weekKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`tasbeeh_day_total_${dayKey}`, String(dayTotal));
    } catch {}
  }, [dayKey, dayTotal]);

  useEffect(() => {
    try {
      localStorage.setItem(`tasbeeh_month_total_${monthKey}`, String(monthTotal));
    } catch {}
  }, [monthKey, monthTotal]);

  useEffect(() => {
    try {
      localStorage.setItem(`tasbeeh_week_total_${weekKey}`, String(weekTotal));
    } catch {}
  }, [weekKey, weekTotal]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    const display = (((user.user_metadata as any)?.display_name || user.email || '') as string).trim();
    if (!display) return;
    void (async () => {
      try {
        await supabase.from('public_profiles').upsert({ user_id: user.id, display_name: display }, { onConflict: 'user_id' });
      } catch {}
    })();
  }, [user]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    if (lastSyncedDayTotalRef.current === dayTotal) return;

    const t = setTimeout(async () => {
      const goal = getTrackerDailyGoalForZikr();
      const payload: Record<string, any> = {
        user_id: user.id,
        day: dayKey,
        activity: 'tasbeeh',
        count: Math.max(0, Math.floor(dayTotalRef.current)),
        goal,
      };
      if (goal > 0 && payload.count >= goal) {
        payload.completed = true;
        payload.completed_at = new Date().toISOString();
      }

      const { error } = await supabase.from('user_daily_activity').upsert(payload, { onConflict: 'user_id,day,activity' });
      if (!error) lastSyncedDayTotalRef.current = dayTotalRef.current;
    }, 1200);

    return () => clearTimeout(t);
  }, [dayKey, dayTotal, user]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;

    const run = async () => {
      const { data } = await supabase
        .from('user_daily_activity')
        .select('count')
        .eq('user_id', user.id)
        .eq('day', dayKey)
        .eq('activity', 'tasbeeh')
        .maybeSingle();

      const remoteCount = Number((data as any)?.count || 0);
      const merged = Math.max(dayTotalRef.current, remoteCount);
      setDayTotal(merged);
      lastSyncedDayTotalRef.current = merged;

      if (merged > remoteCount) {
        const goal = getTrackerDailyGoalForZikr();
        await supabase.from('user_daily_activity').upsert(
          {
            user_id: user.id,
            day: dayKey,
            activity: 'tasbeeh',
            count: merged,
            goal,
          },
          { onConflict: 'user_id,day,activity' }
        );
      }
    };

    run();
  }, [user?.id, dayKey]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;

    const run = async () => {
      const { data } = await supabase
        .from('user_monthly_activity')
        .select('count')
        .eq('user_id', user.id)
        .eq('month', monthKey)
        .eq('activity', 'tasbeeh')
        .maybeSingle();

      const remoteCount = Number((data as any)?.count || 0);
      const merged = Math.max(monthTotalRef.current, remoteCount);
      setMonthTotal(merged);
      lastSyncedTotalRef.current = merged;

      if (merged > remoteCount) {
        await supabase.from('user_monthly_activity').upsert(
          {
            user_id: user.id,
            month: monthKey,
            activity: 'tasbeeh',
            count: merged,
          },
          { onConflict: 'user_id,month,activity' }
        );
      }
    };

    run();
  }, [user?.id, monthKey]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;

    const run = async () => {
      const { data } = await supabase
        .from('user_weekly_activity')
        .select('count')
        .eq('user_id', user.id)
        .eq('week', weekKey)
        .eq('activity', 'tasbeeh')
        .maybeSingle();

      const remoteCount = Number((data as any)?.count || 0);
      const merged = Math.max(weekTotalRef.current, remoteCount);
      setWeekTotal(merged);
      lastSyncedWeekTotalRef.current = merged;

      if (merged > remoteCount) {
        await supabase.from('user_weekly_activity').upsert(
          {
            user_id: user.id,
            week: weekKey,
            activity: 'tasbeeh',
            count: merged,
          },
          { onConflict: 'user_id,week,activity' }
        );
      }
    };

    run();
  }, [user?.id, weekKey]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    if (lastSyncedTotalRef.current === monthTotal) return;

    const t = setTimeout(async () => {
      const next = monthTotal;
      const { error } = await supabase.from('user_monthly_activity').upsert(
        {
          user_id: user.id,
          month: monthKey,
          activity: 'tasbeeh',
          count: next,
        },
        { onConflict: 'user_id,month,activity' }
      );
      if (!error) lastSyncedTotalRef.current = next;
    }, 1200);

    return () => clearTimeout(t);
  }, [monthTotal, monthKey, user]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    if (lastSyncedWeekTotalRef.current === weekTotal) return;

    const t = setTimeout(async () => {
      const next = weekTotal;
      const { error } = await supabase.from('user_weekly_activity').upsert(
        {
          user_id: user.id,
          week: weekKey,
          activity: 'tasbeeh',
          count: next,
        },
        { onConflict: 'user_id,week,activity' }
      );
      if (!error) lastSyncedWeekTotalRef.current = next;
    }, 1200);

    return () => clearTimeout(t);
  }, [weekKey, weekTotal, user]);

  useEffect(() => {
    if (!user) return;

    const flush = () => {
      void syncTasbeehProgressNow(dayTotalRef.current, monthTotalRef.current, weekTotalRef.current);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [user, dayKey, monthKey, weekKey]);

  const playClickSound = () => {
    if (!soundEnabled) return;
    
    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          audioContextRef.current = new AudioContext();
        }
      }

      const ctx = audioContextRef.current;
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };

  const bumpZikrTotals = (zikrId: string) => {
    setZikrTotals((prev) => {
      const current = prev[zikrId] || { total: 0, today: 0 };
      const next = { total: current.total + 1, today: current.today + 1 };
      try {
        localStorage.setItem(`tasbeeh_zikr_total_${zikrId}`, String(next.total));
        localStorage.setItem(`tasbeeh_zikr_day_${dayKey}_${zikrId}`, String(next.today));
      } catch {}
      return { ...prev, [zikrId]: next };
    });
  };

  const handleIncrement = () => {
    if (activeZikr?.target && count >= activeZikr.target && activeZikr.target > 0) return;
    if (!activeZikr) return;

    setCount(prev => prev + 1);
    setDayTotal((prev) => {
      const next = prev + 1;
      dayTotalRef.current = next;
      return next;
    });
    setMonthTotal((prev) => {
      const next = prev + 1;
      monthTotalRef.current = next;
      return next;
    });
    setWeekTotal((prev) => {
      const next = prev + 1;
      weekTotalRef.current = next;
      return next;
    });
    bumpZikrTotals(activeZikr.id);

    if (user) {
      void syncTasbeehProgressNow(dayTotalRef.current, monthTotalRef.current, weekTotalRef.current);
    }
    
    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }

    // Sound feedback
    playClickSound();

    // Check completion
    if (activeZikr?.target && count + 1 === activeZikr.target) {
      setCompleted(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the counter?')) {
      setCount(0);
      setCompleted(false);
    }
  };

  const selectZikr = (zikr: Zikr) => {
    setActiveZikr(zikr);
    setCount(0);
    setCompleted(false);
  };

  const exitZikr = () => {
    setActiveZikr(null);
    setCount(0);
    setCompleted(false);
  };

  if (activeZikr) {
    const progress = activeZikr.target > 0 ? (count / activeZikr.target) * 100 : 0;
    const totals = zikrTotals[activeZikr.id] || { total: 0, today: 0 };
    
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button 
            onClick={exitZikr}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h2 className="font-bold text-slate-800">{activeZikr.transliteration}</h2>
            {activeZikr.target > 0 && (
              <p className="text-xs text-slate-500">Target: {activeZikr.target}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              Today: {dayTotal.toLocaleString()} • Week: {weekTotal.toLocaleString()} • Month: {monthTotal.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400">This zikr: {totals.today.toLocaleString()} today • {totals.total.toLocaleString()} total</p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/tracker"
              className="p-2 rounded-full text-slate-600 hover:bg-slate-100"
              title="Open Tracker"
            >
              <Trophy className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 -mr-2 rounded-full ${soundEnabled ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}
              title="Toggle sound"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Main Counter Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 max-w-md mx-auto w-full">
          
          <div className="text-center space-y-4 w-full">
            <p className="text-3xl font-arabic leading-relaxed text-slate-900" dir="rtl">
              {activeZikr.arabic}
            </p>
            <p className="text-slate-600 italic">
              "{activeZikr.translation}"
            </p>
          </div>

          {/* Counter Button */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Progress Ring Background */}
            {activeZikr.target > 0 && (
              <svg className="w-64 h-64 transform -rotate-90 absolute inset-0">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-200"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 120}
                  strokeDashoffset={2 * Math.PI * 120 - (progress / 100) * 2 * Math.PI * 120}
                  className={`text-emerald-500 transition-all duration-300 ease-out ${completed ? 'text-emerald-600' : ''}`}
                />
              </svg>
            )}
            
            <button
              onClick={handleIncrement}
              className={`absolute inset-2 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-10
                ${activeZikr.target === 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-white hover:bg-slate-50'}
              `}
            >
              <div className="text-center">
                <span className={`text-6xl font-bold font-mono ${activeZikr.target === 0 ? 'text-white' : 'text-slate-800'}`}>
                  {count}
                </span>
                {activeZikr.target > 0 && (
                  <p className="text-slate-400 font-medium text-lg mt-1">/ {activeZikr.target}</p>
                )}
              </div>
            </button>
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-slate-500 hover:text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Counter
          </button>

          {/* Virtue Info */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 w-full">
            <div className="flex gap-2 items-start">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">Benefit & Reference:</p>
                <p className="opacity-90 leading-relaxed">{activeZikr.virtue}</p>
                <p className="mt-2 text-xs font-medium opacity-75">{activeZikr.reference}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Tasbeeh <span className="text-emerald-600">Counter</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Engage in the remembrance of Allah with authentic Adhkar from the Sunnah. Select a Zikr to begin.
        </p>
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 text-sm">
          <span className="text-slate-500">This month: <span className="font-bold text-emerald-700">{monthTotal.toLocaleString()}</span></span>
          <span className="hidden sm:inline text-slate-300">•</span>
          {user ? (
            <span className="text-slate-500">Saving to your account</span>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth?mode=signup" className="text-emerald-700 font-semibold hover:underline">
                Sign up
              </Link>
              <span className="text-slate-300">/</span>
              <Link href="/auth" className="text-emerald-700 font-semibold hover:underline">
                Sign in
              </Link>
              <span className="text-slate-400">to save</span>
            </div>
          )}
          <span className="hidden sm:inline text-slate-300">•</span>
          <button
            type="button"
            onClick={() => setViewTab('tracker')}
            className="text-slate-700 font-semibold hover:underline inline-flex items-center gap-2"
          >
            <Trophy className="w-4 h-4 text-amber-600" />
            Open tracker
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setViewTab('zikr')}
            className={`px-4 py-2 text-sm font-semibold ${viewTab === 'zikr' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
          >
            Zikr list
          </button>
          <button
            type="button"
            onClick={() => setViewTab('tracker')}
            className={`px-4 py-2 text-sm font-semibold ${viewTab === 'tracker' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
          >
            Tasbeeh tracker
          </button>
        </div>
      </div>

      {viewTab === 'tracker' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Tasbeeh tracker</h2>
              <div className="text-xs text-slate-500">Today: {dayKey}</div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-700">
              <span className="px-2.5 py-1 rounded-full bg-slate-100">Today {dayTotal.toLocaleString()}</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-100">Week {weekTotal.toLocaleString()}</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-100">Month {monthTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-4 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {ZIKR_LIST.map((z) => {
              const stats = zikrTotals[z.id] || { total: 0, today: 0 };
              return (
                <div key={`row-${z.id}`} className="p-4 bg-white flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{z.transliteration}</div>
                    <div className="text-xs text-slate-500 truncate">{z.translation}</div>
                  </div>
                  <div className="flex items-center gap-4 flex-none">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-500">Today</div>
                      <div className="text-sm font-extrabold text-slate-900">{stats.today.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-slate-500">Total</div>
                      <div className="text-sm font-extrabold text-slate-900">{stats.total.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ZIKR_LIST.map((zikr) => (
            <button
              key={zikr.id}
              onClick={() => selectZikr(zikr)}
              className="flex flex-col text-left bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-emerald-300 transition-all group h-full"
            >
              <div className="flex justify-between items-start w-full mb-4">
                <div className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full text-sm">
                  {zikr.target > 0 ? `${zikr.target}x` : 'Unlimited'}
                </div>
                <div className="bg-slate-100 p-2 rounded-full group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                   <span className="font-arabic text-xl">{zikr.arabic.split(' ')[0]}...</span>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">
                {zikr.transliteration}
              </h3>
              <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                {zikr.translation}
              </p>
              
              <div className="mt-auto pt-4 border-t border-slate-100 w-full">
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {zikr.reference}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
