'use client';

import { useState, useEffect, useRef } from 'react';
import { Heart, Trophy, User, Plus, Info, Volume2, VolumeX, Check, Minus, RotateCcw } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { DUROOD_LIST, DuroodType } from '@/data/durood';
import Link from 'next/link';
import { User as SupabaseUser } from '@supabase/supabase-js';

type LeaderboardEntry = {
  name: string;
  count: number;
  lastUpdated: string;
};

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

function getTrackerDailyGoalForDurood() {
  try {
    const raw = localStorage.getItem('tracker_goals_v1');
    if (!raw) return 100;
    const parsed = JSON.parse(raw) as any;
    const n = Math.floor(Number(parsed?.durood?.daily));
    if (!Number.isFinite(n) || n < 0) return 100;
    return n;
  } catch {
    return 100;
  }
}

export default function DuroodPage() {
  const [activeTab, setActiveTab] = useState<'pledge' | 'leaderboard'>('pledge');
  const [activeDurood, setActiveDurood] = useState<DuroodType>(DUROOD_LIST[0]);
  const [counter, setCounter] = useState(0);
  const counterRef = useRef(0);
  const [goal, setGoal] = useState(() => {
    if (typeof window === 'undefined') return 100;
    try {
      const raw = localStorage.getItem('durood_counter_goal');
      const n = raw ? Number(raw) : NaN;
      if (!Number.isFinite(n)) return 100;
      return Math.max(0, Math.floor(n));
    } catch {
      return 100;
    }
  });
  const [step, setStep] = useState(() => {
    if (typeof window === 'undefined') return 1;
    try {
      const raw = localStorage.getItem('durood_counter_step');
      const n = raw ? Number(raw) : NaN;
      if (!Number.isFinite(n) || n <= 0) return 1;
      return Math.floor(n);
    } catch {
      return 1;
    }
  });
  const holdTimeoutRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const [userName, setUserName] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [dayKey] = useState(() => new Date().toISOString().slice(0, 10));
  const [monthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [weekKey] = useState(() => getIsoWeekKey(new Date()));
  const [dayTotal, setDayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const lastSyncedDayTotalRef = useRef<number | null>(null);
  const lastSyncedTotalRef = useRef<number | null>(null);
  const lastSyncedWeekTotalRef = useRef<number | null>(null);
  const dayTotalRef = useRef(0);
  const weekTotalRef = useRef(0);

  // Audio context for sound
  const audioContextRef = useRef<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initialize data from Supabase or localStorage
  useEffect(() => {
    const supabase = getSupabaseClient();
    
    // Load user profile
    const savedName = localStorage.getItem('durood_username');
    if (savedName) setUserName(savedName);

    const savedDraftCounter = localStorage.getItem('durood_counter_draft');
    if (savedDraftCounter) {
      const n = Number(savedDraftCounter);
      if (Number.isFinite(n) && n > 0) setCounter(Math.floor(n));
    }
    
    const savedTotal = localStorage.getItem('durood_user_total');
    if (savedTotal) setUserTotal(parseInt(savedTotal));

    const savedDayTotal = localStorage.getItem(`durood_day_total_${dayKey}`);
    if (savedDayTotal) setDayTotal(parseInt(savedDayTotal));

    const savedMonthTotal = localStorage.getItem(`durood_month_total_${monthKey}`);
    if (savedMonthTotal) setMonthTotal(parseInt(savedMonthTotal));

    const savedWeekTotal = localStorage.getItem(`durood_week_total_${weekKey}`);
    if (savedWeekTotal) setWeekTotal(parseInt(savedWeekTotal));

    let unsubscribe: (() => void) | null = null;

    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        const u = data.session?.user ?? null;
        setUser(u);
        if (u) {
          const displayName = (u.user_metadata as any)?.display_name || u.email || '';
          if (displayName) setUserName(displayName);
          if (displayName) {
            void (async () => {
              try {
                await supabase.from('public_profiles').upsert(
                  { user_id: u.id, display_name: String(displayName).trim() },
                  { onConflict: 'user_id' }
                );
              } catch {}
            })();
          }
        }
      });

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          const displayName = (u.user_metadata as any)?.display_name || u.email || '';
          if (displayName) setUserName(displayName);
          if (displayName) {
            void (async () => {
              try {
                await supabase.from('public_profiles').upsert(
                  { user_id: u.id, display_name: String(displayName).trim() },
                  { onConflict: 'user_id' }
                );
              } catch {}
            })();
          }
        }
      });
      unsubscribe = () => sub.subscription.unsubscribe();

      const fetchMonthTotal = async (u: SupabaseUser) => {
        const { data } = await supabase
          .from('user_monthly_activity')
          .select('count')
          .eq('user_id', u.id)
          .eq('month', monthKey)
          .eq('activity', 'durood')
          .maybeSingle();

        const remoteCount = Number((data as any)?.count || 0);
        const merged = Math.max(Number(savedMonthTotal || 0), remoteCount);
        setMonthTotal(merged);
        lastSyncedTotalRef.current = merged;
        if (merged > remoteCount) {
          await supabase.from('user_monthly_activity').upsert(
            { user_id: u.id, month: monthKey, activity: 'durood', count: merged },
            { onConflict: 'user_id,month,activity' }
          );
        }
      };

      const fetchWeekTotal = async (u: SupabaseUser) => {
        const { data } = await supabase
          .from('user_weekly_activity')
          .select('count')
          .eq('user_id', u.id)
          .eq('week', weekKey)
          .eq('activity', 'durood')
          .maybeSingle();

        const remoteCount = Number((data as any)?.count || 0);
        const merged = Math.max(Number(savedWeekTotal || 0), remoteCount);
        setWeekTotal(merged);
        weekTotalRef.current = merged;
        lastSyncedWeekTotalRef.current = merged;
        if (merged > remoteCount) {
          await supabase.from('user_weekly_activity').upsert(
            { user_id: u.id, week: weekKey, activity: 'durood', count: merged },
            { onConflict: 'user_id,week,activity' }
          );
        }
      };

      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          fetchMonthTotal(data.user);
          fetchWeekTotal(data.user);
        }
      });
    }

    if (supabase) {
      // Fetch leaderboard from Supabase
      const fetchLeaderboard = async () => {
        try {
          // Try to fetch from the view first (more efficient)
          const { data: viewData, error: viewError } = await supabase
            .from('durood_leaderboard')
            .select('name, total_count, last_updated')
            .order('total_count', { ascending: false })
            .limit(50);

          if (!viewError && viewData) {
            const mappedData: LeaderboardEntry[] = viewData.map((item: any) => ({
              name: item.name,
              count: item.total_count,
              lastUpdated: item.last_updated
            }));
            setLeaderboard(mappedData);
            return;
          }

          // Fallback: Fetch raw pledges if view doesn't exist or fails
          console.log('View fetch failed, falling back to raw pledges aggregation', viewError);
          
          const { data, error } = await supabase
            .from('durood_pledges')
            .select('user_name, count, created_at')
            .order('created_at', { ascending: false })
            .limit(1000); 

          if (error) {
            console.error('Error fetching leaderboard:', error);
            loadLocalLeaderboard();
            return;
          }

          if (data) {
            // Aggregate data
            const aggregated: Record<string, LeaderboardEntry> = {};
            
            data.forEach((pledge: any) => {
              const name = pledge.user_name;
              if (!aggregated[name]) {
                aggregated[name] = {
                  name,
                  count: 0,
                  lastUpdated: pledge.created_at
                };
              }
              aggregated[name].count += pledge.count;
              if (new Date(pledge.created_at) > new Date(aggregated[name].lastUpdated)) {
                aggregated[name].lastUpdated = pledge.created_at;
              }
            });

            const sortedLeaderboard = Object.values(aggregated).sort((a, b) => b.count - a.count);
            setLeaderboard(sortedLeaderboard);
          }
        } catch (e) {
          console.error('Supabase error:', e);
          loadLocalLeaderboard();
        }
      };

      fetchLeaderboard();
    } else {
      loadLocalLeaderboard();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [dayKey, monthKey, weekKey]);

  useEffect(() => {
    weekTotalRef.current = weekTotal;
  }, [weekTotal]);

  useEffect(() => {
    dayTotalRef.current = dayTotal;
  }, [dayTotal]);

  useEffect(() => {
    counterRef.current = counter;
    try {
      localStorage.setItem('durood_counter_draft', String(counter));
    } catch {}
  }, [counter]);

  useEffect(() => {
    try {
      localStorage.setItem('durood_counter_goal', String(goal));
    } catch {}
  }, [goal]);

  useEffect(() => {
    try {
      localStorage.setItem('durood_counter_step', String(step));
    } catch {}
  }, [step]);

  useEffect(() => {
    try {
      localStorage.setItem(`durood_month_total_${monthKey}`, String(monthTotal));
    } catch {}
  }, [monthKey, monthTotal]);

  useEffect(() => {
    try {
      localStorage.setItem(`durood_week_total_${weekKey}`, String(weekTotal));
    } catch {}
  }, [weekKey, weekTotal]);

  useEffect(() => {
    try {
      localStorage.setItem(`durood_day_total_${dayKey}`, String(dayTotal));
    } catch {}
  }, [dayKey, dayTotal]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    if (lastSyncedDayTotalRef.current === dayTotal) return;

    const t = setTimeout(async () => {
      const goal = getTrackerDailyGoalForDurood();
      const payload: Record<string, any> = {
        user_id: user.id,
        day: dayKey,
        activity: 'durood',
        count: Math.max(0, Math.floor(dayTotalRef.current)),
        goal,
      };
      if (goal > 0 && payload.count >= goal) {
        payload.completed = true;
        payload.completed_at = new Date().toISOString();
      }

      const { error } = await supabase.from('user_daily_activity').upsert(payload, { onConflict: 'user_id,day,activity' });
      if (!error) lastSyncedDayTotalRef.current = dayTotalRef.current;
    }, 800);

    return () => clearTimeout(t);
  }, [dayKey, dayTotal, user]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    if (lastSyncedTotalRef.current === monthTotal) return;

    const t = setTimeout(async () => {
      const next = monthTotal;
      const { error } = await supabase.from('user_monthly_activity').upsert(
        { user_id: user.id, month: monthKey, activity: 'durood', count: next },
        { onConflict: 'user_id,month,activity' }
      );
      if (!error) lastSyncedTotalRef.current = next;
    }, 800);

    return () => clearTimeout(t);
  }, [monthKey, monthTotal, user]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    if (lastSyncedWeekTotalRef.current === weekTotal) return;

    const t = setTimeout(async () => {
      const next = weekTotal;
      const { error } = await supabase.from('user_weekly_activity').upsert(
        { user_id: user.id, week: weekKey, activity: 'durood', count: next },
        { onConflict: 'user_id,week,activity' }
      );
      if (!error) lastSyncedWeekTotalRef.current = next;
    }, 800);

    return () => clearTimeout(t);
  }, [weekKey, weekTotal, user]);

  const loadLocalLeaderboard = () => {
    const savedLeaderboard = localStorage.getItem('durood_leaderboard');
    if (savedLeaderboard) {
      setLeaderboard(JSON.parse(savedLeaderboard));
    } else {
      // Seed with some initial data for demonstration
      const initialData: LeaderboardEntry[] = [
        { name: 'Abdullah', count: 1500, lastUpdated: new Date().toISOString() },
        { name: 'Fatima', count: 1200, lastUpdated: new Date().toISOString() },
        { name: 'Ahmed', count: 850, lastUpdated: new Date().toISOString() },
        { name: 'Ayesha', count: 500, lastUpdated: new Date().toISOString() },
        { name: 'User 1', count: 100, lastUpdated: new Date().toISOString() }
      ];
      setLeaderboard(initialData);
      localStorage.setItem('durood_leaderboard', JSON.stringify(initialData));
    }
  };

  useEffect(() => {
    // Cleanup audio context on unmount
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

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
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch {}
  };

  const playSound = () => {
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
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const stopHold = () => {
    if (holdTimeoutRef.current) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const adjustCounter = (delta: number) => {
    const current = counterRef.current;
    const next = Math.max(0, current + delta);
    if (next === current) return;
    counterRef.current = next;
    setCounter(next);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(delta > 0 ? 10 : 6);
    }
    if (delta > 0) playClickSound();

    if (goal > 0 && current < goal && next >= goal) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 40, 80]);
      }
      setNotification({ message: `Goal reached: ${goal.toLocaleString()}!`, type: 'success' });
      setTimeout(() => setNotification(null), 2000);
    }
  };

  const handleCounterPress = () => {
    stopHold();
    adjustCounter(step);
    holdTimeoutRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(() => {
        adjustCounter(step);
      }, 80);
    }, 320);
  };

  const handlePledgeSubmit = async () => {
    if (!userName.trim() || counter <= 0) {
      setNotification({ message: 'Please enter your name and increment the counter', type: 'error' });
      return;
    }

    const count = counter;

    // Update local user stats (always do this for personal tracking)
    const newTotal = userTotal + count;
    setUserTotal(newTotal);
    localStorage.setItem('durood_username', userName);
    localStorage.setItem('durood_user_total', newTotal.toString());
    const nextDayTotal = dayTotal + count;
    setDayTotal(nextDayTotal);
    try {
      localStorage.setItem(`durood_day_total_${dayKey}`, String(nextDayTotal));
    } catch {}
    const nextMonthTotal = monthTotal + count;
    setMonthTotal(nextMonthTotal);
    try {
      localStorage.setItem(`durood_month_total_${monthKey}`, String(nextMonthTotal));
    } catch {}
    const nextWeekTotal = weekTotal + count;
    setWeekTotal(nextWeekTotal);
    try {
      localStorage.setItem(`durood_week_total_${weekKey}`, String(nextWeekTotal));
    } catch {}

    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { error } = await supabase.from('durood_pledges').insert({
          user_name: userName,
          count: count
        });

        if (error) throw error;
        
        // Optimistically update UI
        updateLeaderboardState(userName, count);

        if (user) {
          const goal = getTrackerDailyGoalForDurood();
          const dailyPayload: Record<string, any> = {
            user_id: user.id,
            day: dayKey,
            activity: 'durood',
            count: Math.max(0, Math.floor(nextDayTotal)),
            goal,
          };
          if (goal > 0 && dailyPayload.count >= goal) {
            dailyPayload.completed = true;
            dailyPayload.completed_at = new Date().toISOString();
          }

          const [{ error: dayError }, { error: monthError }, { error: weekError }] = await Promise.all([
            supabase.from('user_daily_activity').upsert(dailyPayload, { onConflict: 'user_id,day,activity' }),
            supabase.from('user_monthly_activity').upsert(
              { user_id: user.id, month: monthKey, activity: 'durood', count: nextMonthTotal },
              { onConflict: 'user_id,month,activity' }
            ),
            supabase.from('user_weekly_activity').upsert(
              { user_id: user.id, week: weekKey, activity: 'durood', count: nextWeekTotal },
              { onConflict: 'user_id,week,activity' }
            ),
          ]);
          if (!dayError) lastSyncedDayTotalRef.current = nextDayTotal;
          if (!monthError) lastSyncedTotalRef.current = nextMonthTotal;
          if (!weekError) lastSyncedWeekTotalRef.current = nextWeekTotal;
        }
      } catch (err) {
        console.error('Error submitting to Supabase:', err);
        setNotification({ message: 'Failed to sync online, saved locally', type: 'error' });
        // Fallback update
        updateLeaderboardState(userName, count);
      }
    } else {
      // Local storage fallback
      updateLeaderboardState(userName, count);
    }

    // Feedback
    playSound();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 50]);
    }

    setNotification({ message: `Successfully added ${count} Durood!`, type: 'success' });
    counterRef.current = 0;
    setCounter(0);
    try {
      localStorage.removeItem('durood_counter_draft');
    } catch {}
    setTimeout(() => setNotification(null), 3000);
  };

  const updateLeaderboardState = (name: string, count: number) => {
    const newLeaderboard = [...leaderboard];
    const existingEntryIndex = newLeaderboard.findIndex(entry => entry.name.toLowerCase() === name.toLowerCase());

    if (existingEntryIndex >= 0) {
      newLeaderboard[existingEntryIndex].count += count;
      newLeaderboard[existingEntryIndex].lastUpdated = new Date().toISOString();
    } else {
      newLeaderboard.push({
        name: name,
        count: count,
        lastUpdated: new Date().toISOString()
      });
    }

    // Sort leaderboard
    newLeaderboard.sort((a, b) => b.count - a.count);
    setLeaderboard(newLeaderboard);
    
    // Save to localStorage as cache/fallback
    localStorage.setItem('durood_leaderboard', JSON.stringify(newLeaderboard));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Heart className="text-rose-500 fill-rose-500" />
            Durood <span className="text-rose-600">Sharif</span>
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/tracker"
              className="p-2 rounded-full text-slate-600 hover:bg-slate-100"
              title="Open Tracker"
            >
              <Trophy className="w-5 h-5 text-amber-600" />
            </Link>
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-full ${soundEnabled ? 'text-rose-600 bg-rose-50' : 'text-slate-400'}`}
              title="Toggle sound"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-t border-slate-100">
          <button
            onClick={() => setActiveTab('pledge')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2
              ${activeTab === 'pledge' 
                ? 'border-rose-500 text-rose-600 bg-rose-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <Plus className="w-4 h-4" />
            Add Durood
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2
              ${activeTab === 'leaderboard' 
                ? 'border-amber-500 text-amber-600 bg-amber-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <Trophy className="w-4 h-4" />
            Leaderboard
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* Durood Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {DUROOD_LIST.map((durood) => (
            <button
              key={durood.id}
              onClick={() => setActiveDurood(durood)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                ${activeDurood.id === durood.id 
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-200' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              {durood.title}
            </button>
          ))}
        </div>

        {/* Durood Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="text-center space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-800">
                {activeDurood.title}
              </h2>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                activeDurood.category === 'Hadith' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {activeDurood.category}
              </span>
            </div>
            <p className="text-2xl font-arabic leading-loose text-slate-900" dir="rtl">
              {activeDurood.arabic}
            </p>
            <div className="space-y-2">
              <p className="text-slate-600 italic text-sm">"{activeDurood.translation}"</p>
            </div>
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm flex gap-3 items-start text-left">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Virtue & Reference:</p>
                <p>{activeDurood.virtue}</p>
                <p className="text-xs text-blue-600 mt-1 font-medium">{activeDurood.reference}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2
            ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}
          `}>
            {notification.type === 'success' ? <Check className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            {notification.message}
          </div>
        )}

        {/* Content based on Tab */}
        {activeTab === 'pledge' ? (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                Your Contribution
              </h3>
              
              <div className="mb-6 p-4 bg-rose-50 rounded-xl border border-rose-100 text-center">
                <p className="text-rose-600 text-sm font-medium uppercase tracking-wider mb-1">Total Recited</p>
                <p className="text-4xl font-bold text-rose-700">{userTotal.toLocaleString()}</p>
                <p className="text-rose-500 text-xs mt-1">Durood Sharif</p>
                <p className="text-xs text-slate-500 mt-3">
                  Today: <span className="font-bold text-rose-700">{dayTotal.toLocaleString()}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  This month: <span className="font-bold text-rose-700">{monthTotal.toLocaleString()}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  This week: <span className="font-bold text-rose-700">{weekTotal.toLocaleString()}</span>
                </p>
                {!user && (
                  <div className="mt-2">
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <Link href="/auth?mode=signup" className="font-semibold text-rose-700 hover:underline">
                        Sign up
                      </Link>
                      <span className="text-slate-300">/</span>
                      <Link href="/auth" className="font-semibold text-rose-700 hover:underline">
                        Sign in
                      </Link>
                      <span className="text-slate-400">to save</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder={user ? "Signed-in name" : "Enter your name"}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all outline-none disabled:bg-slate-50 disabled:text-slate-500"
                      required
                      disabled={!!user}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Counter</label>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 5, 10, 33].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setStep(n)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                              step === n ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            +{n}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (counterRef.current <= 0) return;
                          if (confirm('Reset the counter?')) {
                            counterRef.current = 0;
                            setCounter(0);
                          }
                        }}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </button>
                    </div>

                    <div className="mt-4 flex flex-col items-center gap-4">
                      {(() => {
                        const pct = goal > 0 ? Math.min(100, (counter / goal) * 100) : 0;
                        const r = 88;
                        const c = 110;
                        const circ = 2 * Math.PI * r;
                        const offset = circ - (pct / 100) * circ;
                        return (
                          <div className="relative w-56 h-56 flex items-center justify-center">
                            {goal > 0 && (
                              <svg className="w-56 h-56 transform -rotate-90 absolute inset-0">
                                <circle
                                  cx={c}
                                  cy={c}
                                  r={r}
                                  stroke="currentColor"
                                  strokeWidth="10"
                                  fill="transparent"
                                  className="text-slate-200"
                                />
                                <circle
                                  cx={c}
                                  cy={c}
                                  r={r}
                                  stroke="currentColor"
                                  strokeWidth="10"
                                  fill="transparent"
                                  strokeDasharray={circ}
                                  strokeDashoffset={offset}
                                  className="text-rose-500 transition-all duration-200 ease-out"
                                />
                              </svg>
                            )}

                            <button
                              type="button"
                              onPointerDown={(e) => {
                                e.preventDefault();
                                handleCounterPress();
                              }}
                              onPointerUp={stopHold}
                              onPointerCancel={stopHold}
                              onPointerLeave={stopHold}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  adjustCounter(step);
                                }
                              }}
                              className="absolute inset-2 rounded-full bg-white border border-slate-200 shadow-lg active:scale-95 transition-transform"
                            >
                              <div className="text-center">
                                <p className="text-6xl font-bold text-rose-600 tabular-nums">{counter}</p>
                                <p className="text-xs text-slate-500 mt-1">Tap (hold to repeat)</p>
                                <p className="text-xs text-slate-500 mt-1">Adds {step} each tap</p>
                                {goal > 0 && (
                                  <p className="text-xs text-slate-400 mt-2">
                                    {Math.min(counter, goal).toLocaleString()} / {goal.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </button>
                          </div>
                        );
                      })()}

                      <div className="grid grid-cols-2 gap-3 w-full">
                        <button
                          type="button"
                          onClick={() => adjustCounter(-step)}
                          className="py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <Minus className="w-5 h-5" />
                          -{step}
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustCounter(step)}
                          className="py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <Plus className="w-5 h-5" />
                          +{step}
                        </button>
                      </div>

                      <div className="w-full rounded-xl bg-white border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-slate-600">Goal</span>
                          <input
                            value={goal === 0 ? '' : String(goal)}
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              if (!raw) {
                                setGoal(0);
                                return;
                              }
                              const n = Number(raw);
                              if (!Number.isFinite(n)) return;
                              setGoal(Math.max(0, Math.floor(n)));
                            }}
                            inputMode="numeric"
                            placeholder="Off"
                            className="w-32 text-right px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                          />
                        </div>
                        <div className="mt-2 flex gap-2 flex-wrap justify-end">
                          {[33, 100, 313, 1000].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setGoal(n)}
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                                goal === n ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {n.toLocaleString()}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setGoal(0)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                              goal === 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            Off
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePledgeSubmit}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-rose-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={counter === 0 || !userName.trim()}
                >
                  <Check className="w-5 h-5" />
                  Submit Durood
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-amber-50/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Top Contributors
                </h3>
                <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-100 rounded-full">
                  Global (Demo)
                </span>
              </div>
              
              <div className="divide-y divide-slate-100">
                {leaderboard.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    No contributions yet. Be the first!
                  </div>
                ) : (
                  leaderboard.map((entry, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between p-4 hover:bg-slate-50 transition-colors
                        ${entry.name === userName ? 'bg-rose-50/30' : ''}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm
                          ${index === 0 ? 'bg-amber-100 text-amber-700' : 
                            index === 1 ? 'bg-slate-200 text-slate-700' : 
                            index === 2 ? 'bg-orange-100 text-orange-800' : 
                            'bg-slate-100 text-slate-500'}
                        `}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{entry.name}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(entry.lastUpdated).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{entry.count.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">Durood</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
