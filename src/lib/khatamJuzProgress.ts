import type { SupabaseClient } from '@supabase/supabase-js';

export type KhatamTargets = {
  dailyJuz: number;
  monthlyJuz: number;
};

export const DEFAULT_KHATAM_TARGETS: KhatamTargets = {
  dailyJuz: 1,
  monthlyJuz: 30,
};

const TARGETS_KEY = 'khatam_targets_v1';

function pad2(v: number) {
  return String(v).padStart(2, '0');
}

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function monthKeyFromDate(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function getIsoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad2(weekNo)}`;
}

export function daysInMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function daysLeftInMonth(date = new Date()) {
  return daysInMonth(date) - date.getDate() + 1;
}

export function getNextMonthStartKey(month: string) {
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  return `${next.y}-${pad2(next.m)}-01`;
}

function ymdFromDateUtc(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function getIsoWeekStartDateUtc(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

function addUtcDays(d: Date, days: number) {
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateFromYmd(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function loadKhatamTargets(): KhatamTargets {
  if (typeof window === 'undefined') return { ...DEFAULT_KHATAM_TARGETS };
  try {
    const raw = localStorage.getItem(TARGETS_KEY);
    if (!raw) return { ...DEFAULT_KHATAM_TARGETS };
    const parsed = JSON.parse(raw) as Partial<KhatamTargets>;
    return {
      dailyJuz: clampTarget(parsed.dailyJuz ?? DEFAULT_KHATAM_TARGETS.dailyJuz, 1, 30),
      monthlyJuz: clampTarget(parsed.monthlyJuz ?? DEFAULT_KHATAM_TARGETS.monthlyJuz, 1, 60),
    };
  } catch {
    return { ...DEFAULT_KHATAM_TARGETS };
  }
}

export function saveKhatamTargets(targets: KhatamTargets) {
  try {
    localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
  } catch {
    /* ignore */
  }
}

function clampTarget(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export function readLocalJuzList(day: string): number[] {
  try {
    const raw = localStorage.getItem(`khatam_daily_juz_${day}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as number[];
    return Array.isArray(parsed)
      ? parsed.filter((j) => j >= 1 && j <= 30).sort((a, b) => a - b)
      : [];
  } catch {
    return [];
  }
}

export function writeLocalJuzList(day: string, juzList: number[]) {
  try {
    localStorage.setItem(`khatam_daily_juz_${day}`, JSON.stringify(juzList));
  } catch {
    /* ignore */
  }
}

export function writeLocalNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(Math.max(0, Math.floor(value))));
  } catch {
    /* ignore */
  }
}

export function readLocalNumber(key: string) {
  try {
    const n = Number(localStorage.getItem(key) || 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  } catch {
    return 0;
  }
}

/** Recommended juz/day to finish `monthlyTarget` with days remaining (including today). */
export function recommendedDailyPace(monthlyDone: number, monthlyTarget: number, daysLeft: number) {
  const remaining = Math.max(0, monthlyTarget - monthlyDone);
  if (daysLeft <= 0) return remaining;
  return Math.ceil(remaining / daysLeft);
}

export type JuzPeriodCounts = {
  daily: number[];
  weekCount: number;
  monthCount: number;
};

/** Recount week/month from user_daily_juz and upsert activity rows. */
export async function syncJuzActivityCounts(
  supabase: SupabaseClient,
  userId: string,
  day: string,
  month: string,
  week: string
): Promise<JuzPeriodCounts> {
  const weekStartUtc = getIsoWeekStartDateUtc(dateFromYmd(day));
  const weekStartKey = ymdFromDateUtc(weekStartUtc);
  const weekEndKey = ymdFromDateUtc(addUtcDays(weekStartUtc, 7));
  const monthStartKey = `${month}-01`;
  const nextMonthStartKey = getNextMonthStartKey(month);

  const [dailyRes, weekRes, monthRes] = await Promise.all([
    supabase
      .from('user_daily_juz')
      .select('juz')
      .eq('user_id', userId)
      .eq('day', day)
      .eq('completed', true)
      .limit(30),
    supabase
      .from('user_daily_juz')
      .select('juz')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('day', weekStartKey)
      .lt('day', weekEndKey)
      .limit(5000),
    supabase
      .from('user_daily_juz')
      .select('juz')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('day', monthStartKey)
      .lt('day', nextMonthStartKey)
      .limit(5000),
  ]);

  const daily = (dailyRes.data ?? [])
    .map((r) => Number((r as { juz: number }).juz))
    .filter((j) => j >= 1 && j <= 30)
    .sort((a, b) => a - b);
  const weekCount = (weekRes.data ?? []).length;
  const monthCount = (monthRes.data ?? []).length;

  writeLocalJuzList(day, daily);
  writeLocalNumber(`quran_juz_week_total_${week}`, weekCount);
  writeLocalNumber(`quran_juz_month_total_${month}`, monthCount);

  await Promise.all([
    supabase.from('user_weekly_activity').upsert(
      { user_id: userId, week, activity: 'quran_juz', count: weekCount },
      { onConflict: 'user_id,week,activity' }
    ),
    supabase.from('user_monthly_activity').upsert(
      { user_id: userId, month, activity: 'quran_juz', count: monthCount },
      { onConflict: 'user_id,month,activity' }
    ),
  ]);

  return { daily, weekCount, monthCount };
}

export async function addDailyJuzRecitation(
  supabase: SupabaseClient,
  userId: string,
  juz: number,
  day: string,
  month: string,
  week: string
): Promise<JuzPeriodCounts | null> {
  if (!Number.isFinite(juz) || juz < 1 || juz > 30) return null;

  const { error } = await supabase.from('user_daily_juz').upsert(
    { user_id: userId, day, juz, completed: true },
    { onConflict: 'user_id,day,juz' }
  );
  if (error) throw error;

  return syncJuzActivityCounts(supabase, userId, day, month, week);
}

export async function removeDailyJuzRecitation(
  supabase: SupabaseClient,
  userId: string,
  juz: number,
  day: string,
  month: string,
  week: string
): Promise<JuzPeriodCounts | null> {
  if (!Number.isFinite(juz) || juz < 1 || juz > 30) return null;

  const { error } = await supabase
    .from('user_daily_juz')
    .delete()
    .eq('user_id', userId)
    .eq('day', day)
    .eq('juz', juz);
  if (error) throw error;

  return syncJuzActivityCounts(supabase, userId, day, month, week);
}

export type JuzLeaderboardRow = {
  userId: string;
  name: string;
  count: number;
  isYou: boolean;
};

export async function loadJuzLeaderboard(
  supabase: SupabaseClient,
  period: 'week' | 'month',
  periodKey: string,
  currentUserId: string | null
): Promise<JuzLeaderboardRow[]> {
  const table = period === 'week' ? 'user_weekly_activity' : 'user_monthly_activity';
  const keyCol = period === 'week' ? 'week' : 'month';

  const { data: rows, error } = await supabase
    .from(table)
    .select('user_id, count')
    .eq(keyCol, periodKey)
    .eq('activity', 'quran_juz')
    .gt('count', 0)
    .order('count', { ascending: false })
    .limit(50);

  if (error || !rows?.length) return [];

  const ids = [...new Set(rows.map((r) => String((r as { user_id: string }).user_id)))];
  const { data: profiles } = await supabase
    .from('public_profiles')
    .select('user_id, display_name')
    .in('user_id', ids);

  const nameById: Record<string, string> = {};
  for (const p of profiles ?? []) {
    const id = String((p as { user_id: string }).user_id);
    const name = String((p as { display_name?: string }).display_name || '').trim();
    if (name) nameById[id] = name;
  }

  return rows.map((r) => {
    const userId = String((r as { user_id: string }).user_id);
    const count = Number((r as { count: number }).count || 0);
    return {
      userId,
      name: nameById[userId] || `User ${userId.slice(0, 6)}`,
      count,
      isYou: currentUserId === userId,
    };
  });
}

export const MONTH_SHORT_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export type YearMonthJuzRow = {
  monthIndex: number; // 0–11
  monthKey: string; // YYYY-MM
  label: string;
  count: number;
  isCurrent: boolean;
  isFuture: boolean;
};

export type YearlyJuzStats = {
  year: number;
  months: YearMonthJuzRow[];
  yearTotal: number;
  monthsWithActivity: number;
  fullKhatams: number;
};

function emptyYearMonths(year: number, now = new Date()): YearMonthJuzRow[] {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  return MONTH_SHORT_LABELS.map((label, monthIndex) => {
    const monthKey = `${year}-${pad2(monthIndex + 1)}`;
    const isFuture =
      year > currentYear || (year === currentYear && monthIndex > currentMonth);
    return {
      monthIndex,
      monthKey,
      label,
      count: 0,
      isCurrent: year === currentYear && monthIndex === currentMonth,
      isFuture,
    };
  });
}

/** Load Jan–Dec juz counts for a year (Supabase + localStorage merge). */
export async function loadYearlyMonthlyJuzStats(
  supabase: SupabaseClient | null,
  userId: string | null,
  year: number,
  now = new Date()
): Promise<YearlyJuzStats> {
  const months = emptyYearMonths(year, now);

  // Local totals (guest or offline merge)
  for (const row of months) {
    row.count = Math.max(row.count, readLocalNumber(`quran_juz_month_total_${row.monthKey}`));
  }

  if (supabase && userId) {
    const start = `${year}-01`;
    const end = `${year}-12`;
    const { data } = await supabase
      .from('user_monthly_activity')
      .select('month, count')
      .eq('user_id', userId)
      .eq('activity', 'quran_juz')
      .gte('month', start)
      .lte('month', end);

    for (const r of data ?? []) {
      const key = String((r as { month: string }).month);
      const count = Number((r as { count: number }).count || 0);
      const row = months.find((m) => m.monthKey === key);
      if (row) {
        row.count = Math.max(row.count, count);
        writeLocalNumber(`quran_juz_month_total_${key}`, row.count);
      }
    }
  }

  const yearTotal = months.reduce((sum, m) => sum + m.count, 0);
  const monthsWithActivity = months.filter((m) => m.count > 0).length;
  const fullKhatams = Math.floor(yearTotal / 30);

  return { year, months, yearTotal, monthsWithActivity, fullKhatams };
}

