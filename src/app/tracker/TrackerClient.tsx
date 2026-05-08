'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { getDisplayNameFromUser, getSafeLeaderboardName } from '@/lib/userDisplayName';
import { surahs } from '@/data/surahs';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Activity, Calendar, Check, Heart, Loader2, LogOut, Trophy } from 'lucide-react';

type ActivityType = 'durood' | 'tasbeeh' | 'quran_juz';

type Goals = {
  durood: { daily: number; weekly: number; monthly: number };
  tasbeeh: { daily: number; weekly: number; monthly: number };
  quran: { pagesDaily: number; pagesWeekly: number; pagesMonthly: number; juzWeekly: number; juzMonthly: number };
};

const DEFAULT_GOALS: Goals = {
  durood: { daily: 100, weekly: 700, monthly: 3000 },
  tasbeeh: { daily: 100, weekly: 700, monthly: 3000 },
  quran: { pagesDaily: 4, pagesWeekly: 28, pagesMonthly: 120, juzWeekly: 7, juzMonthly: 30 },
};

type ProfileRow = {
  user_id: string;
  display_name: string;
};

type WeeklyRow = {
  user_id: string;
  week: string;
  activity: string;
  count: number;
};

type MonthlyRow = {
  user_id: string;
  month: string;
  activity: string;
  count: number;
};

type DailyQuranRow = {
  user_id: string;
  day: string;
  pages: number;
};

type DailySurahRow = {
  user_id: string;
  day: string;
  surah: string;
  completed: boolean;
};

type DailyJuzRow = {
  user_id: string;
  day: string;
  juz: number;
  completed: boolean;
};

type DailyActivityRow = {
  user_id: string;
  day: string;
  activity: string;
  count: number;
  goal?: number | null;
  completed?: boolean | null;
  completed_at?: string | null;
};

function clamp01(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function sanitizeGoalValue(value: unknown) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function normalizeGoals(raw: any): Goals {
  const v = raw ?? {};
  return {
    durood: {
      daily: sanitizeGoalValue(v?.durood?.daily ?? DEFAULT_GOALS.durood.daily),
      weekly: sanitizeGoalValue(v?.durood?.weekly ?? DEFAULT_GOALS.durood.weekly),
      monthly: sanitizeGoalValue(v?.durood?.monthly ?? DEFAULT_GOALS.durood.monthly),
    },
    tasbeeh: {
      daily: sanitizeGoalValue(v?.tasbeeh?.daily ?? DEFAULT_GOALS.tasbeeh.daily),
      weekly: sanitizeGoalValue(v?.tasbeeh?.weekly ?? DEFAULT_GOALS.tasbeeh.weekly),
      monthly: sanitizeGoalValue(v?.tasbeeh?.monthly ?? DEFAULT_GOALS.tasbeeh.monthly),
    },
    quran: {
      pagesDaily: sanitizeGoalValue(v?.quran?.pagesDaily ?? DEFAULT_GOALS.quran.pagesDaily),
      pagesWeekly: sanitizeGoalValue(v?.quran?.pagesWeekly ?? DEFAULT_GOALS.quran.pagesWeekly),
      pagesMonthly: sanitizeGoalValue(v?.quran?.pagesMonthly ?? DEFAULT_GOALS.quran.pagesMonthly),
      juzWeekly: sanitizeGoalValue(v?.quran?.juzWeekly ?? DEFAULT_GOALS.quran.juzWeekly),
      juzMonthly: sanitizeGoalValue(v?.quran?.juzMonthly ?? DEFAULT_GOALS.quran.juzMonthly),
    },
  };
}

function loadGoalsFromStorage(): Goals {
  try {
    const raw = localStorage.getItem('tracker_goals_v1');
    if (!raw) return DEFAULT_GOALS;
    return normalizeGoals(JSON.parse(raw));
  } catch {
    return DEFAULT_GOALS;
  }
}

function saveGoalsToStorage(goals: Goals) {
  try {
    localStorage.setItem('tracker_goals_v1', JSON.stringify(goals));
  } catch {}
}

function dateFromYmd(ymd: string) {
  const [y, m, d] = ymd.split('-').map((v) => Number(v));
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function ymdFromDateUtc(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function getIsoWeekStartDateUtc(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

function pad2(v: number) {
  return String(v).padStart(2, '0');
}

function getNextMonthStartKey(monthKey: string) {
  const [yStr, mStr] = monthKey.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return monthKey;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  return `${nextYear}-${pad2(nextMonth)}-01`;
}

function getIsoWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad2(weekNo)}`;
}

function getWeekProgressRatio(date: Date) {
  const day = date.getDay();
  const daysElapsed = day === 0 ? 7 : day;
  return clamp01(daysElapsed / 7);
}

function getMonthProgressRatio(date: Date) {
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return clamp01(date.getDate() / daysInMonth);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function parsePositiveInt(raw: string) {
  const normalized = raw.trim().replace(/[,_\s]/g, '');
  const n = Math.floor(Number(normalized));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function readLocalNumber(key: string) {
  try {
    const raw = localStorage.getItem(key);
    const n = raw ? Number(raw) : NaN;
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  } catch {
    return 0;
  }
}

function writeLocalNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(Math.max(0, Math.floor(value))));
  } catch {}
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  const pct = Math.round(clamp01(value) * 100);
  return (
    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function getEncouragement(label: string, current: number, goal: number, expectedRatio: number) {
  if (goal <= 0) return { status: 'neutral', text: `${label}: set a goal to see progress.` };
  const ratio = current / goal;
  const diff = ratio - expectedRatio;

  if (ratio >= 1) return { status: 'good', text: `${label}: you’ve hit your goal. Keep going with sincerity.` };
  if (diff >= 0.05) return { status: 'good', text: `${label}: you’re ahead of pace. May Allah accept.` };
  if (diff <= -0.15) {
    const missing = Math.max(0, Math.ceil(goal * expectedRatio - current));
    return { status: 'slow', text: `${label}: a bit behind pace. Add ${formatNumber(missing)} more to catch up.` };
  }
  return { status: 'ok', text: `${label}: on track. Small consistent steps win.` };
}

async function ensurePublicProfile(user: SupabaseUser) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const displayName = getDisplayNameFromUser(user);
  if (!displayName) return;

  try {
    await supabase.from('public_profiles').upsert(
      { user_id: user.id, display_name: displayName },
      { onConflict: 'user_id' }
    );
  } catch {}
}

export default function TrackerClient() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingActivity, setSavingActivity] = useState<ActivityType | null>(null);
  const [leaderboardVersion, setLeaderboardVersion] = useState(0);
  const [syncVersion, setSyncVersion] = useState(0);
  const loadRunIdRef = useRef(0);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().slice(0, 10));
  const selectedDate = useMemo(() => dateFromYmd(selectedDay), [selectedDay]);
  const dayKey = selectedDay;
  const weekKey = useMemo(() => getIsoWeekKey(selectedDate), [selectedDate]);
  const monthKey = useMemo(() => selectedDay.slice(0, 7), [selectedDay]);

  const [weekly, setWeekly] = useState<Record<ActivityType, number>>({ durood: 0, tasbeeh: 0, quran_juz: 0 });
  const [monthly, setMonthly] = useState<Record<ActivityType, number>>({ durood: 0, tasbeeh: 0, quran_juz: 0 });
  const weeklyRef = useRef(weekly);
  const monthlyRef = useRef(monthly);
  const [addDurood, setAddDurood] = useState('');
  const [addZikr, setAddZikr] = useState('');
  const [addJuz, setAddJuz] = useState('');
  const [quranPagesToday, setQuranPagesToday] = useState(0);
  const [quranPagesWeekRemoteTotal, setQuranPagesWeekRemoteTotal] = useState(0);
  const [quranPagesMonthRemoteTotal, setQuranPagesMonthRemoteTotal] = useState(0);
  const [dailyLocal, setDailyLocal] = useState<{ durood: number; tasbeeh: number; quranPages: number }>({ durood: 0, tasbeeh: 0, quranPages: 0 });
  const [goals, setGoals] = useState<Goals>(() => (typeof window === 'undefined' ? DEFAULT_GOALS : loadGoalsFromStorage()));
  const [goalsDraft, setGoalsDraft] = useState<Goals>(() => (typeof window === 'undefined' ? DEFAULT_GOALS : loadGoalsFromStorage()));
  const [dailyJuz, setDailyJuz] = useState<number[]>([]);
  const [dailyJuzInput, setDailyJuzInput] = useState('');
  const [monthJuzUnique, setMonthJuzUnique] = useState(0);

  const [dailySurahs, setDailySurahs] = useState<string[]>([]);
  const [surahToAdd, setSurahToAdd] = useState(() => (surahs[0]?.name_simple ? surahs[0].name_simple : 'Al-Fatiha'));
  const [monthSurahUnique, setMonthSurahUnique] = useState(0);

  const monthJuzGoal = 30;
  const monthSurahGoal = 114;

  const [weekLeaders, setWeekLeaders] = useState<
    Array<{
      id: string;
      name: string;
      pct: number;
      durood: number;
      tasbeeh: number;
      quran_pages: number;
      quran_juz: number;
      doneDuroodDays: number;
      doneZikrDays: number;
      doneQuranDays: number;
    }>
  >([]);
  const [monthLeaders, setMonthLeaders] = useState<
    Array<{
      id: string;
      name: string;
      pct: number;
      durood: number;
      tasbeeh: number;
      quran_pages: number;
      quran_juz: number;
      doneDuroodDays: number;
      doneZikrDays: number;
      doneQuranDays: number;
    }>
  >([]);
  const [weekDoneDays, setWeekDoneDays] = useState<{ durood: string[]; tasbeeh: string[]; quranPages: string[] }>({ durood: [], tasbeeh: [], quranPages: [] });
  const [monthDoneDays, setMonthDoneDays] = useState<{ durood: string[]; tasbeeh: string[]; quranPages: string[] }>({ durood: [], tasbeeh: [], quranPages: [] });
  const [completionScope, setCompletionScope] = useState<'week' | 'month'>('week');

  useEffect(() => {
    weeklyRef.current = weekly;
  }, [weekly]);

  useEffect(() => {
    monthlyRef.current = monthly;
  }, [monthly]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      // If no session, we still load local data via the data effect below
      if (!data.session?.user) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const localDurood = readLocalNumber(`durood_day_total_${dayKey}`);
    const localTasbeeh = readLocalNumber(`tasbeeh_day_total_${dayKey}`);
    const localQuranPages = readLocalNumber(`quran_pages_${dayKey}`);
    setDailyLocal({ durood: localDurood, tasbeeh: localTasbeeh, quranPages: localQuranPages });

    if (!supabase || !user) {
      const nextWeekly: Record<ActivityType, number> = {
        durood: readLocalNumber(`durood_week_total_${weekKey}`),
        tasbeeh: readLocalNumber(`tasbeeh_week_total_${weekKey}`),
        quran_juz: readLocalNumber(`quran_juz_week_total_${weekKey}`),
      };
      const nextMonthly: Record<ActivityType, number> = {
        durood: readLocalNumber(`durood_month_total_${monthKey}`),
        tasbeeh: readLocalNumber(`tasbeeh_month_total_${monthKey}`),
        quran_juz: readLocalNumber(`quran_juz_month_total_${monthKey}`),
      };
      weeklyRef.current = nextWeekly;
      monthlyRef.current = nextMonthly;
      setWeekly(nextWeekly);
      setMonthly(nextMonthly);
      setQuranPagesToday(localQuranPages);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      const runId = ++loadRunIdRef.current;
      setLoading(true);
      try {
        await ensurePublicProfile(user);

        const monthStartKey = `${monthKey}-01`;
        const nextMonthStartKey = getNextMonthStartKey(monthKey);
        const weekStartUtcLocal = getIsoWeekStartDateUtc(dateFromYmd(dayKey));
        const weekStartKey = ymdFromDateUtc(weekStartUtcLocal);
        const weekEndKey = ymdFromDateUtc(addUtcDays(weekStartUtcLocal, 7));

        const [weeklyRes, monthlyRes, quranRes, dailySurahRes, dailyJuzRes, monthSurahRes, monthJuzRes, dailyActivityRes, weekActivityRes, monthActivityRes, weekQuranRes, monthQuranRes] = await Promise.all([
          supabase
            .from('user_weekly_activity')
            .select('user_id,week,activity,count')
            .eq('user_id', user.id)
            .eq('week', weekKey)
            .in('activity', ['durood', 'tasbeeh', 'quran_juz']),
          supabase
            .from('user_monthly_activity')
            .select('user_id,month,activity,count')
            .eq('user_id', user.id)
            .eq('month', monthKey)
            .in('activity', ['durood', 'tasbeeh', 'quran_juz']),
          supabase
            .from('user_daily_quran')
            .select('user_id,day,pages')
            .eq('user_id', user.id)
            .eq('day', dayKey)
            .maybeSingle(),
          supabase
            .from('user_daily_surah')
            .select('user_id,day,surah,completed')
            .eq('user_id', user.id)
            .eq('day', dayKey)
            .limit(200),
          supabase
            .from('user_daily_juz')
            .select('user_id,day,juz,completed')
            .eq('user_id', user.id)
            .eq('day', dayKey)
            .limit(60),
          supabase
            .from('user_daily_surah')
            .select('surah')
            .eq('user_id', user.id)
            .gte('day', monthStartKey)
            .lt('day', nextMonthStartKey)
            .limit(5000),
          supabase
            .from('user_daily_juz')
            .select('juz')
            .eq('user_id', user.id)
            .gte('day', monthStartKey)
            .lt('day', nextMonthStartKey)
            .limit(5000),
          supabase
            .from('user_daily_activity')
            .select('user_id,day,activity,count,goal,completed,completed_at')
            .eq('user_id', user.id)
            .eq('day', dayKey)
            .in('activity', ['durood', 'tasbeeh'])
            .limit(10),
          supabase
            .from('user_daily_activity')
            .select('user_id,day,activity,completed')
            .eq('user_id', user.id)
            .gte('day', weekStartKey)
            .lt('day', weekEndKey)
            .in('activity', ['durood', 'tasbeeh'])
            .eq('completed', true)
            .limit(5000),
          supabase
            .from('user_daily_activity')
            .select('user_id,day,activity,completed')
            .eq('user_id', user.id)
            .gte('day', monthStartKey)
            .lt('day', nextMonthStartKey)
            .in('activity', ['durood', 'tasbeeh'])
            .eq('completed', true)
            .limit(5000),
          supabase
            .from('user_daily_quran')
            .select('user_id,day,pages')
            .eq('user_id', user.id)
            .gte('day', weekStartKey)
            .lt('day', weekEndKey)
            .limit(100),
          supabase
            .from('user_daily_quran')
            .select('user_id,day,pages')
            .eq('user_id', user.id)
            .gte('day', monthStartKey)
            .lt('day', nextMonthStartKey)
            .limit(1000),
        ]);

        if (cancelled || runId !== loadRunIdRef.current) return;

        const w = (weeklyRes.data ?? []) as unknown as WeeklyRow[];
        const m = (monthlyRes.data ?? []) as unknown as MonthlyRow[];
        const q = (quranRes.data ?? null) as unknown as DailyQuranRow | null;
        const s = (dailySurahRes.data ?? []) as unknown as DailySurahRow[];
        const j = (dailyJuzRes.data ?? []) as unknown as DailyJuzRow[];
        const dailyActs = (dailyActivityRes.data ?? []) as unknown as DailyActivityRow[];

        const nextWeekly: Record<ActivityType, number> = { durood: 0, tasbeeh: 0, quran_juz: 0 };
        w.forEach((row) => {
          if (row.activity === 'durood') nextWeekly.durood = Number(row.count || 0);
          if (row.activity === 'tasbeeh') nextWeekly.tasbeeh = Number(row.count || 0);
          if (row.activity === 'quran_juz') nextWeekly.quran_juz = Number(row.count || 0);
        });
        nextWeekly.durood = Math.max(nextWeekly.durood, readLocalNumber(`durood_week_total_${weekKey}`));
        nextWeekly.tasbeeh = Math.max(nextWeekly.tasbeeh, readLocalNumber(`tasbeeh_week_total_${weekKey}`));
        nextWeekly.quran_juz = Math.max(nextWeekly.quran_juz, readLocalNumber(`quran_juz_week_total_${weekKey}`));
        weeklyRef.current = nextWeekly;
        setWeekly(nextWeekly);

        const nextMonthly: Record<ActivityType, number> = { durood: 0, tasbeeh: 0, quran_juz: 0 };
        m.forEach((row) => {
          if (row.activity === 'durood') nextMonthly.durood = Number(row.count || 0);
          if (row.activity === 'tasbeeh') nextMonthly.tasbeeh = Number(row.count || 0);
          if (row.activity === 'quran_juz') nextMonthly.quran_juz = Number(row.count || 0);
        });
        nextMonthly.durood = Math.max(nextMonthly.durood, readLocalNumber(`durood_month_total_${monthKey}`));
        nextMonthly.tasbeeh = Math.max(nextMonthly.tasbeeh, readLocalNumber(`tasbeeh_month_total_${monthKey}`));
        nextMonthly.quran_juz = Math.max(nextMonthly.quran_juz, readLocalNumber(`quran_juz_month_total_${monthKey}`));
        monthlyRef.current = nextMonthly;
        setMonthly(nextMonthly);

        const remotePages = Number(q?.pages || 0);
        const localPages = readLocalNumber(`quran_pages_${dayKey}`);
        const mergedPages = Math.max(remotePages, localPages);
        setQuranPagesToday(mergedPages);
        writeLocalNumber(`quran_pages_${dayKey}`, mergedPages);
        const remoteDuroodDay = Number(dailyActs.find((x) => x.activity === 'durood')?.count || 0);
        const remoteTasbeehDay = Number(dailyActs.find((x) => x.activity === 'tasbeeh')?.count || 0);
        const mergedDuroodDay = Math.max(remoteDuroodDay, localDurood);
        const mergedTasbeehDay = Math.max(remoteTasbeehDay, localTasbeeh);
        writeLocalNumber(`durood_day_total_${dayKey}`, mergedDuroodDay);
        writeLocalNumber(`tasbeeh_day_total_${dayKey}`, mergedTasbeehDay);
        setDailyLocal({ durood: mergedDuroodDay, tasbeeh: mergedTasbeehDay, quranPages: mergedPages });

        const weekActs = (weekActivityRes.data ?? []) as unknown as Array<{ day: string; activity: string; completed?: boolean | null }>;
        const monthActs = (monthActivityRes.data ?? []) as unknown as Array<{ day: string; activity: string; completed?: boolean | null }>;
        const weekQuranRows = (weekQuranRes.data ?? []) as unknown as Array<{ day: string; pages: number }>;
        const monthQuranRows = (monthQuranRes.data ?? []) as unknown as Array<{ day: string; pages: number }>;

        setQuranPagesWeekRemoteTotal(weekQuranRows.reduce((sum, row) => sum + Math.max(0, Number(row.pages || 0)), 0));
        setQuranPagesMonthRemoteTotal(monthQuranRows.reduce((sum, row) => sum + Math.max(0, Number(row.pages || 0)), 0));

        const nextWeekDoneDurood = new Set<string>();
        const nextWeekDoneZikr = new Set<string>();
        weekActs.forEach((row) => {
          if (!row?.completed) return;
          const d = String(row.day || '');
          if (!d) return;
          if (row.activity === 'durood') nextWeekDoneDurood.add(d);
          if (row.activity === 'tasbeeh') nextWeekDoneZikr.add(d);
        });
        const nextWeekDoneQuran = new Set<string>();
        const quranDailyGoal = Math.max(0, Math.floor(goals.quran.pagesDaily));
        if (quranDailyGoal > 0) {
          weekQuranRows.forEach((row) => {
            const d = String(row.day || '');
            const pages = Number(row.pages || 0);
            if (d && pages >= quranDailyGoal) nextWeekDoneQuran.add(d);
          });
        }
        setWeekDoneDays({
          durood: Array.from(nextWeekDoneDurood).sort(),
          tasbeeh: Array.from(nextWeekDoneZikr).sort(),
          quranPages: Array.from(nextWeekDoneQuran).sort(),
        });

        const nextMonthDoneDurood = new Set<string>();
        const nextMonthDoneZikr = new Set<string>();
        monthActs.forEach((row) => {
          if (!row?.completed) return;
          const d = String(row.day || '');
          if (!d) return;
          if (row.activity === 'durood') nextMonthDoneDurood.add(d);
          if (row.activity === 'tasbeeh') nextMonthDoneZikr.add(d);
        });
        const nextMonthDoneQuran = new Set<string>();
        if (quranDailyGoal > 0) {
          monthQuranRows.forEach((row) => {
            const d = String(row.day || '');
            const pages = Number(row.pages || 0);
            if (d && pages >= quranDailyGoal) nextMonthDoneQuran.add(d);
          });
        }
        setMonthDoneDays({
          durood: Array.from(nextMonthDoneDurood).sort(),
          tasbeeh: Array.from(nextMonthDoneZikr).sort(),
          quranPages: Array.from(nextMonthDoneQuran).sort(),
        });

        const surahIdByName = new Map<string, number>(surahs.map((x) => [x.name_simple, x.id]));
        const nextDailySurahs = s
          .filter((row) => Boolean(row.completed))
          .map((row) => String(row.surah))
          .filter((name) => name.length > 0);
        nextDailySurahs.sort((a, b) => (surahIdByName.get(a) ?? 999) - (surahIdByName.get(b) ?? 999));
        setDailySurahs(Array.from(new Set(nextDailySurahs)));

        const nextDailyJuz = j.filter((row) => Boolean(row.completed)).map((row) => Number(row.juz)).filter((n) => Number.isFinite(n));
        nextDailyJuz.sort((a, b) => a - b);
        setDailyJuz(Array.from(new Set(nextDailyJuz)));

        const monthSurahs = (monthSurahRes.data ?? []) as Array<{ surah: string }>;
        const monthJuz = (monthJuzRes.data ?? []) as Array<{ juz: number }>;
        setMonthSurahUnique(new Set(monthSurahs.map((r) => String(r.surah))).size);
        setMonthJuzUnique(new Set(monthJuz.map((r) => Number(r.juz))).size);
      } catch (e: any) {
        if (!cancelled && runId === loadRunIdRef.current) {
          setSaveError(e?.message || 'Failed to load tracker data.');
        }
      } finally {
        if (!cancelled && runId === loadRunIdRef.current) {
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [dayKey, goals.quran.pagesDaily, monthKey, syncVersion, user, weekKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loaded = loadGoalsFromStorage();
    setGoals(loaded);
    setGoalsDraft(loaded);
  }, []);

  useEffect(() => {
    saveGoalsToStorage(goals);
  }, [goals]);

  const weekPace = useMemo(() => getWeekProgressRatio(selectedDate), [selectedDate]);
  const monthPace = useMemo(() => getMonthProgressRatio(selectedDate), [selectedDate]);

  const weekStartUtc = useMemo(() => getIsoWeekStartDateUtc(selectedDate), [selectedDate]);

  const quranPagesWeekTotal = useMemo(() => {
    let localTotal = 0;
    for (let i = 0; i < 7; i += 1) {
      const ymd = ymdFromDateUtc(addUtcDays(weekStartUtc, i));
      localTotal += readLocalNumber(`quran_pages_${ymd}`);
    }
    if (!user) return localTotal;
    return Math.max(localTotal, quranPagesWeekRemoteTotal);
  }, [quranPagesWeekRemoteTotal, user, weekStartUtc]);

  const quranPagesMonthTotal = useMemo(() => {
    const y = selectedDate.getUTCFullYear();
    const m = selectedDate.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    let localTotal = 0;
    for (let d = 1; d <= daysInMonth; d += 1) {
      const ymd = `${y}-${pad2(m + 1)}-${pad2(d)}`;
      localTotal += readLocalNumber(`quran_pages_${ymd}`);
    }
    if (!user) return localTotal;
    return Math.max(localTotal, quranPagesMonthRemoteTotal);
  }, [quranPagesMonthRemoteTotal, selectedDate, user]);

  const dailyDuroodEncouragement = useMemo(
    () => getEncouragement('Today Durood', dailyLocal.durood, goals.durood.daily, 1),
    [dailyLocal.durood, goals.durood.daily]
  );
  const weeklyDuroodEncouragement = useMemo(
    () => getEncouragement('Weekly Durood', weekly.durood, goals.durood.weekly, weekPace),
    [goals.durood.weekly, weekPace, weekly.durood]
  );
  const monthlyDuroodEncouragement = useMemo(
    () => getEncouragement('Monthly Durood', monthly.durood, goals.durood.monthly, monthPace),
    [goals.durood.monthly, monthPace, monthly.durood]
  );

  const dailyZikrEncouragement = useMemo(
    () => getEncouragement('Today Zikr', dailyLocal.tasbeeh, goals.tasbeeh.daily, 1),
    [dailyLocal.tasbeeh, goals.tasbeeh.daily]
  );
  const weeklyZikrEncouragement = useMemo(
    () => getEncouragement('Weekly Zikr', weekly.tasbeeh, goals.tasbeeh.weekly, weekPace),
    [goals.tasbeeh.weekly, weekPace, weekly.tasbeeh]
  );
  const monthlyZikrEncouragement = useMemo(
    () => getEncouragement('Monthly Zikr', monthly.tasbeeh, goals.tasbeeh.monthly, monthPace),
    [goals.tasbeeh.monthly, monthPace, monthly.tasbeeh]
  );

  const dailyQuranPagesEncouragement = useMemo(
    () => getEncouragement('Today Qur’an (Pages)', quranPagesToday, goals.quran.pagesDaily, 1),
    [goals.quran.pagesDaily, quranPagesToday]
  );
  const weeklyQuranPagesEncouragement = useMemo(
    () => getEncouragement('Weekly Qur’an (Pages)', quranPagesWeekTotal, goals.quran.pagesWeekly, weekPace),
    [goals.quran.pagesWeekly, quranPagesWeekTotal, weekPace]
  );
  const monthlyQuranPagesEncouragement = useMemo(
    () => getEncouragement('Monthly Qur’an (Pages)', quranPagesMonthTotal, goals.quran.pagesMonthly, monthPace),
    [goals.quran.pagesMonthly, monthPace, quranPagesMonthTotal]
  );

  const weeklyQuranJuzEncouragement = useMemo(
    () => getEncouragement('Weekly Qur’an (Juz)', weekly.quran_juz, goals.quran.juzWeekly, weekPace),
    [goals.quran.juzWeekly, weekPace, weekly.quran_juz]
  );

  const monthlyQuranJuzEncouragement = useMemo(
    () => getEncouragement('Monthly Qur’an (Juz)', monthly.quran_juz, goals.quran.juzMonthly, monthPace),
    [goals.quran.juzMonthly, monthPace, monthly.quran_juz]
  );

  const saveQuranPages = async (pages: number) => {
    const supabase = getSupabaseClient();
    const next = Math.max(0, Math.floor(pages));
    setQuranPagesToday(next);
    writeLocalNumber(`quran_pages_${dayKey}`, next);
    setDailyLocal((prev) => ({ ...prev, quranPages: next }));

    if (!supabase || !user) return;
    await ensurePublicProfile(user);
    const { error } = await supabase.from('user_daily_quran').upsert(
      { user_id: user.id, day: dayKey, pages: next },
      { onConflict: 'user_id,day' }
    );
    if (error) {
      setSaveError(error.message);
      setSyncVersion((v) => v + 1);
      return;
    }
    setSaveError(null);
    setSyncVersion((v) => v + 1);
    setLeaderboardVersion((v) => v + 1);
  };

  const addDailyJuzEntry = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    await ensurePublicProfile(user);
    const juz = Math.floor(Number(dailyJuzInput));
    if (!Number.isFinite(juz) || juz < 1 || juz > 30) return;
    if (dailyJuz.includes(juz)) return;

    setDailyJuz((prev) => [...prev, juz].sort((a, b) => a - b));
    const { error } = await supabase.from('user_daily_juz').upsert(
      { user_id: user.id, day: dayKey, juz, completed: true },
      { onConflict: 'user_id,day,juz' }
    );
    if (error) {
      setSaveError(error.message);
      setSyncVersion((v) => v + 1);
      return;
    }
    setDailyJuzInput('');
    setSaveError(null);
    setSyncVersion((v) => v + 1);
  };

  const removeDailyJuzEntry = async (juz: number) => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    setDailyJuz((prev) => prev.filter((x) => x !== juz));
    const { error } = await supabase.from('user_daily_juz').delete().eq('user_id', user.id).eq('day', dayKey).eq('juz', juz);
    if (error) {
      setSaveError(error.message);
      setSyncVersion((v) => v + 1);
      return;
    }
    setSaveError(null);
    setSyncVersion((v) => v + 1);
  };

  const addDailySurahEntry = async (surahName: string) => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    await ensurePublicProfile(user);
    const surah = surahName.trim();
    if (!surah) return;
    if (dailySurahs.includes(surah)) return;

    setDailySurahs((prev) => [...prev, surah]);
    const { error } = await supabase.from('user_daily_surah').upsert(
      { user_id: user.id, day: dayKey, surah, completed: true },
      { onConflict: 'user_id,day,surah' }
    );
    if (error) {
      setSaveError(error.message);
      setSyncVersion((v) => v + 1);
      return;
    }
    setSaveError(null);
    setSyncVersion((v) => v + 1);
  };

  const removeDailySurahEntry = async (surah: string) => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    setDailySurahs((prev) => prev.filter((s) => s !== surah));
    const { error } = await supabase.from('user_daily_surah').delete().eq('user_id', user.id).eq('day', dayKey).eq('surah', surah);
    if (error) {
      setSaveError(error.message);
      setSyncVersion((v) => v + 1);
      return;
    }
    setSaveError(null);
    setSyncVersion((v) => v + 1);
  };

  const upsertDailyActivity = async (activity: 'durood' | 'tasbeeh', count: number, dailyGoal: number) => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    await ensurePublicProfile(user);
    const nextCount = Math.max(0, Math.floor(count));
    const goal = Math.max(0, Math.floor(dailyGoal));
    const completed = goal > 0 && nextCount >= goal;
    const payload: Record<string, any> = { user_id: user.id, day: dayKey, activity, count: nextCount, goal };
    if (completed) payload.completed = true;
    if (completed) payload.completed_at = new Date().toISOString();
    const { error } = await supabase.from('user_daily_activity').upsert(payload, { onConflict: 'user_id,day,activity' });
    if (error) {
      setSaveError(error.message);
      setSyncVersion((v) => v + 1);
      return;
    }
    setSaveError(null);
  };

  const addActivity = async (activity: ActivityType, rawDelta: string) => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;

    const delta = parsePositiveInt(rawDelta);
    if (delta === null) return;

    await ensurePublicProfile(user);

    setSavingActivity(activity);

    const nextWeekly = (weeklyRef.current[activity] || 0) + delta;
    const nextMonthly = (monthlyRef.current[activity] || 0) + delta;

    weeklyRef.current = { ...weeklyRef.current, [activity]: nextWeekly };
    monthlyRef.current = { ...monthlyRef.current, [activity]: nextMonthly };
    setWeekly((prev) => ({ ...prev, [activity]: nextWeekly }));
    setMonthly((prev) => ({ ...prev, [activity]: nextMonthly }));

    if (activity === 'durood') {
      const nextDay = (dailyLocal.durood || 0) + delta;
      writeLocalNumber(`durood_day_total_${dayKey}`, nextDay);
      writeLocalNumber(`durood_week_total_${weekKey}`, nextWeekly);
      writeLocalNumber(`durood_month_total_${monthKey}`, nextMonthly);
      setDailyLocal((prev) => ({ ...prev, durood: nextDay }));
      await upsertDailyActivity('durood', nextDay, goals.durood.daily);
    }
    if (activity === 'tasbeeh') {
      const nextDay = (dailyLocal.tasbeeh || 0) + delta;
      writeLocalNumber(`tasbeeh_day_total_${dayKey}`, nextDay);
      writeLocalNumber(`tasbeeh_week_total_${weekKey}`, nextWeekly);
      writeLocalNumber(`tasbeeh_month_total_${monthKey}`, nextMonthly);
      setDailyLocal((prev) => ({ ...prev, tasbeeh: nextDay }));
      await upsertDailyActivity('tasbeeh', nextDay, goals.tasbeeh.daily);
    }

    const [{ error: wErr }, { error: mErr }] = await Promise.all([
      supabase.from('user_weekly_activity').upsert(
        { user_id: user.id, week: weekKey, activity, count: nextWeekly },
        { onConflict: 'user_id,week,activity' }
      ),
      supabase.from('user_monthly_activity').upsert(
        { user_id: user.id, month: monthKey, activity, count: nextMonthly },
        { onConflict: 'user_id,month,activity' }
      ),
    ]);

    setSavingActivity(null);
    setLeaderboardVersion((v) => v + 1);
    setSaveError(wErr?.message || mErr?.message || null);
    setSyncVersion((v) => v + 1);

    if (activity === 'durood') setAddDurood('');
    if (activity === 'tasbeeh') setAddZikr('');
    if (activity === 'quran_juz') setAddJuz('');
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;

    const loadLeaderboard = async () => {
      const weekStartUtcLocal = getIsoWeekStartDateUtc(dateFromYmd(dayKey));
      const weekStartKey = ymdFromDateUtc(weekStartUtcLocal);
      const weekEndKey = ymdFromDateUtc(addUtcDays(weekStartUtcLocal, 7));
      const monthStartKey = `${monthKey}-01`;
      const nextMonthStartKey = getNextMonthStartKey(monthKey);

      const [weekRowsRes, monthRowsRes, weekDoneRes, monthDoneRes, weekQuranDoneRes, monthQuranDoneRes] = await Promise.all([
        supabase
          .from('user_weekly_activity')
          .select('user_id,week,activity,count')
          .eq('week', weekKey)
          .in('activity', ['durood', 'tasbeeh', 'quran_juz'])
          .limit(5000),
        supabase
          .from('user_monthly_activity')
          .select('user_id,month,activity,count')
          .eq('month', monthKey)
          .in('activity', ['durood', 'tasbeeh', 'quran_juz'])
          .limit(5000),
        supabase
          .from('user_daily_activity')
          .select('user_id,day,activity,completed')
          .gte('day', weekStartKey)
          .lt('day', weekEndKey)
          .in('activity', ['durood', 'tasbeeh'])
          .eq('completed', true)
          .limit(5000),
        supabase
          .from('user_daily_activity')
          .select('user_id,day,activity,completed')
          .gte('day', monthStartKey)
          .lt('day', nextMonthStartKey)
          .in('activity', ['durood', 'tasbeeh'])
          .eq('completed', true)
          .limit(20000),
        supabase
          .from('user_daily_quran')
          .select('user_id,day,pages')
          .gte('day', weekStartKey)
          .lt('day', weekEndKey)
          .limit(5000),
        supabase
          .from('user_daily_quran')
          .select('user_id,day,pages')
          .gte('day', monthStartKey)
          .lt('day', nextMonthStartKey)
          .limit(20000),
      ]);

      const weekRows = (weekRowsRes.data ?? []) as unknown as WeeklyRow[];
      const monthRows = (monthRowsRes.data ?? []) as unknown as MonthlyRow[];

      const weekAgg: Record<string, { durood: number; tasbeeh: number; quran_pages: number; quran_juz: number }> = {};
      weekRows.forEach((r) => {
        if (!weekAgg[r.user_id]) weekAgg[r.user_id] = { durood: 0, tasbeeh: 0, quran_pages: 0, quran_juz: 0 };
        if (r.activity === 'durood') weekAgg[r.user_id].durood = Number(r.count || 0);
        if (r.activity === 'tasbeeh') weekAgg[r.user_id].tasbeeh = Number(r.count || 0);
        if (r.activity === 'quran_juz') weekAgg[r.user_id].quran_juz = Number(r.count || 0);
      });

      const monthAgg: Record<string, { durood: number; tasbeeh: number; quran_pages: number; quran_juz: number }> = {};
      monthRows.forEach((r) => {
        if (!monthAgg[r.user_id]) monthAgg[r.user_id] = { durood: 0, tasbeeh: 0, quran_pages: 0, quran_juz: 0 };
        if (r.activity === 'durood') monthAgg[r.user_id].durood = Number(r.count || 0);
        if (r.activity === 'tasbeeh') monthAgg[r.user_id].tasbeeh = Number(r.count || 0);
        if (r.activity === 'quran_juz') monthAgg[r.user_id].quran_juz = Number(r.count || 0);
      });

      if (!weekAgg[user.id]) weekAgg[user.id] = { durood: 0, tasbeeh: 0, quran_pages: 0, quran_juz: 0 };
      if (!monthAgg[user.id]) monthAgg[user.id] = { durood: 0, tasbeeh: 0, quran_pages: 0, quran_juz: 0 };

      const weekDoneRows = (weekDoneRes.data ?? []) as unknown as Array<{ user_id: string; day: string; activity: string; completed?: boolean | null }>;
      const monthDoneRows = (monthDoneRes.data ?? []) as unknown as Array<{ user_id: string; day: string; activity: string; completed?: boolean | null }>;
      const weekQuranRows = (weekQuranDoneRes.data ?? []) as unknown as Array<{ user_id: string; day: string; pages: number }>;
      const monthQuranRows = (monthQuranDoneRes.data ?? []) as unknown as Array<{ user_id: string; day: string; pages: number }>;

      const userIdSet = new Set<string>([...Object.keys(weekAgg), ...Object.keys(monthAgg), user.id]);
      weekDoneRows.forEach((r) => {
        if (r?.user_id) userIdSet.add(String(r.user_id));
      });
      monthDoneRows.forEach((r) => {
        if (r?.user_id) userIdSet.add(String(r.user_id));
      });
      weekQuranRows.forEach((r) => {
        if (r?.user_id) userIdSet.add(String(r.user_id));
      });
      monthQuranRows.forEach((r) => {
        if (r?.user_id) userIdSet.add(String(r.user_id));
      });

      const userIds = Array.from(userIdSet);
      if (userIds.length === 0) {
        setWeekLeaders([]);
        setMonthLeaders([]);
        return;
      }

      let nameById = new Map<string, string>();
      try {
        const profilesRes = await supabase.from('public_profiles').select('user_id,display_name').in('user_id', userIds);
        const profiles = (profilesRes.data ?? []) as unknown as ProfileRow[];
        nameById = new Map<string, string>(profiles.map((p) => [p.user_id, p.display_name]));
      } catch {}
      const selfName = getDisplayNameFromUser(user);

      const weekMax = Object.values(weekAgg).reduce(
        (acc, v) => ({
          durood: Math.max(acc.durood, v.durood),
          tasbeeh: Math.max(acc.tasbeeh, v.tasbeeh),
          quran_pages: Math.max(acc.quran_pages, v.quran_pages),
          quran_juz: Math.max(acc.quran_juz, v.quran_juz),
        }),
        { durood: 0, tasbeeh: 0, quran_pages: 0, quran_juz: 0 }
      );

      const monthMax = Object.values(monthAgg).reduce(
        (acc, v) => ({
          durood: Math.max(acc.durood, v.durood),
          tasbeeh: Math.max(acc.tasbeeh, v.tasbeeh),
          quran_pages: Math.max(acc.quran_pages, v.quran_pages),
          quran_juz: Math.max(acc.quran_juz, v.quran_juz),
        }),
        { durood: 0, tasbeeh: 0, quran_pages: 0, quran_juz: 0 }
      );

      const weekDoneByUser: Record<string, { durood: Set<string>; tasbeeh: Set<string>; quran: Set<string> }> = {};
      const monthDoneByUser: Record<string, { durood: Set<string>; tasbeeh: Set<string>; quran: Set<string> }> = {};

      userIds.forEach((id) => {
        weekDoneByUser[id] = { durood: new Set(), tasbeeh: new Set(), quran: new Set() };
        monthDoneByUser[id] = { durood: new Set(), tasbeeh: new Set(), quran: new Set() };
      });

      weekDoneRows.forEach((r) => {
        if (!r?.completed) return;
        const id = String(r.user_id || '');
        const day = String(r.day || '');
        if (!id || !day) return;
        if (!weekDoneByUser[id]) weekDoneByUser[id] = { durood: new Set(), tasbeeh: new Set(), quran: new Set() };
        if (r.activity === 'durood') weekDoneByUser[id].durood.add(day);
        if (r.activity === 'tasbeeh') weekDoneByUser[id].tasbeeh.add(day);
      });

      monthDoneRows.forEach((r) => {
        if (!r?.completed) return;
        const id = String(r.user_id || '');
        const day = String(r.day || '');
        if (!id || !day) return;
        if (!monthDoneByUser[id]) monthDoneByUser[id] = { durood: new Set(), tasbeeh: new Set(), quran: new Set() };
        if (r.activity === 'durood') monthDoneByUser[id].durood.add(day);
        if (r.activity === 'tasbeeh') monthDoneByUser[id].tasbeeh.add(day);
      });

      const weekPagesByUser: Record<string, number> = {};
      const monthPagesByUser: Record<string, number> = {};

      weekQuranRows.forEach((r) => {
        const id = String(r.user_id || '');
        if (!id) return;
        weekPagesByUser[id] = (weekPagesByUser[id] || 0) + Math.max(0, Number(r.pages || 0));
      });
      monthQuranRows.forEach((r) => {
        const id = String(r.user_id || '');
        if (!id) return;
        monthPagesByUser[id] = (monthPagesByUser[id] || 0) + Math.max(0, Number(r.pages || 0));
      });

      Object.entries(weekPagesByUser).forEach(([id, pages]) => {
        if (!weekAgg[id]) weekAgg[id] = { durood: 0, tasbeeh: 0, quran_pages: 0, quran_juz: 0 };
        weekAgg[id].quran_pages = Math.max(weekAgg[id].quran_pages || 0, pages);
      });
      Object.entries(monthPagesByUser).forEach(([id, pages]) => {
        if (!monthAgg[id]) monthAgg[id] = { durood: 0, tasbeeh: 0, quran_pages: 0, quran_juz: 0 };
        monthAgg[id].quran_pages = Math.max(monthAgg[id].quran_pages || 0, pages);
      });

      const nextWeekMaxPages = Object.values(weekAgg).reduce((acc, v) => Math.max(acc, Number(v.quran_pages || 0)), 0);
      const nextMonthMaxPages = Object.values(monthAgg).reduce((acc, v) => Math.max(acc, Number(v.quran_pages || 0)), 0);
      weekMax.quran_pages = nextWeekMaxPages;
      monthMax.quran_pages = nextMonthMaxPages;

      const leaderboardQuranDailyGoal = DEFAULT_GOALS.quran.pagesDaily;
      weekQuranRows.forEach((r) => {
        const id = String(r.user_id || '');
        const day = String(r.day || '');
        const pages = Number(r.pages || 0);
        if (!id || !day) return;
        if (leaderboardQuranDailyGoal > 0 && pages >= leaderboardQuranDailyGoal) {
          if (!weekDoneByUser[id]) weekDoneByUser[id] = { durood: new Set(), tasbeeh: new Set(), quran: new Set() };
          weekDoneByUser[id].quran.add(day);
        }
      });

      monthQuranRows.forEach((r) => {
        const id = String(r.user_id || '');
        const day = String(r.day || '');
        const pages = Number(r.pages || 0);
        if (!id || !day) return;
        if (leaderboardQuranDailyGoal > 0 && pages >= leaderboardQuranDailyGoal) {
          if (!monthDoneByUser[id]) monthDoneByUser[id] = { durood: new Set(), tasbeeh: new Set(), quran: new Set() };
          monthDoneByUser[id].quran.add(day);
        }
      });

      const weekList = Object.entries(weekAgg)
        .map(([id, v]) => {
          const quranScore =
            weekMax.quran_pages > 0
              ? clamp01(v.quran_pages / weekMax.quran_pages)
              : clamp01(weekMax.quran_juz > 0 ? v.quran_juz / weekMax.quran_juz : 0);
          const pct =
            ((clamp01(weekMax.durood > 0 ? v.durood / weekMax.durood : 0) +
              clamp01(weekMax.tasbeeh > 0 ? v.tasbeeh / weekMax.tasbeeh : 0) +
              quranScore) /
              3) *
            100;
          const profileName = (nameById.get(id) ?? '').trim();
          const rawName = profileName || (id === user.id ? selfName : '');
          const done = weekDoneByUser[id] ?? { durood: new Set<string>(), tasbeeh: new Set<string>(), quran: new Set<string>() };
          return {
            id,
            name: getSafeLeaderboardName(rawName, id),
            durood: v.durood,
            tasbeeh: v.tasbeeh,
            quran_pages: v.quran_pages,
            quran_juz: v.quran_juz,
            pct: Math.round(pct),
            doneDuroodDays: done.durood.size,
            doneZikrDays: done.tasbeeh.size,
            doneQuranDays: done.quran.size,
          };
        })
        .sort((a, b) => {
          if (a.id === user.id && b.id !== user.id) return -1;
          if (b.id === user.id && a.id !== user.id) return 1;
          return b.pct - a.pct;
        });
      const weekTop = weekList.slice(0, 20);
      if (!weekTop.some((x) => x.id === user.id)) {
        const selfRow = weekList.find((x) => x.id === user.id);
        if (selfRow) {
          weekTop.pop();
          weekTop.push(selfRow);
        }
      }

      const monthList = Object.entries(monthAgg)
        .map(([id, v]) => {
          const quranScore =
            monthMax.quran_pages > 0
              ? clamp01(v.quran_pages / monthMax.quran_pages)
              : clamp01(monthMax.quran_juz > 0 ? v.quran_juz / monthMax.quran_juz : 0);
          const pct =
            ((clamp01(monthMax.durood > 0 ? v.durood / monthMax.durood : 0) +
              clamp01(monthMax.tasbeeh > 0 ? v.tasbeeh / monthMax.tasbeeh : 0) +
              quranScore) /
              3) *
            100;
          const profileName = (nameById.get(id) ?? '').trim();
          const rawName = profileName || (id === user.id ? selfName : '');
          const done = monthDoneByUser[id] ?? { durood: new Set<string>(), tasbeeh: new Set<string>(), quran: new Set<string>() };
          return {
            id,
            name: getSafeLeaderboardName(rawName, id),
            durood: v.durood,
            tasbeeh: v.tasbeeh,
            quran_pages: v.quran_pages,
            quran_juz: v.quran_juz,
            pct: Math.round(pct),
            doneDuroodDays: done.durood.size,
            doneZikrDays: done.tasbeeh.size,
            doneQuranDays: done.quran.size,
          };
        })
        .sort((a, b) => {
          if (a.id === user.id && b.id !== user.id) return -1;
          if (b.id === user.id && a.id !== user.id) return 1;
          return b.pct - a.pct;
        });
      const monthTop = monthList.slice(0, 20);
      if (!monthTop.some((x) => x.id === user.id)) {
        const selfRow = monthList.find((x) => x.id === user.id);
        if (selfRow) {
          monthTop.pop();
          monthTop.push(selfRow);
        }
      }

      setWeekLeaders(weekTop);
      setMonthLeaders(monthTop);
    };

    let cancelled = false;
    let queuedRun: number | null = null;

    const scheduleRun = () => {
      if (cancelled) return;
      if (queuedRun !== null) {
        window.clearTimeout(queuedRun);
      }
      queuedRun = window.setTimeout(() => {
        queuedRun = null;
        run();
      }, 250);
    };

    const run = () => {
      if (cancelled) return;
      void loadLeaderboard();
    };

    const channel = supabase
      .channel(`tracker-leaderboard-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_weekly_activity' }, scheduleRun)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_monthly_activity' }, scheduleRun)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_daily_activity' }, scheduleRun)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_daily_quran' }, scheduleRun)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'public_profiles' }, scheduleRun)
      .subscribe();

    run();
    const t = setInterval(run, 15000);
    return () => {
      cancelled = true;
      if (queuedRun !== null) {
        window.clearTimeout(queuedRun);
      }
      clearInterval(t);
      void supabase.removeChannel(channel);
    };
  }, [dayKey, leaderboardVersion, monthKey, user, weekKey]);

  if (!getSupabaseClient()) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900">Tracker</h1>
          <p className="mt-2 text-slate-600">Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and a public key: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.</p>
        </div>
      </div>
    );
  }

  const localDuroodDay = typeof window !== 'undefined' ? readLocalNumber(`durood_day_total_${dayKey}`) : 0;
  const localTasbeehDay = typeof window !== 'undefined' ? readLocalNumber(`tasbeeh_day_total_${dayKey}`) : 0;
  const localQuranPagesDay = typeof window !== 'undefined' ? readLocalNumber(`quran_pages_${dayKey}`) : 0;
  const localDuroodWeek = typeof window !== 'undefined' ? readLocalNumber(`durood_week_total_${weekKey}`) : 0;
  const localTasbeehWeek = typeof window !== 'undefined' ? readLocalNumber(`tasbeeh_week_total_${weekKey}`) : 0;
  const localDuroodMonth = typeof window !== 'undefined' ? readLocalNumber(`durood_month_total_${monthKey}`) : 0;
  const localTasbeehMonth = typeof window !== 'undefined' ? readLocalNumber(`tasbeeh_month_total_${monthKey}`) : 0;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Sign-in banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-emerald-900">Sign in to sync your progress &amp; join the leaderboard</p>
              <p className="text-sm text-emerald-700 mt-0.5">Your local data is shown below. Sign in to save it to the cloud.</p>
            </div>
            <div className="flex gap-2 flex-none">
              <Link href="/auth?mode=signup&redirect=/tracker" className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm">
                Sign up
              </Link>
              <Link href="/auth?redirect=/tracker" className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-sm">
                Sign in
              </Link>
            </div>
          </div>

          {/* Local stats header */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h1 className="text-2xl font-bold text-slate-900">Tracker (Local)</h1>
            <p className="mt-1 text-slate-500 text-sm">Tracking from device storage — sign in to sync across devices.</p>
          </div>

          {/* Local stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-600" />
                <span className="font-bold text-slate-900">Durood</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Today</span><span className="font-semibold">{formatNumber(localDuroodDay)}</span></div>
                <ProgressBar value={localDuroodDay / Math.max(1, goals.durood.daily)} color="bg-rose-500" />
                <div className="flex justify-between"><span className="text-slate-500">This week</span><span className="font-semibold">{formatNumber(localDuroodWeek)}</span></div>
                <ProgressBar value={localDuroodWeek / Math.max(1, goals.durood.weekly)} color="bg-rose-600" />
                <div className="flex justify-between"><span className="text-slate-500">This month</span><span className="font-semibold">{formatNumber(localDuroodMonth)}</span></div>
                <ProgressBar value={localDuroodMonth / Math.max(1, goals.durood.monthly)} color="bg-rose-700" />
              </div>
              <Link href="/durood" className="block text-center text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700">Go to Durood</Link>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-slate-900">Zikr</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Today</span><span className="font-semibold">{formatNumber(localTasbeehDay)}</span></div>
                <ProgressBar value={localTasbeehDay / Math.max(1, goals.tasbeeh.daily)} color="bg-emerald-500" />
                <div className="flex justify-between"><span className="text-slate-500">This week</span><span className="font-semibold">{formatNumber(localTasbeehWeek)}</span></div>
                <ProgressBar value={localTasbeehWeek / Math.max(1, goals.tasbeeh.weekly)} color="bg-emerald-600" />
                <div className="flex justify-between"><span className="text-slate-500">This month</span><span className="font-semibold">{formatNumber(localTasbeehMonth)}</span></div>
                <ProgressBar value={localTasbeehMonth / Math.max(1, goals.tasbeeh.monthly)} color="bg-emerald-700" />
              </div>
              <Link href="/tasbeeh" className="block text-center text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700">Go to Tasbeeh</Link>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-slate-900">Qur'an Pages</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Today</span><span className="font-semibold">{formatNumber(localQuranPagesDay)}</span></div>
                <ProgressBar value={localQuranPagesDay / Math.max(1, goals.quran.pagesDaily)} color="bg-blue-500" />
              </div>
              <Link href="/quran" className="block text-center text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700">Go to Qur'an</Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500 text-center">Leaderboard and full history require signing in.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Weekly & Monthly Tracker</h1>
            <p className="mt-1 text-slate-600">Durood + Zikr + Quran reading progress</p>
            {saveError && (
              <p className="mt-2 text-sm font-semibold text-red-700">{saveError}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-semibold text-slate-500">Date</span>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value || new Date().toISOString().slice(0, 10))}
                className="px-3 py-2 rounded-lg bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm w-full sm:w-auto"
              />
            </div>
            <button
              onClick={handleSignOut}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-2 w-full sm:w-auto justify-center"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
            {loading && (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">Targets</h2>
            <button
              onClick={() => setGoals(goalsDraft)}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-semibold"
            >
              Save targets
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Durood</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Daily</span>
                <input
                  type="number"
                  min={0}
                  value={goalsDraft.durood.daily}
                  onChange={(e) => setGoalsDraft((prev) => ({ ...prev, durood: { ...prev.durood, daily: sanitizeGoalValue(e.target.value) } }))}
                  className="w-24 px-2 py-1 rounded bg-slate-100 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-200 border border-transparent outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Weekly</span>
                <input
                  type="number"
                  min={0}
                  value={goalsDraft.durood.weekly}
                  onChange={(e) => setGoalsDraft((prev) => ({ ...prev, durood: { ...prev.durood, weekly: sanitizeGoalValue(e.target.value) } }))}
                  className="w-24 px-2 py-1 rounded bg-slate-100 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-200 border border-transparent outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Monthly</span>
                <input
                  type="number"
                  min={0}
                  value={goalsDraft.durood.monthly}
                  onChange={(e) => setGoalsDraft((prev) => ({ ...prev, durood: { ...prev.durood, monthly: sanitizeGoalValue(e.target.value) } }))}
                  className="w-24 px-2 py-1 rounded bg-slate-100 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-200 border border-transparent outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Zikr (Tasbeeh)</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Daily</span>
                <input
                  type="number"
                  min={0}
                  value={goalsDraft.tasbeeh.daily}
                  onChange={(e) => setGoalsDraft((prev) => ({ ...prev, tasbeeh: { ...prev.tasbeeh, daily: sanitizeGoalValue(e.target.value) } }))}
                  className="w-24 px-2 py-1 rounded bg-slate-100 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 border border-transparent outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Weekly</span>
                <input
                  type="number"
                  min={0}
                  value={goalsDraft.tasbeeh.weekly}
                  onChange={(e) => setGoalsDraft((prev) => ({ ...prev, tasbeeh: { ...prev.tasbeeh, weekly: sanitizeGoalValue(e.target.value) } }))}
                  className="w-24 px-2 py-1 rounded bg-slate-100 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 border border-transparent outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Monthly</span>
                <input
                  type="number"
                  min={0}
                  value={goalsDraft.tasbeeh.monthly}
                  onChange={(e) => setGoalsDraft((prev) => ({ ...prev, tasbeeh: { ...prev.tasbeeh, monthly: sanitizeGoalValue(e.target.value) } }))}
                  className="w-24 px-2 py-1 rounded bg-slate-100 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 border border-transparent outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Qur’an Pages</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Daily</span>
                <input
                  type="number"
                  min={0}
                  value={goalsDraft.quran.pagesDaily}
                  onChange={(e) => setGoalsDraft((prev) => ({ ...prev, quran: { ...prev.quran, pagesDaily: sanitizeGoalValue(e.target.value) } }))}
                  className="w-24 px-2 py-1 rounded bg-slate-100 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 border border-transparent outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Weekly</span>
                <input
                  type="number"
                  min={0}
                  value={goalsDraft.quran.pagesWeekly}
                  onChange={(e) => setGoalsDraft((prev) => ({ ...prev, quran: { ...prev.quran, pagesWeekly: sanitizeGoalValue(e.target.value) } }))}
                  className="w-24 px-2 py-1 rounded bg-slate-100 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 border border-transparent outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Monthly</span>
                <input
                  type="number"
                  min={0}
                  value={goalsDraft.quran.pagesMonthly}
                  onChange={(e) => setGoalsDraft((prev) => ({ ...prev, quran: { ...prev.quran, pagesMonthly: sanitizeGoalValue(e.target.value) } }))}
                  className="w-24 px-2 py-1 rounded bg-slate-100 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 border border-transparent outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Qur’an Juz</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Weekly</span>
                <input
                  type="number"
                  min={0}
                  value={goalsDraft.quran.juzWeekly}
                  onChange={(e) => setGoalsDraft((prev) => ({ ...prev, quran: { ...prev.quran, juzWeekly: sanitizeGoalValue(e.target.value) } }))}
                  className="w-24 px-2 py-1 rounded bg-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 border border-transparent outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Monthly</span>
                <input
                  type="number"
                  min={0}
                  value={goalsDraft.quran.juzMonthly}
                  onChange={(e) => setGoalsDraft((prev) => ({ ...prev, quran: { ...prev.quran, juzMonthly: sanitizeGoalValue(e.target.value) } }))}
                  className="w-24 px-2 py-1 rounded bg-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 border border-transparent outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-600" />
              <h2 className="text-lg font-bold text-slate-900">Durood</h2>
            </div>

            <div className="rounded-xl bg-rose-50/50 border border-rose-100 p-4">
              <p className="text-xs font-bold text-rose-800">Reminder</p>
              <p className="mt-1 text-sm text-slate-700">“Indeed Allah and His angels send blessings upon the Prophet…” (Qur’an 33:56)</p>
              <p className="mt-1 text-sm text-slate-700">The Prophet ﷺ said: “Whoever sends blessings upon me once, Allah sends blessings upon him tenfold.” (Muslim)</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Today ({dayKey})</span>
                <span className="font-semibold text-slate-900">{formatNumber(dailyLocal.durood)} / {formatNumber(goals.durood.daily)}</span>
              </div>
              <ProgressBar value={dailyLocal.durood / Math.max(1, goals.durood.daily)} color="bg-rose-600" />
              <p className={`text-sm ${dailyDuroodEncouragement.status === 'slow' ? 'text-amber-700' : 'text-slate-600'}`}>{dailyDuroodEncouragement.text}</p>
              <div className="flex items-center justify-between text-sm pt-2">
                <span className="text-slate-600">Weekly ({weekKey})</span>
                <span className="font-semibold text-slate-900">{formatNumber(weekly.durood)} / {formatNumber(goals.durood.weekly)}</span>
              </div>
              <ProgressBar value={weekly.durood / Math.max(1, goals.durood.weekly)} color="bg-rose-700" />
              <p className={`text-sm ${weeklyDuroodEncouragement.status === 'slow' ? 'text-amber-700' : 'text-slate-600'}`}>{weeklyDuroodEncouragement.text}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Monthly ({monthKey})</span>
                <span className="font-semibold text-slate-900">{formatNumber(monthly.durood)} / {formatNumber(goals.durood.monthly)}</span>
              </div>
              <ProgressBar value={monthly.durood / Math.max(1, goals.durood.monthly)} color="bg-rose-800" />
              <p className={`text-sm ${monthlyDuroodEncouragement.status === 'slow' ? 'text-amber-700' : 'text-slate-600'}`}>{monthlyDuroodEncouragement.text}</p>
            </div>

            <div className="pt-2 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={addDurood}
                  onChange={(e) => setAddDurood(e.target.value)}
                  inputMode="numeric"
                  placeholder="Add count"
                  className="w-full sm:flex-1 px-3 py-2 rounded-lg bg-slate-100 border-transparent focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                />
                <button
                  onClick={() => addActivity('durood', addDurood)}
                  disabled={loading || savingActivity === 'durood'}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-semibold flex items-center justify-center gap-2"
                >
                  {savingActivity === 'durood' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Add
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-600">
                <Link href="/durood" className="w-full sm:w-auto text-center px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold">
                  Go to Durood page
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">Zikr (Tasbeeh)</h2>
            </div>

            <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-4">
              <p className="text-xs font-bold text-emerald-800">Reminder</p>
              <p className="mt-1 text-sm text-slate-700">“Surely in the remembrance of Allah do hearts find rest.” (Qur’an 13:28)</p>
              <p className="mt-1 text-sm text-slate-700">The Prophet ﷺ said: “Two words are light on the tongue, heavy on the scale… SubhanAllahi wa bihamdihi, SubhanAllahi al-‘Azim.” (Bukhari & Muslim)</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Today ({dayKey})</span>
                <span className="font-semibold text-slate-900">{formatNumber(dailyLocal.tasbeeh)} / {formatNumber(goals.tasbeeh.daily)}</span>
              </div>
              <ProgressBar value={dailyLocal.tasbeeh / Math.max(1, goals.tasbeeh.daily)} color="bg-emerald-600" />
              <p className={`text-sm ${dailyZikrEncouragement.status === 'slow' ? 'text-amber-700' : 'text-slate-600'}`}>{dailyZikrEncouragement.text}</p>
              <div className="flex items-center justify-between text-sm pt-2">
                <span className="text-slate-600">Weekly ({weekKey})</span>
                <span className="font-semibold text-slate-900">{formatNumber(weekly.tasbeeh)} / {formatNumber(goals.tasbeeh.weekly)}</span>
              </div>
              <ProgressBar value={weekly.tasbeeh / Math.max(1, goals.tasbeeh.weekly)} color="bg-emerald-700" />
              <p className={`text-sm ${weeklyZikrEncouragement.status === 'slow' ? 'text-amber-700' : 'text-slate-600'}`}>{weeklyZikrEncouragement.text}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Monthly ({monthKey})</span>
                <span className="font-semibold text-slate-900">{formatNumber(monthly.tasbeeh)} / {formatNumber(goals.tasbeeh.monthly)}</span>
              </div>
              <ProgressBar value={monthly.tasbeeh / Math.max(1, goals.tasbeeh.monthly)} color="bg-emerald-800" />
              <p className={`text-sm ${monthlyZikrEncouragement.status === 'slow' ? 'text-amber-700' : 'text-slate-600'}`}>{monthlyZikrEncouragement.text}</p>
            </div>

            <div className="pt-2 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={addZikr}
                  onChange={(e) => setAddZikr(e.target.value)}
                  inputMode="numeric"
                  placeholder="Add count"
                  className="w-full sm:flex-1 px-3 py-2 rounded-lg bg-slate-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                />
                <button
                  onClick={() => addActivity('tasbeeh', addZikr)}
                  disabled={loading || savingActivity === 'tasbeeh'}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold flex items-center justify-center gap-2"
                >
                  {savingActivity === 'tasbeeh' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Add
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-600">
                <Link href="/tasbeeh" className="w-full sm:w-auto text-center px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold">
                  Go to Tasbeeh page
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Qur’an Reading</h2>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Pages ({dayKey})</span>
                <span className="font-semibold text-slate-900">{formatNumber(quranPagesToday)} / {formatNumber(goals.quran.pagesDaily)}</span>
              </div>
              <ProgressBar value={quranPagesToday / Math.max(1, goals.quran.pagesDaily)} color="bg-blue-600" />
              <p className={`text-sm ${dailyQuranPagesEncouragement.status === 'slow' ? 'text-amber-700' : 'text-slate-600'}`}>{dailyQuranPagesEncouragement.text}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="number"
                  value={quranPagesToday}
                  min={0}
                  onChange={(e) => setQuranPagesToday(Number(e.target.value || 0))}
                  className="w-full sm:w-28 px-3 py-2 rounded-lg bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
                <button
                  onClick={() => saveQuranPages(quranPagesToday)}
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Weekly Pages ({weekKey})</span>
                  <span className="font-semibold text-slate-900">{formatNumber(quranPagesWeekTotal)} / {formatNumber(goals.quran.pagesWeekly)}</span>
                </div>
                <ProgressBar value={quranPagesWeekTotal / Math.max(1, goals.quran.pagesWeekly)} color="bg-blue-700" />
                <p className={`text-sm ${weeklyQuranPagesEncouragement.status === 'slow' ? 'text-amber-700' : 'text-slate-600'}`}>{weeklyQuranPagesEncouragement.text}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Monthly Pages ({monthKey})</span>
                  <span className="font-semibold text-slate-900">{formatNumber(quranPagesMonthTotal)} / {formatNumber(goals.quran.pagesMonthly)}</span>
                </div>
                <ProgressBar value={quranPagesMonthTotal / Math.max(1, goals.quran.pagesMonthly)} color="bg-blue-800" />
                <p className={`text-sm ${monthlyQuranPagesEncouragement.status === 'slow' ? 'text-amber-700' : 'text-slate-600'}`}>{monthlyQuranPagesEncouragement.text}</p>
              </div>
            </div>

            <div className="pt-2 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Weekly Juz ({weekKey})</span>
                  <span className="font-semibold text-slate-900">{formatNumber(weekly.quran_juz)} / {formatNumber(goals.quran.juzWeekly)}</span>
                </div>
                <ProgressBar value={weekly.quran_juz / Math.max(1, goals.quran.juzWeekly)} color="bg-indigo-600" />
                <p className={`text-sm ${weeklyQuranJuzEncouragement.status === 'slow' ? 'text-amber-700' : 'text-slate-600'}`}>
                  {weeklyQuranJuzEncouragement.text}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Monthly Juz ({monthKey})</span>
                  <span className="font-semibold text-slate-900">{formatNumber(monthly.quran_juz)} / {formatNumber(goals.quran.juzMonthly)}</span>
                </div>
                <ProgressBar value={monthly.quran_juz / Math.max(1, goals.quran.juzMonthly)} color="bg-indigo-700" />
                <p className={`text-sm ${monthlyQuranJuzEncouragement.status === 'slow' ? 'text-amber-700' : 'text-slate-600'}`}>
                  {monthlyQuranJuzEncouragement.text}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={addJuz}
                  onChange={(e) => setAddJuz(e.target.value)}
                  inputMode="numeric"
                  placeholder="Add Juz"
                  className="w-full sm:flex-1 px-3 py-2 rounded-lg bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
                <button
                  onClick={() => addActivity('quran_juz', addJuz)}
                  disabled={loading || savingActivity === 'quran_juz'}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold flex items-center justify-center gap-2"
                >
                  {savingActivity === 'quran_juz' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Add
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Monthly Juz completion ({monthKey})</span>
                  <span className="font-semibold text-slate-900">{formatNumber(monthJuzUnique)} / {formatNumber(monthJuzGoal)}</span>
                </div>
                <ProgressBar value={monthJuzUnique / monthJuzGoal} color="bg-indigo-600" />
                <p className="text-sm text-slate-600">Mark each Juz once to complete 30 in the month.</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={dailyJuzInput}
                    onChange={(e) => setDailyJuzInput(e.target.value)}
                    inputMode="numeric"
                    placeholder="Add daily Juz (1-30)"
                    className="w-full sm:flex-1 px-3 py-2 rounded-lg bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  />
                  <button
                    onClick={addDailyJuzEntry}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Add
                  </button>
                </div>
                {dailyJuz.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {dailyJuz.map((j) => (
                      <button
                        key={j}
                        onClick={() => removeDailyJuzEntry(j)}
                        className="px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm font-semibold hover:bg-indigo-100"
                        title="Remove"
                      >
                        Juz {j} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Monthly Surah completion ({monthKey})</span>
                  <span className="font-semibold text-slate-900">{formatNumber(monthSurahUnique)} / {formatNumber(monthSurahGoal)}</span>
                </div>
                <ProgressBar value={monthSurahUnique / monthSurahGoal} color="bg-emerald-600" />
                <p className="text-sm text-slate-600">Mark the Surahs you recited to work toward 114 in the month.</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={surahToAdd}
                    onChange={(e) => setSurahToAdd(e.target.value)}
                    className="w-full sm:flex-1 px-3 py-2 rounded-lg bg-slate-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  >
                    {surahs.map((s) => (
                      <option key={s.id} value={s.name_simple}>
                        {s.id}. {s.name_simple}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => addDailySurahEntry(surahToAdd)}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Add
                  </button>
                </div>
                {dailySurahs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {dailySurahs.map((s) => (
                      <button
                        key={s}
                        onClick={() => removeDailySurahEntry(s)}
                        className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold hover:bg-emerald-100"
                        title="Remove"
                      >
                        {s} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900">Completed (by day)</h2>
              </div>
              <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCompletionScope('week')}
                  className={`px-3 py-2 text-sm font-semibold ${completionScope === 'week' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  This week
                </button>
                <button
                  type="button"
                  onClick={() => setCompletionScope('month')}
                  className={`px-3 py-2 text-sm font-semibold ${completionScope === 'month' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  This month
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900">Durood</div>
                  <div className="text-xs text-slate-600">
                    {(completionScope === 'week' ? weekDoneDays.durood.length : monthDoneDays.durood.length)} day{(completionScope === 'week' ? weekDoneDays.durood.length : monthDoneDays.durood.length) === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(completionScope === 'week' ? weekDoneDays.durood : monthDoneDays.durood).length === 0 ? (
                    <span className="text-sm text-slate-500">Not completed yet.</span>
                  ) : (
                    (completionScope === 'week' ? weekDoneDays.durood : monthDoneDays.durood).map((d) => (
                      <span key={`durood-${d}`} className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-semibold">
                        {String(d).slice(5)}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900">Zikr</div>
                  <div className="text-xs text-slate-600">
                    {(completionScope === 'week' ? weekDoneDays.tasbeeh.length : monthDoneDays.tasbeeh.length)} day{(completionScope === 'week' ? weekDoneDays.tasbeeh.length : monthDoneDays.tasbeeh.length) === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(completionScope === 'week' ? weekDoneDays.tasbeeh : monthDoneDays.tasbeeh).length === 0 ? (
                    <span className="text-sm text-slate-500">Not completed yet.</span>
                  ) : (
                    (completionScope === 'week' ? weekDoneDays.tasbeeh : monthDoneDays.tasbeeh).map((d) => (
                      <span key={`tasbeeh-${d}`} className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-semibold">
                        {String(d).slice(5)}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900">Qur’an (Pages)</div>
                  <div className="text-xs text-slate-600">
                    {(completionScope === 'week' ? weekDoneDays.quranPages.length : monthDoneDays.quranPages.length)} day{(completionScope === 'week' ? weekDoneDays.quranPages.length : monthDoneDays.quranPages.length) === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Math.max(0, Math.floor(goals.quran.pagesDaily)) <= 0 ? (
                    <span className="text-sm text-slate-500">Set a daily pages goal to track completion.</span>
                  ) : (completionScope === 'week' ? weekDoneDays.quranPages : monthDoneDays.quranPages).length === 0 ? (
                    <span className="text-sm text-slate-500">Not completed yet.</span>
                  ) : (
                    (completionScope === 'week' ? weekDoneDays.quranPages : monthDoneDays.quranPages).map((d) => (
                      <span key={`quran-${d}`} className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-semibold">
                        {String(d).slice(5)}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Durood/Zikr completion is synced when you log daily totals. Qur’an completion is based on your saved daily pages.
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-slate-900">Leaderboard</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 text-sm font-bold text-slate-900">This Week</div>
                <div className="divide-y divide-slate-100">
                  {weekLeaders.length === 0 ? (
                    <div className="p-4 text-sm text-slate-600">No activity yet.</div>
                  ) : (
                    weekLeaders.map((e, idx) => (
                      <div key={`${e.name}-${idx}`} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 truncate">{idx + 1}. {e.name}</p>
                          <p className="text-xs text-slate-500">
                            Durood {formatNumber(e.durood)} • Zikr {formatNumber(e.tasbeeh)} • Pages {formatNumber(e.quran_pages)}
                            {e.quran_juz > 0 ? <> • Juz {formatNumber(e.quran_juz)}</> : null} • Done {e.doneDuroodDays}d/{e.doneZikrDays}d/{e.doneQuranDays}d
                          </p>
                          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: `${Math.max(0, Math.min(100, e.pct))}%` }} />
                          </div>
                        </div>
                        <div className="text-sm font-bold text-slate-900 self-end sm:self-auto">{e.pct}%</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 text-sm font-bold text-slate-900">This Month</div>
                <div className="divide-y divide-slate-100">
                  {monthLeaders.length === 0 ? (
                    <div className="p-4 text-sm text-slate-600">No activity yet.</div>
                  ) : (
                    monthLeaders.map((e, idx) => (
                      <div key={`${e.name}-${idx}`} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 truncate">{idx + 1}. {e.name}</p>
                          <p className="text-xs text-slate-500">
                            Durood {formatNumber(e.durood)} • Zikr {formatNumber(e.tasbeeh)} • Pages {formatNumber(e.quran_pages)}
                            {e.quran_juz > 0 ? <> • Juz {formatNumber(e.quran_juz)}</> : null} • Done {e.doneDuroodDays}d/{e.doneZikrDays}d/{e.doneQuranDays}d
                          </p>
                          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: `${Math.max(0, Math.min(100, e.pct))}%` }} />
                          </div>
                        </div>
                        <div className="text-sm font-bold text-slate-900 self-end sm:self-auto">{e.pct}%</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500">Leaderboard ranks by activity relative to the top performer for the selected week/month.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
