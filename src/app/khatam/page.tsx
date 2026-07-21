'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Calendar,
  CheckCircle,
  Flame,
  Loader2,
  RefreshCw,
  Target,
  Trophy,
  User,
} from 'lucide-react';
import { JUZ_DATA } from '@/data/juzData';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { getDisplayNameFromUser } from '@/lib/userDisplayName';
import { AnalyticsEvents } from '@/lib/analytics';
import {
  addDailyJuzRecitation,
  daysInMonth,
  daysLeftInMonth,
  DEFAULT_KHATAM_TARGETS,
  getIsoWeekKey,
  loadJuzLeaderboard,
  loadKhatamTargets,
  loadYearlyMonthlyJuzStats,
  monthKeyFromDate,
  readLocalJuzList,
  readLocalNumber,
  recommendedDailyPace,
  removeDailyJuzRecitation,
  saveKhatamTargets,
  syncJuzActivityCounts,
  todayKey,
  writeLocalJuzList,
  writeLocalNumber,
  type JuzLeaderboardRow,
  type KhatamTargets,
  type YearlyJuzStats,
} from '@/lib/khatamJuzProgress';
import type { User as SupabaseUser } from '@supabase/supabase-js';

type JuzStatus = { reserved: boolean; reciterName: string };
type KhatamState = Record<number, JuzStatus>;
type BoardTab = 'progress' | 'community' | 'leaderboard';

function ProgressRing({
  value,
  max,
  label,
  sublabel,
  color = 'emerald',
}: {
  value: number;
  max: number;
  label: string;
  sublabel: string;
  color?: 'emerald' | 'amber' | 'sky';
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const stroke =
    color === 'amber' ? 'stroke-amber-500' : color === 'sky' ? 'stroke-sky-500' : 'stroke-emerald-500';
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 88 88" aria-hidden>
          <circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" className="stroke-slate-100" />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={stroke}
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-slate-900">{value}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            / {max}
          </span>
        </div>
      </div>
      <p className="text-sm font-bold text-slate-800">{label}</p>
      <p className="text-center text-xs text-slate-500">{sublabel}</p>
    </div>
  );
}

export default function KhatamPage() {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const day = useMemo(() => todayKey(now), [now]);
  const month = useMemo(() => monthKeyFromDate(now), [now]);
  const week = useMemo(() => getIsoWeekKey(now), [now]);
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysLeft = daysLeftInMonth(now);
  const totalDays = daysInMonth(now);

  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<BoardTab>('progress');
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [targets, setTargets] = useState<KhatamTargets>(DEFAULT_KHATAM_TARGETS);
  const [targetsDraft, setTargetsDraft] = useState<KhatamTargets>(DEFAULT_KHATAM_TARGETS);
  const [editingTargets, setEditingTargets] = useState(false);

  const [dailyJuz, setDailyJuz] = useState<number[]>([]);
  const [weekCount, setWeekCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [viewYear, setViewYear] = useState(() => now.getFullYear());
  const [yearStats, setYearStats] = useState<YearlyJuzStats | null>(null);
  const [yearLoading, setYearLoading] = useState(false);

  const [khatamState, setKhatamState] = useState<KhatamState>({});
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [reciterName, setReciterName] = useState('');
  const [monthReserved, setMonthReserved] = useState(0);

  const [boardPeriod, setBoardPeriod] = useState<'week' | 'month'>('month');
  const [leaders, setLeaders] = useState<JuzLeaderboardRow[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);

  const refreshYearStats = useCallback(
    async (u: SupabaseUser | null, year: number) => {
      setYearLoading(true);
      try {
        const supabase = getSupabaseClient();
        const stats = await loadYearlyMonthlyJuzStats(supabase, u?.id ?? null, year, now);
        setYearStats(stats);
      } catch {
        setYearStats(null);
      } finally {
        setYearLoading(false);
      }
    },
    [now]
  );

  const refreshProgress = useCallback(
    async (u: SupabaseUser | null) => {
      const supabase = getSupabaseClient();
      if (supabase && u) {
        try {
          const counts = await syncJuzActivityCounts(supabase, u.id, day, month, week);
          setDailyJuz(counts.daily);
          setWeekCount(counts.weekCount);
          setMonthCount(counts.monthCount);
          void refreshYearStats(u, viewYear);
          return;
        } catch (e) {
          setError((e as Error).message || 'Could not sync progress');
        }
      }

      const localDaily = readLocalJuzList(day);
      setDailyJuz(localDaily);
      setWeekCount(Math.max(localDaily.length, readLocalNumber(`quran_juz_week_total_${week}`)));
      setMonthCount(Math.max(localDaily.length, readLocalNumber(`quran_juz_month_total_${month}`)));
      void refreshYearStats(u, viewYear);
    },
    [day, month, refreshYearStats, viewYear, week]
  );

  const refreshLeaderboard = useCallback(
    async (u: SupabaseUser | null) => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setLeaders([]);
        return;
      }
      setBoardLoading(true);
      try {
        const periodKey = boardPeriod === 'week' ? week : month;
        const rows = await loadJuzLeaderboard(supabase, boardPeriod, periodKey, u?.id ?? null);
        setLeaders(rows);
      } catch {
        setLeaders([]);
      } finally {
        setBoardLoading(false);
      }
    },
    [boardPeriod, month, week]
  );

  useEffect(() => {
    const saved = loadKhatamTargets();
    setTargets(saved);
    setTargetsDraft(saved);

    try {
      const savedState = localStorage.getItem('khatamState');
      if (savedState) setKhatamState(JSON.parse(savedState) as KhatamState);
      const savedMonth = localStorage.getItem(`khatam_month_total_${month}`);
      if (savedMonth) setMonthReserved(Number(savedMonth) || 0);
    } catch {
      /* ignore */
    }

    setMounted(true);
  }, [month]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('khatamState', JSON.stringify(khatamState));
  }, [khatamState, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(`khatam_month_total_${month}`, String(monthReserved));
    } catch {
      /* ignore */
    }
  }, [month, monthReserved, mounted]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      void refreshProgress(null);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      const display = getDisplayNameFromUser(u);
      if (display) setReciterName((prev) => (prev.trim() ? prev : display));
      void refreshProgress(u);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      const display = getDisplayNameFromUser(u);
      if (display) setReciterName((prev) => (prev.trim() ? prev : display));
      void refreshProgress(u);
    });

    return () => sub.subscription.unsubscribe();
  }, [refreshProgress]);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    void (async () => {
      const { data } = await supabase
        .from('user_monthly_activity')
        .select('count')
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('activity', 'khatam')
        .maybeSingle();
      const remote = Number((data as { count?: number } | null)?.count || 0);
      const merged = Math.max(monthReserved, remote);
      setMonthReserved(merged);
      if (merged > remote) {
        await supabase.from('user_monthly_activity').upsert(
          { user_id: user.id, month, activity: 'khatam', count: merged },
          { onConflict: 'user_id,month,activity' }
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync reservation count when user/month changes
  }, [month, user?.id]);

  useEffect(() => {
    if (tab === 'leaderboard') void refreshLeaderboard(user);
  }, [tab, boardPeriod, refreshLeaderboard, user]);

  useEffect(() => {
    if (!mounted) return;
    void refreshYearStats(user, viewYear);
  }, [mounted, refreshYearStats, user, viewYear]);

  const juzLeft = Math.max(0, targets.monthlyJuz - monthCount);
  const pace = recommendedDailyPace(monthCount, targets.monthlyJuz, daysLeft);
  const dayDone = dailyJuz.length >= targets.dailyJuz;
  const monthPct = targets.monthlyJuz > 0 ? Math.min(100, Math.round((monthCount / targets.monthlyJuz) * 100)) : 0;
  const reservedCount = Object.values(khatamState).filter((s) => s.reserved).length;

  const toggleJuz = async (juzId: number) => {
    setError(null);
    setBusy(true);
    const isOn = dailyJuz.includes(juzId);
    void AnalyticsEvents.featureClick('khatam_juz_toggle', String(juzId));

    try {
      const supabase = getSupabaseClient();
      if (supabase && user) {
        const display = getDisplayNameFromUser(user);
        if (display) {
          void supabase.from('public_profiles').upsert(
            { user_id: user.id, display_name: display },
            { onConflict: 'user_id' }
          );
        }
        const counts = isOn
          ? await removeDailyJuzRecitation(supabase, user.id, juzId, day, month, week)
          : await addDailyJuzRecitation(supabase, user.id, juzId, day, month, week);
        if (counts) {
          setDailyJuz(counts.daily);
          setWeekCount(counts.weekCount);
          setMonthCount(counts.monthCount);
          void refreshYearStats(user, viewYear);
        }
      } else {
        const next = isOn
          ? dailyJuz.filter((j) => j !== juzId)
          : [...dailyJuz, juzId].sort((a, b) => a - b);
        setDailyJuz(next);
        writeLocalJuzList(day, next);

        const delta = isOn ? -1 : 1;
        const nextWeek = Math.max(0, weekCount + delta);
        const nextMonth = Math.max(0, monthCount + delta);
        setWeekCount(nextWeek);
        setMonthCount(nextMonth);
        writeLocalNumber(`quran_juz_week_total_${week}`, nextWeek);
        writeLocalNumber(`quran_juz_month_total_${month}`, nextMonth);
        void refreshYearStats(null, viewYear);
      }
    } catch (e) {
      setError((e as Error).message || 'Could not update juz');
    } finally {
      setBusy(false);
    }
  };

  const saveTargets = () => {
    const next: KhatamTargets = {
      dailyJuz: Math.max(1, Math.min(30, Math.floor(targetsDraft.dailyJuz) || 1)),
      monthlyJuz: Math.max(1, Math.min(60, Math.floor(targetsDraft.monthlyJuz) || 30)),
    };
    setTargets(next);
    setTargetsDraft(next);
    saveKhatamTargets(next);
    setEditingTargets(false);
    void AnalyticsEvents.featureClick('khatam_targets_save');
  };

  const handleSelect = (juzId: number) => {
    setSelectedJuz(juzId);
    if (user) setReciterName(getDisplayNameFromUser(user) || '');
    else setReciterName('');
  };

  const handleSubmit = async (juzId: number) => {
    if (!reciterName.trim()) return;
    setKhatamState((prev) => ({
      ...prev,
      [juzId]: { reserved: true, reciterName: reciterName.trim() },
    }));
    setSelectedJuz(null);
    setReciterName('');

    const nextMonthReserved = monthReserved + 1;
    setMonthReserved(nextMonthReserved);

    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('user_monthly_activity').upsert(
        { user_id: user.id, month, activity: 'khatam', count: nextMonthReserved },
        { onConflict: 'user_id,month,activity' }
      );
    }
  };

  const handleReset = () => {
    if (!confirm('Reset community reservations on this device?')) return;
    setKhatamState({});
    localStorage.removeItem('khatamState');
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <BookOpen className="h-8 w-8 text-emerald-600" />
            <h1 className="font-serif text-3xl font-bold text-slate-800 sm:text-4xl">
              Qur’an Khatam Tracker
            </h1>
          </div>
          <div className="mb-4 flex items-center justify-center gap-2 text-emerald-700">
            <Calendar className="h-5 w-5" />
            <span className="text-lg font-medium">{monthLabel}</span>
          </div>
          <p className="mx-auto max-w-2xl text-sm text-slate-600">
            Log daily juz, set targets, see how many juz remain to finish the Qur’an this month, and
            climb the recitation leaderboard.
          </p>
        </header>

        {/* Quick open juz — compact dropdown */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <label htmlFor="khatam-open-juz" className="text-sm font-semibold text-slate-700">
            Open juz
          </label>
          <select
            id="khatam-open-juz"
            defaultValue=""
            onChange={(e) => {
              const id = e.target.value;
              if (!id) return;
              router.push(`/quran/juz/${id}`);
            }}
            className="min-h-[40px] min-w-[10rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="" disabled>
              Select juz…
            </option>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((juzId) => (
              <option key={juzId} value={juzId}>
                Juz {juzId}
                {dailyJuz.includes(juzId) ? ' ✓' : ''}
              </option>
            ))}
          </select>
          <Link
            href="/quran/juz"
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            All juz →
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {(
            [
              { id: 'progress' as const, label: 'My progress', icon: Flame },
              { id: 'leaderboard' as const, label: 'Leaderboard', icon: Trophy },
              { id: 'community' as const, label: 'Community slots', icon: User },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                tab === id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {!user && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
            Tracking works offline on this device.{' '}
            <Link href="/auth?mode=signup&redirect=/khatam" className="font-bold underline">
              Sign up
            </Link>{' '}
            or{' '}
            <Link href="/auth?redirect=/khatam" className="font-bold underline">
              sign in
            </Link>{' '}
            to sync progress and appear on the leaderboard.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {tab === 'progress' && (
          <div className="space-y-6">
            {/* Summary rings */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ProgressRing
                value={dailyJuz.length}
                max={targets.dailyJuz}
                label="Today"
                sublabel={dayDone ? 'Daily target met' : `${Math.max(0, targets.dailyJuz - dailyJuz.length)} juz left today`}
              />
              <ProgressRing
                value={monthCount}
                max={targets.monthlyJuz}
                label="This month"
                sublabel={`${juzLeft} juz left · ${daysLeft} days remaining`}
                color="sky"
              />
              <ProgressRing
                value={weekCount}
                max={Math.max(targets.dailyJuz * 7, 1)}
                label="This week"
                sublabel={`${weekCount} juz recited`}
                color="amber"
              />
            </div>

            {/* Monthly pace card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Monthly khatam pace</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Finish {targets.monthlyJuz} juz in {totalDays} days ({monthLabel})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTargetsDraft(targets);
                    setEditingTargets((v) => !v);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                >
                  <Target className="h-3.5 w-3.5" />
                  {editingTargets ? 'Close' : 'Edit targets'}
                </button>
              </div>

              <div className="mb-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${monthPct}%` }}
                />
              </div>
              <div className="mb-4 flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-semibold text-emerald-700">{monthPct}% of monthly target</span>
                <span className="text-slate-500">
                  Day {now.getDate()} of {totalDays}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{monthCount}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Juz done
                  </p>
                </div>
                <div className="rounded-xl bg-rose-50 p-3 text-center">
                  <p className="text-2xl font-bold text-rose-700">{juzLeft}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600/80">
                    Juz left
                  </p>
                </div>
                <div className="rounded-xl bg-sky-50 p-3 text-center">
                  <p className="text-2xl font-bold text-sky-700">{daysLeft}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600/80">
                    Days left
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{pace}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700/80">
                    Need / day
                  </p>
                </div>
              </div>

              {editingTargets && (
                <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-slate-700">Daily juz target</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={targetsDraft.dailyJuz}
                        onChange={(e) =>
                          setTargetsDraft((t) => ({ ...t, dailyJuz: Number(e.target.value) }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-slate-700">
                        Monthly juz target (30 = full Qur’an)
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={targetsDraft.monthlyJuz}
                        onChange={(e) =>
                          setTargetsDraft((t) => ({ ...t, monthlyJuz: Number(e.target.value) }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={saveTargets}
                    className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    Save targets
                  </button>
                </div>
              )}
            </div>

            {/* Yearly monthly tracker */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Yearly recitation</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Juz logged each month · see your full year at a glance
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewYear((y) => y - 1)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-bold text-slate-600 hover:border-emerald-300"
                    aria-label="Previous year"
                  >
                    ‹
                  </button>
                  <span className="min-w-[4.5rem] text-center text-sm font-bold text-slate-900">
                    {viewYear}
                  </span>
                  <button
                    type="button"
                    disabled={viewYear >= now.getFullYear()}
                    onClick={() => setViewYear((y) => Math.min(now.getFullYear(), y + 1))}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-bold text-slate-600 hover:border-emerald-300 disabled:opacity-40"
                    aria-label="Next year"
                  >
                    ›
                  </button>
                </div>
              </div>

              {yearLoading && !yearStats ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                </div>
              ) : (
                <>
                  <div className="mb-5 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-emerald-50 p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-800">
                        {yearStats?.yearTotal ?? 0}
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700/80">
                        Juz this year
                      </p>
                    </div>
                    <div className="rounded-xl bg-sky-50 p-3 text-center">
                      <p className="text-2xl font-bold text-sky-800">
                        {yearStats?.fullKhatams ?? 0}
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700/80">
                        Full Qur’ans
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3 text-center">
                      <p className="text-2xl font-bold text-amber-800">
                        {yearStats?.monthsWithActivity ?? 0}
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700/80">
                        Active months
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {(yearStats?.months ?? []).map((m) => {
                      const barMax = Math.max(
                        targets.monthlyJuz,
                        ...(yearStats?.months.map((x) => x.count) ?? [0]),
                        1
                      );
                      const barPct = Math.min(100, Math.round((m.count / barMax) * 100));
                      const metTarget = m.count >= targets.monthlyJuz;
                      return (
                        <div
                          key={m.monthKey}
                          className={`rounded-xl border p-3 ${
                            m.isCurrent
                              ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300'
                              : m.isFuture
                                ? 'border-slate-100 bg-slate-50/60 opacity-60'
                                : metTarget
                                  ? 'border-emerald-200 bg-white'
                                  : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              {m.label}
                            </span>
                            {metTarget && !m.isFuture && (
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                          </div>
                          <p
                            className={`text-xl font-bold ${
                              m.count > 0 ? 'text-slate-900' : 'text-slate-300'
                            }`}
                          >
                            {m.count}
                          </p>
                          <p className="mb-2 text-[10px] font-medium text-slate-400">juz</p>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                metTarget ? 'bg-emerald-500' : 'bg-sky-400'
                              }`}
                              style={{ width: `${m.isFuture ? 0 : barPct}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-[10px] text-slate-400">
                            {m.isFuture
                              ? 'Upcoming'
                              : `${Math.min(100, Math.round((m.count / targets.monthlyJuz) * 100))}% of ${targets.monthlyJuz}`}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {(yearStats?.yearTotal ?? 0) > 0 && (
                    <p className="mt-4 text-center text-sm text-slate-600">
                      In {viewYear} you recited{' '}
                      <span className="font-bold text-emerald-700">{yearStats?.yearTotal}</span> juz
                      {(yearStats?.fullKhatams ?? 0) > 0 && (
                        <>
                          {' '}
                          (~
                          <span className="font-bold text-sky-700">{yearStats?.fullKhatams}</span>{' '}
                          full Qur’an{(yearStats?.fullKhatams ?? 0) === 1 ? '' : 's'})
                        </>
                      )}
                      .
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Daily log */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Log today’s juz</h2>
                  <p className="text-sm text-slate-500">
                    Tap each juz you completed today · {dailyJuz.length} selected
                    {busy && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" />}
                  </p>
                </div>
                <Link
                  href="/quran/juz"
                  className="text-sm font-semibold text-emerald-700 hover:underline"
                >
                  Open Juz reader →
                </Link>
              </div>

              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-10">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((juzId) => {
                  const on = dailyJuz.includes(juzId);
                  return (
                    <button
                      key={juzId}
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleJuz(juzId)}
                      className={`relative flex min-h-[48px] flex-col items-center justify-center rounded-xl border text-sm font-bold transition-all disabled:opacity-60 ${
                        on
                          ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                      title={`Juz ${juzId}`}
                    >
                      {on && <CheckCircle className="absolute right-1 top-1 h-3 w-3 opacity-80" />}
                      {juzId}
                    </button>
                  );
                })}
              </div>

              {dailyJuz.length > 0 && (
                <p className="mt-4 text-sm text-slate-600">
                  Today:{' '}
                  <span className="font-semibold text-emerald-800">
                    {dailyJuz.map((j) => `Juz ${j}`).join(', ')}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {tab === 'leaderboard' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900">Juz recitation leaders</h2>
              </div>
              <div className="flex rounded-lg border border-slate-200 p-0.5">
                {(['week', 'month'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setBoardPeriod(p)}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold capitalize ${
                      boardPeriod === p ? 'bg-emerald-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <p className="mb-4 text-sm text-slate-500">
              Ranked by total juz logged ({boardPeriod === 'week' ? week : monthLabel}). Highest
              recitation climbs to the top.
            </p>

            {boardLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : leaders.length === 0 ? (
              <div className="rounded-xl bg-slate-50 py-12 text-center text-sm text-slate-500">
                No juz logged yet this {boardPeriod}. Be the first — log juz in My progress.
              </div>
            ) : (
              <ul className="space-y-2">
                {leaders.map((row, i) => (
                  <li
                    key={row.userId}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                      row.isYou
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-100 bg-slate-50/80'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        i === 0
                          ? 'bg-amber-400 text-amber-950'
                          : i === 1
                            ? 'bg-slate-300 text-slate-800'
                            : i === 2
                              ? 'bg-amber-700/80 text-white'
                              : 'bg-white text-slate-500 border border-slate-200'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">
                        {row.name}
                        {row.isYou && (
                          <span className="ml-2 text-xs font-bold text-emerald-700">You</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-700">{row.count}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        juz
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'community' && (
          <>
            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-semibold text-slate-600">Community slots (this device)</span>
                <span className="font-bold text-emerald-600">
                  {Math.round((reservedCount / 30) * 100)}% reserved
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                  style={{ width: `${(reservedCount / 30) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-center text-xs text-slate-400">
                {reservedCount} of 30 juz reserved · Your month: {monthReserved}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {JUZ_DATA.map((juz) => {
                const status = khatamState[juz.id];
                const isReserved = status?.reserved;
                const isSelected = selectedJuz === juz.id;

                return (
                  <div
                    key={juz.id}
                    className={`relative overflow-hidden rounded-xl border transition-all ${
                      isReserved
                        ? 'border-emerald-200 bg-emerald-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-emerald-200 hover:shadow-md'
                    }`}
                  >
                    <div className="p-6">
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <h3
                            className={`text-xl font-bold ${isReserved ? 'text-emerald-800' : 'text-slate-700'}`}
                          >
                            {juz.label}
                          </h3>
                          <p className="mt-1 text-xs font-medium text-slate-500">Starts: {juz.start}</p>
                        </div>
                        {isReserved ? (
                          <CheckCircle className="h-6 w-6 text-emerald-500" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-serif text-sm text-slate-400">
                            {juz.id}
                          </div>
                        )}
                      </div>

                      {isReserved ? (
                        <div className="rounded-lg border border-emerald-100 bg-white/50 p-3">
                          <div className="mb-1 flex items-center gap-2 text-emerald-700">
                            <User className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">
                              Reserved by
                            </span>
                          </div>
                          <p className="pl-6 text-lg font-medium text-emerald-900">
                            {status.reciterName}
                          </p>
                          <button
                            type="button"
                            onClick={() => void toggleJuz(juz.id)}
                            disabled={busy || dailyJuz.includes(juz.id)}
                            className="mt-3 w-full rounded-lg border border-emerald-600 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                          >
                            {dailyJuz.includes(juz.id) ? 'Logged today ✓' : 'Mark recited today'}
                          </button>
                        </div>
                      ) : isSelected ? (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Enter reciter name
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={reciterName}
                              onChange={(e) => setReciterName(e.target.value)}
                              placeholder="Your name"
                              className="flex-1 rounded-lg border border-slate-300 p-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleSubmit(juz.id);
                                if (e.key === 'Escape') setSelectedJuz(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => void handleSubmit(juz.id)}
                              disabled={!reciterName.trim()}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Confirm
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedJuz(null)}
                            className="mt-2 text-xs text-slate-400 underline hover:text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelect(juz.id)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-white px-4 py-3 text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
                        >
                          Select for recitation →
                        </button>
                      )}
                    </div>
                    <div className={`h-1 w-full ${isReserved ? 'bg-amber-400' : 'bg-slate-100'}`} />
                  </div>
                );
              })}
            </div>

            <div className="mt-12 border-t border-slate-200 pt-8 text-center">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-red-500"
              >
                <RefreshCw className="h-4 w-4" />
                Reset community slots on this device
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
