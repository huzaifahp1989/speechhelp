'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { surahs } from '@/data/surahs';
import {
  Mic,
  Play,
  Pause,
  Clock,
  CheckCircle,
  AlertCircle,
  Hourglass,
  ChevronRight,
  Plus,
  Headphones,
  Star,
  MessageSquare,
  Trophy,
  Target,
  TrendingUp,
  Flame,
  AlertTriangle,
  BookOpen,
  Calendar,
  Sparkles,
  Waves,
  ChevronDown,
  ChevronUp,
  PenLine,
  ClipboardList,
  Gauge,
  Link2,
  Radio,
} from 'lucide-react';

interface Recording {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'reviewing' | 'approved' | 'needs_improvement';
  surah_from?: number;
  ayah_from?: number;
  surah_to?: number;
  ayah_to?: number;
  juz?: number;
  audio_url: string;
  duration_seconds?: number;
  admin_rating?: number;
  admin_feedback?: string;
  points_awarded?: number;
  mistakes_count?: number;
  mistakes_details?: { verseKey?: string; surah?: number; ayah?: number }[];
  created_at: string;
  reviewed_at?: string;
  comments?: { count: number }[];
}

type SessionType = 'recited' | 'memorized_new' | 'tajweed_listening';

interface ManualLog {
  id?: string;
  day: string; // YYYY-MM-DD
  session_type?: SessionType;
  minutes: number;
  ayat_count?: number | null;
  coverage_text?: string | null;
  notes?: string | null;
  tajweed_focus?: string | null;
  created_at?: string;
  is_optimistic?: boolean;
}

const GOAL_KEY = 'hafiz-goal-minutes-per-day-v1';
const SESSION_TYPES: { value: SessionType; label: string; hint: string }[] = [
  { value: 'recited', label: 'Recited (Dhor / Review)', hint: 'Sabaq para, sabaq sabqi — repeated portions out loud' },
  { value: 'memorized_new', label: 'Sabak (New Lesson)', hint: 'Today’s new sabak / first pass of fresh verses' },
  { value: 'tajweed_listening', label: 'Tajweed / Listening', hint: 'Listening to a reciter, tajweed drills' },
];

function todayYmd(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function yesterdayYmd(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const COVERAGE_PRESETS: { label: string; hint?: string }[] = [
  { label: 'Sabak (New)', hint: "Today's new lesson" },
  { label: 'Sabak Para', hint: 'New sabak + current para review' },
  { label: 'Dhor (Yesterday)', hint: 'Yesterday’s sabak revision' },
  { label: 'Sabaq Sabqi', hint: 'Full cumulative review of recent lessons' },
  { label: 'Manzil', hint: 'Daily Manzil portion (3 juz approx.)' },
  { label: '1st Para 1st Quarter', hint: 'Para 1 — Rub 1' },
  { label: '1st Para 2nd Quarter', hint: 'Para 1 — Rub 2' },
  { label: '1st Para 3rd Quarter', hint: 'Para 1 — Rub 3' },
  { label: '1st Para 4th Quarter', hint: 'Para 1 — Rub 4' },
  { label: '2nd Para first half', hint: 'Para 2 — Rub 1-2' },
  { label: '2nd Para second half', hint: 'Para 2 — Rub 3-4' },
  { label: 'Juz 1 full', hint: 'Para 1 complete' },
  { label: 'Juz 2 first half', hint: 'Para 2 Hizb 1' },
  { label: 'Juz 2 second half', hint: 'Para 2 Hizb 2' },
  { label: 'Juz 3 full', hint: 'Para 3 complete' },
  { label: '1st Hizb (1/2 Juz)', hint: 'Half para' },
  { label: '1 Rub (1/4 Juz)', hint: 'One quarter para' },
  { label: '2 Rub (half Juz)', hint: 'Two quarters = half para' },
  { label: '3 Rub (3/4 Juz)', hint: 'Three quarters para' },
  { label: 'Pages 1-5' },
  { label: 'Pages 20-25' },
  { label: 'Whole Para (1 Juz)', hint: 'Full para recitation' },
  { label: 'Tajweed of new Sabak', hint: 'Makhraj / tajweed focus' },
];

const MINUTE_PRESETS: { label: string; v: number }[] = [
  { label: '5m', v: 5 },
  { label: '10m', v: 10 },
  { label: '15m', v: 15 },
  { label: '20m', v: 20 },
  { label: '30m', v: 30 },
  { label: '45m', v: 45 },
  { label: '60m', v: 60 },
  { label: '90m', v: 90 },
];

const DAY_PRESETS: { label: string; v: string }[] = [
  { label: 'Today', v: todayYmd() },
  { label: 'Yesterday', v: yesterdayYmd() },
];

function formatDuration(seconds?: number) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function hoursMinutes(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function QuranRecordingPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [manualLogs, setManualLogs] = useState<ManualLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'reviewed'>('all');

  // Goal
  const [goalMinutes, setGoalMinutes] = useState<number>(30);
  const [editingGoal, setEditingGoal] = useState(false);

  // Expanded reports
  const [expandWeak, setExpandWeak] = useState(true);
  const [expandStrides, setExpandStrides] = useState(true);

  // Manual log form
  const [manualMinutes, setManualMinutes] = useState<number>(20);
  const [manualDay, setManualDay] = useState<string>(todayYmd());
  const [manualSessionType, setManualSessionType] = useState<SessionType>('recited');
  const [manualAyat, setManualAyat] = useState<string>('');
  const [manualCoverage, setManualCoverage] = useState<string[]>([]); // quick coverage chips picked
  const [manualCoverageFree, setManualCoverageFree] = useState<string>(''); // extra free text
  const [manualNotes, setManualNotes] = useState<string>('');
  const [manualTajweed, setManualTajweed] = useState<string>('');
  const [savingManual, setSavingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualToast, setManualToast] = useState<string | null>(null);

  // Auth
  useEffect(() => {
    (async () => {
      const userResult = await supabase?.auth.getUser().catch(() => undefined);
      const maybeUser = userResult?.data?.user ?? null;
      if (!maybeUser) {
        router.push('/auth?redirect=/quran-recording');
        return;
      }
      setUser(maybeUser);
    })();
  }, [supabase, router]);

  // Goal from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(GOAL_KEY);
      if (raw) setGoalMinutes(Math.max(5, Number(raw) || 30));
    } catch { /* ignore */ }
  }, []);

  // Fetch recordings
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setLoading(true);
        let url = '/api/quran-recordings';
        if (activeTab !== 'all') {
          url += `?status=${activeTab === 'pending' ? 'pending' : 'approved,needs_improvement'}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok) setRecordings(data.recordings || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, activeTab]);

  // Fetch manual logs (last 45 days)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingLogs(true);
        const res = await fetch('/api/quran-recording/manual-log?days=45');
        const data = await res.json();
        if (!cancelled && res.ok) setManualLogs(data.manualLogs || []);
      } catch (e) {
        console.error('manual logs fetch:', e);
      } finally {
        if (!cancelled) setLoadingLogs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Save manual practice entry
  async function saveManualEntry(ev?: React.FormEvent) {
    if (ev) ev.preventDefault();
    setManualError(null);
    setManualToast(null);
    if (!Number.isFinite(manualMinutes) || manualMinutes <= 0) {
      setManualError('Please enter how many minutes you practiced.');
      return;
    }
    if (!manualDay || !/^\d{4}-\d{2}-\d{2}$/.test(manualDay)) {
      setManualError('Please pick a valid day.');
      return;
    }
    setSavingManual(true);
    const nAyat = manualAyat.trim() ? Number(manualAyat) : null;

    // Build coverage text: preset chips + freeform notes joined
    const parts: string[] = [...manualCoverage];
    if (manualCoverageFree.trim()) parts.push(manualCoverageFree.trim());
    const coverageText = parts.length > 0 ? parts.join(' • ') : null;

    const payload: Record<string, unknown> = {
      minutes: manualMinutes,
      day: manualDay,
      sessionType: manualSessionType,
      goalMinutes,
    };
    if (nAyat && Number.isFinite(nAyat) && nAyat > 0) payload.ayatCount = Math.floor(nAyat);
    if (coverageText) payload.coverageText = coverageText;
    if (manualNotes.trim()) payload.notes = manualNotes.trim();
    if (manualTajweed.trim()) payload.tajweedFocus = manualTajweed.trim();

    // Optimistic unshift so stats/charts update instantly.
    const optimistic: ManualLog = {
      id: `opt_${Date.now()}`,
      day: manualDay,
      session_type: manualSessionType,
      minutes: manualMinutes,
      ayat_count: nAyat,
      coverage_text: coverageText,
      notes: payload.notes as any,
      tajweed_focus: payload.tajweedFocus as any,
      created_at: new Date().toISOString(),
      is_optimistic: true,
    };
    setManualLogs((prev) => [optimistic, ...prev]);
    try {
      const res = await fetch('/api/quran-recording/manual-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');
      // Replace optimistic with server version.
      setManualLogs((prev) => {
        const rest = prev.filter((x) => x.id !== optimistic.id);
        const server: ManualLog = data.log || optimistic;
        return [server, ...rest];
      });
      setManualToast(
        `Saved: ${manualMinutes}m ${SESSION_TYPES.find((s) => s.value === manualSessionType)?.label || ''} on ${manualDay}.`
      );
      // Reset variable fields (keep day, session type, goal)
      setManualAyat('');
      setManualCoverage([]);
      setManualCoverageFree('');
      setManualNotes('');
      setManualTajweed('');
      setTimeout(() => setManualToast(null), 4500);
    } catch (e: any) {
      // Rollback optimistic
      setManualLogs((prev) => prev.filter((x) => x.id !== optimistic.id));
      setManualError(e?.message || 'Could not save your entry.');
    } finally {
      setSavingManual(false);
    }
  }

  function toggleCoverage(label: string) {
    setManualCoverage((prev) => {
      if (prev.includes(label)) return prev.filter((x) => x !== label);
      return [...prev, label];
    });
  }

  // Derived analytics
  const totalDuration = useMemo(
    () =>
      recordings.reduce((sum, r) => sum + (r.duration_seconds || 0), 0) +
      manualLogs.reduce((s, l) => s + (Number(l.minutes) || 0) * 60, 0),
    [recordings, manualLogs]
  );
  const totalPoints = useMemo(
    () => recordings.reduce((sum, r) => sum + (r.points_awarded || 0), 0),
    [recordings]
  );
  const avgRating = useMemo(() => {
    const rated = recordings.filter((r) => r.admin_rating);
    if (rated.length === 0) return null;
    const avg = rated.reduce((s, r) => s + (r.admin_rating || 0), 0) / rated.length;
    return Math.round(avg * 10) / 10;
  }, [recordings]);

  // Last 7 days / 4 weeks bar charts
  const { week, streakDays, todaySeconds, todayGoalProgress } = useMemo(() => {
    const days: { label: string; dateISO: string; seconds: number; recordings: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dateISO: iso,
        seconds: 0,
        recordings: 0,
      });
    }
    recordings.forEach((r) => {
      const iso = new Date(r.created_at).toISOString().slice(0, 10);
      const bucket = days.find((d) => d.dateISO === iso);
      if (bucket) {
        bucket.seconds += r.duration_seconds || 0;
        bucket.recordings += 1;
      }
    });
    manualLogs.forEach((l) => {
      const iso = l.day;
      const bucket = days.find((d) => d.dateISO === iso);
      if (bucket) {
        bucket.seconds += Math.max(0, (Number(l.minutes) || 0) * 60);
        bucket.recordings += 1; // count manual log as 1 session for display
      }
    });
    const todaySecs = days[6].seconds;
    // Streak: consecutive days (from today) with non-zero seconds (recordings OR manual logs)
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].seconds > 0) streak++;
      else break;
    }
    return {
      week: days,
      streakDays: streak,
      todaySeconds: todaySecs,
      todayGoalProgress: Math.min(100, (todaySecs / (goalMinutes * 60)) * 100),
    };
  }, [recordings, manualLogs, goalMinutes]);

  const weeks = useMemo(() => {
    const buckets: Record<string, { label: string; seconds: number; recordings: number }> = {};
    const addToBucket = (key: string, label: string, secondsDelta: number, sessionsDelta: number) => {
      if (!buckets[key]) buckets[key] = { label, seconds: 0, recordings: 0 };
      buckets[key].seconds += secondsDelta;
      buckets[key].recordings += sessionsDelta;
    };
    recordings.forEach((r) => {
      const d = new Date(r.created_at);
      const day = d.getDay(); // 0 = sun
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      const key = monday.toISOString().slice(0, 10);
      const short = `${monday.getMonth() + 1}/${monday.getDate()}`;
      addToBucket(key, short, r.duration_seconds || 0, 1);
    });
    manualLogs.forEach((l) => {
      const [y, m, dd] = l.day.split('-').map(Number);
      const d = new Date(Date.UTC(y, m - 1, dd));
      const day = d.getUTCDay();
      const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(Date.UTC(y, m - 1, diff));
      const key = monday.toISOString().slice(0, 10);
      const short = `${monday.getUTCMonth() + 1}/${monday.getUTCDate()}`;
      addToBucket(key, short, Math.max(0, (Number(l.minutes) || 0) * 60), 1);
    });
    const sorted = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
      .slice(-8);
    return sorted;
  }, [recordings, manualLogs]);

  // Surah coverage (strengths / areas for improvement)
  const coverage = useMemo(() => {
    const bySurah: Record<number, { minutes: number; recordings: number; approved: number; mistakes: number }> = {};
    recordings.forEach((r) => {
      if (!r.surah_from) return;
      const start = r.surah_from;
      const end = r.surah_to || start;
      const secondsPer = (r.duration_seconds || 0) / Math.max(1, end - start + 1);
      for (let s = start; s <= end; s++) {
        if (!bySurah[s]) bySurah[s] = { minutes: 0, recordings: 0, approved: 0, mistakes: 0 };
        bySurah[s].minutes += secondsPer / 60;
        bySurah[s].recordings += 1;
        if (r.status === 'approved') bySurah[s].approved += 1;
        bySurah[s].mistakes += r.mistakes_count || 0;
      }
      // Also parse mistake_details for extra per-surah flags (precise verse weak flags)
      (r.mistakes_details || []).forEach((m) => {
        const s = m.surah ?? (m.verseKey ? Number(m.verseKey.split(':')[0]) : null);
        if (s) {
          if (!bySurah[s]) bySurah[s] = { minutes: 0, recordings: 0, approved: 0, mistakes: 0 };
          bySurah[s].mistakes += 1;
        }
      });
    });
    return bySurah;
  }, [recordings]);

  const strengths = useMemo(() => {
    return Object.entries(coverage)
      .map(([surah, stats]) => ({ surah: Number(surah), ...stats }))
      .filter((x) => x.approved > 0 || x.recordings >= 3)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5)
      .map(({ surah, ...rest }) => ({
        surah,
        name: surahs.find((s) => s.id === surah)?.name_simple || `Surah ${surah}`,
        ...rest,
      }));
  }, [coverage]);

  const weak = useMemo(() => {
    return Object.entries(coverage)
      .map(([surah, stats]) => ({ surah: Number(surah), ...stats }))
      .filter((x) => x.mistakes > 0 || (x.recordings > 0 && x.approved === 0))
      .sort((a, b) => {
        if (b.mistakes !== a.mistakes) return b.mistakes - a.mistakes;
        return a.approved - b.approved;
      })
      .slice(0, 6)
      .map(({ surah, ...rest }) => ({
        surah,
        name: surahs.find((s) => s.id === surah)?.name_simple || `Surah ${surah}`,
        ...rest,
      }));
  }, [coverage]);

  // Consistency flag: last 14 days, count of non-zero days
  const consistency = useMemo(() => {
    const twoWeeks = new Map<string, number>();
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      twoWeeks.set(d.toISOString().slice(0, 10), 0);
    }
    recordings.forEach((r) => {
      const key = new Date(r.created_at).toISOString().slice(0, 10);
      if (twoWeeks.has(key)) twoWeeks.set(key, (twoWeeks.get(key) || 0) + (r.duration_seconds || 0));
    });
    const activeDays = [...twoWeeks.values()].filter((v) => v > 0).length;
    return {
      activeDays,
      total: 14,
      pct: Math.round((activeDays / 14) * 100),
    };
  }, [recordings]);

  // Quran memorization progress estimate: 6,236 verses. Each approved recording = some percentage of its range.
  const memorizationProgress = useMemo(() => {
    const FALLBACK_AYAH: Record<number, number> = { 1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75, 9: 129, 10: 109, 36: 83, 55: 78, 56: 96, 67: 30, 78: 40, 112: 4, 113: 5, 114: 6 };
    const ayahCovered = new Set<string>();
    recordings.forEach((r) => {
      if (r.status !== 'approved') return;
      const startS = r.surah_from;
      if (!startS) return;
      const endS = r.surah_to || startS;
      for (let s = startS; s <= endS; s++) {
        const first = s === startS ? r.ayah_from || 1 : 1;
        const last = s === endS ? r.ayah_to || FALLBACK_AYAH[s] || 40 : FALLBACK_AYAH[s] || 40;
        for (let a = first; a <= last; a++) ayahCovered.add(`${s}:${a}`);
      }
    });
    const total = 6236;
    const pct = Math.min(100, (ayahCovered.size / total) * 100);
    return { pct: Math.round(pct * 10) / 10, covered: ayahCovered.size, total };
  }, [recordings]);

  const getStatusIcon = (s: string) =>
    s === 'approved' ? <CheckCircle className="w-5 h-5 text-green-500" /> :
    s === 'needs_improvement' ? <AlertCircle className="w-5 h-5 text-amber-500" /> :
    s === 'reviewing' ? <Hourglass className="w-5 h-5 text-blue-500" /> :
    <Hourglass className="w-5 h-5 text-slate-400" />;

  const getStatusText = (s: string) =>
    s === 'approved' ? 'Approved' :
    s === 'needs_improvement' ? 'Needs Improvement' :
    s === 'reviewing' ? 'Under Review' : 'Pending Review';

  const getStatusColor = (s: string) =>
    s === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
    s === 'needs_improvement' ? 'bg-amber-50 text-amber-700 border-amber-200' :
    s === 'reviewing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
    'bg-slate-50 text-slate-700 border-slate-200';

  const saveGoal = (v: number) => {
    setGoalMinutes(v);
    try { localStorage.setItem(GOAL_KEY, String(v)); } catch { /* ignore */ }
    setEditingGoal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">Loading your hifz dashboard…</p>
        </div>
      </div>
    );
  }

  const maxWeek = Math.max(1, ...week.map((d) => d.seconds));
  const maxMonth = Math.max(1, ...weeks.map((w) => w.seconds));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <Waves className="w-7 h-7 text-emerald-600" />
                Hifz Analytics Dashboard
              </h1>
              <p className="mt-1 text-slate-600">
                Track recitation consistency, weak verses, and memorization progress.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Link
                href="/quran-studio"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-800 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Mic className="w-5 h-5" />
                Studio
              </Link>
              <Link
                href="/quran-recording/submit"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Recording
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Top Stat Row */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Mic className="w-5 h-5 text-emerald-600" />}
          color="emerald"
          label="Total Recordings"
          value={recordings.length.toString()}
          sub={`${hoursMinutes(totalDuration)} recorded`}
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-blue-600" />}
          color="blue"
          label="Today's Goal"
          value={`${Math.round(todayGoalProgress)}%`}
          sub={`${formatDuration(todaySeconds)} / ${goalMinutes}m`}
        >
          <div className="w-full h-1.5 bg-blue-100 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${todayGoalProgress}%` }}
            />
          </div>
        </StatCard>
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-600" />}
          color="orange"
          label="Day Streak"
          value={`${streakDays} day${streakDays === 1 ? '' : 's'}`}
          sub={`${consistency.activeDays}/14 active`}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-purple-600" />}
          color="purple"
          label="Points Earned"
          value={`${totalPoints}`}
          sub={avgRating ? `Avg rating ${avgRating}/10` : 'No ratings yet'}
        />
      </div>

      {/* Manual Hifz Entry Card — log sabak / sabak para / dhor / sabaq sabqi without recording */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <form
          onSubmit={saveManualEntry}
          className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-200 rounded-2xl shadow-md overflow-hidden"
        >
          <div className="flex items-start justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 via-[#0d4f4f] to-teal-700 text-white border-b border-emerald-800/40">
            <div className="flex items-center gap-3 min-w-0">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-2 ring-white/30 shadow-inner">
                <PenLine className="h-5 w-5 text-white" strokeWidth={2.3} />
                <Sparkles className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-amber-200 fill-amber-100 drop-shadow" />
              </span>
              <div className="min-w-0">
                <h3 className="font-extrabold text-white text-lg drop-shadow-sm flex items-center gap-2 flex-wrap">
                  Log Today’s Practice
                  <span className="inline-flex items-center rounded-full bg-white text-emerald-800 text-[10px] font-black tracking-[0.14em] px-2.5 py-0.5 uppercase ring-1 ring-emerald-200 shadow">
                    Sabak • Dhor • Sabaq Sabqi
                  </span>
                </h3>
                <p className="text-xs text-white/90 mt-0.5 font-medium">
                  Log manually what you recited, no mic needed. Madrasa-style: sabak, sabak para, dhor, manzil, rub/hizb, or custom.
                </p>
              </div>
            </div>
            <Link
              href="/quran-studio"
              className="shrink-0 ml-4 hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-emerald-800 text-xs font-bold ring-1 ring-emerald-200 shadow hover:bg-emerald-50 transition-colors"
            >
              <Radio className="w-4 h-4" strokeWidth={2.3} />
              Open Recorder
            </Link>
          </div>

          <div className="p-5 space-y-5">
            {/* Toast + error */}
            {manualToast && (
              <div className="flex items-start gap-2 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-900 px-4 py-3 text-sm font-medium">
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">Saved ✓</div>
                  <div className="text-emerald-900/85">{manualToast}</div>
                </div>
              </div>
            )}
            {manualError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 text-sm font-medium">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1">{manualError}</div>
              </div>
            )}

            {/* Row 1: Minutes stepper + Day */}
            <div className="grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  How many minutes?
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setManualMinutes((v) => Math.max(1, v - 5))}
                    className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xl shadow-sm"
                    aria-label="Decrease minutes"
                  >
                    −
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(Math.max(1, Math.min(600, Number(e.target.value) || 0)))}
                      className="w-full h-11 rounded-xl bg-white border-2 border-emerald-300 px-4 pr-12 font-bold text-slate-900 text-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"
                      placeholder="20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 pointer-events-none">
                      min
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManualMinutes((v) => Math.min(600, v + 5))}
                    className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xl shadow-sm"
                    aria-label="Increase minutes"
                  >
                    +
                  </button>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {MINUTE_PRESETS.map((p) => {
                    const active = manualMinutes === p.v;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setManualMinutes(p.v)}
                        className={
                          'px-3 py-1 rounded-full text-xs font-bold border transition-all ' +
                          (active
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                            : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50')
                        }
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Day
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {DAY_PRESETS.map((p) => {
                    const active = manualDay === p.v;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setManualDay(p.v)}
                        className={
                          'px-3 py-1.5 rounded-full text-xs font-bold border transition-all ' +
                          (active
                            ? 'bg-[#0d4f4f] text-white border-[#0d4f4f] shadow-sm'
                            : 'bg-white text-[#0d4f4f] border-[#0d4f4f]/30 hover:bg-[#0d4f4f]/5')
                        }
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="date"
                  value={manualDay}
                  onChange={(e) => setManualDay(e.target.value || todayYmd())}
                  className="w-full h-11 rounded-xl bg-white border-2 border-slate-200 px-4 font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"
                />
              </div>
            </div>

            {/* Row 2: Session type (Sabak/Dhor aliases) */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <Gauge className="w-4 h-4 text-emerald-600" />
                What kind of practice
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                {SESSION_TYPES.map((t) => {
                  const active = manualSessionType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setManualSessionType(t.value)}
                      className={
                        'text-left rounded-xl px-4 py-3 border-2 transition-all shadow-sm ' +
                        (active
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-700 shadow-md ring-1 ring-emerald-300'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/60')
                      }
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        {t.label}
                        {active && <CheckCircle className="w-4 h-4 ml-auto shrink-0" />}
                      </div>
                      <div
                        className={
                          'text-xs mt-1 font-medium ' +
                          (active ? 'text-white/90' : 'text-slate-500')
                        }
                      >
                        {t.hint}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Coverage chips + free text — Sabak, Dhor, Sabaq Sabqi first */}
            <div>
              <label className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <ClipboardList className="w-4 h-4 text-emerald-600" />
                  What did you cover? (tap chips)
                </span>
                {manualCoverage.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setManualCoverage([])}
                    className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 underline underline-offset-2"
                  >
                    Clear {manualCoverage.length}
                  </button>
                )}
              </label>
              <div className="bg-white/70 ring-1 ring-emerald-200/70 rounded-xl p-3 flex flex-wrap gap-1.5">
                {COVERAGE_PRESETS.map((c) => {
                  const active = manualCoverage.includes(c.label);
                  const isMadrasaTerm = /^Sabak|^Dhor|Sabaq Sabqi|Manzil|Sabak Para|Tajweed of new Sabak/i.test(c.label);
                  return (
                    <button
                      key={c.label}
                      type="button"
                      title={c.hint || c.label}
                      onClick={() => toggleCoverage(c.label)}
                      className={
                        'px-3 py-1.5 rounded-full text-xs font-bold border transition-all ' +
                        (active
                          ? isMadrasaTerm
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-orange-600 shadow-sm'
                            : 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : isMadrasaTerm
                          ? 'bg-white text-orange-800 border-orange-200 hover:bg-orange-50 ring-1 ring-orange-100'
                          : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50')
                      }
                    >
                      {active ? '✓ ' : ''}
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={manualCoverageFree}
                  onChange={(e) => setManualCoverageFree(e.target.value)}
                  placeholder="Or write it yourself — e.g. Para 2 rub 3, page 30-35, Surah Baqarah last 10 ayat"
                  maxLength={300}
                  className="h-11 rounded-xl bg-white border-2 border-slate-200 px-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"
                />
                <input
                  type="number"
                  min={1}
                  max={6236}
                  value={manualAyat}
                  onChange={(e) => setManualAyat(e.target.value)}
                  placeholder="Ayat count (optional — e.g. 83 for Surah Ya-Sin)"
                  className="h-11 rounded-xl bg-white border-2 border-slate-200 px-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"
                />
              </div>
              {manualCoverage.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">Selected:</span>
                  {manualCoverage.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-sm"
                    >
                      {c}
                      <button
                        type="button"
                        aria-label={`Remove ${c}`}
                        onClick={() => toggleCoverage(c)}
                        className="ml-0.5 h-5 w-5 inline-flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Row 4: Tajweed focus + notes */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  <Waves className="w-4 h-4 text-emerald-600" />
                  Tajweed focus
                </label>
                <input
                  type="text"
                  value={manualTajweed}
                  onChange={(e) => setManualTajweed(e.target.value)}
                  placeholder="Ghunnah, Idghaam, Qalqalah, Madd, Makhraj of Laam, etc."
                  maxLength={200}
                  className="w-full h-11 rounded-xl bg-white border-2 border-slate-200 px-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Personal notes
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Mistakes to review tomorrow, pace, mood, etc."
                  maxLength={500}
                  className="w-full h-11 rounded-xl bg-white border-2 border-slate-200 px-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"
                />
              </div>
            </div>

            {/* Submit row */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                Your minutes + ayat count auto-update streak, goal progress, and weekly charts.
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setManualMinutes(20);
                    setManualDay(todayYmd());
                    setManualSessionType('recited');
                    setManualAyat('');
                    setManualCoverage([]);
                    setManualCoverageFree('');
                    setManualTajweed('');
                    setManualNotes('');
                    setManualError(null);
                    setManualToast(null);
                  }}
                  className="h-11 px-4 rounded-xl bg-white text-slate-700 font-bold border border-slate-200 hover:bg-slate-50 shadow-sm"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={savingManual}
                  className="h-11 px-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-[#0d4f4f] to-teal-700 text-white font-black tracking-wide shadow-lg shadow-emerald-700/30 ring-1 ring-white/60 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-xl transition-all"
                >
                  <PenLine className="w-4 h-4" strokeWidth={2.4} />
                  {savingManual ? 'Saving…' : 'Save Practice Log'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>

      {/* Goal + Memorization */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 grid gap-4 md:grid-cols-2">
        {/* Daily Goal */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Daily Practice Goal
            </h2>
            {editingGoal ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-20 px-2 py-1 border border-slate-200 rounded text-sm"
                  value={goalMinutes}
                  min={5}
                  max={600}
                  onChange={(e) => setGoalMinutes(Number(e.target.value))}
                />
                <button
                  onClick={() => saveGoal(goalMinutes)}
                  className="text-sm px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingGoal(false)}
                  className="text-sm px-3 py-1 border border-slate-200 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingGoal(true)}
                className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2"
              >
                Change goal
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
            <span>Today</span>
            <span className="font-mono">
              {formatDuration(todaySeconds)} / {goalMinutes}:00
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all"
              style={{ width: `${todayGoalProgress}%` }}
            />
          </div>
          <div className="grid grid-cols-7 gap-1.5 mt-5">
            {week.map((d, i) => {
              const goalSecs = goalMinutes * 60;
              const pct = Math.min(100, (d.seconds / goalSecs) * 100);
              const hit = d.seconds >= goalSecs * 0.8;
              const isToday = i === week.length - 1;
              return (
                <div key={d.label} className="text-center">
                  <div
                    className={`h-24 rounded-lg border relative overflow-hidden ${
                      isToday ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-slate-100'
                    } bg-slate-50`}
                    title={`${d.dateISO}: ${formatDuration(d.seconds)} (${d.recordings} recording${d.recordings === 1 ? '' : 's'})`}
                  >
                    <div
                      className={`absolute bottom-0 left-0 right-0 transition-all ${
                        hit ? 'bg-emerald-500' : 'bg-emerald-300/80'
                      }`}
                      style={{ height: `${Math.max(4, pct)}%` }}
                    />
                    {hit && (
                      <CheckCircle className="w-3 h-3 text-white absolute top-1 left-1/2 -translate-x-1/2" />
                    )}
                  </div>
                  <div className="text-[10px] mt-1 text-slate-500">{d.label}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Memorization progress */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Quran Memorization Progress
          </h2>
          <div className="flex items-end gap-3 mb-3">
            <div className="text-4xl font-bold text-slate-900">{memorizationProgress.pct}%</div>
            <div className="text-sm text-slate-600 pb-1">
              {memorizationProgress.covered.toLocaleString()} / {memorizationProgress.total.toLocaleString()} verses
            </div>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 transition-all"
              style={{ width: `${memorizationProgress.pct}%` }}
            />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="text-xs text-emerald-700">Consistency (14d)</div>
              <div className="text-xl font-bold text-emerald-800 mt-1">{consistency.pct}%</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">
                {consistency.activeDays}/{consistency.total} days
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <div className="text-xs text-blue-700">Approved</div>
              <div className="text-xl font-bold text-blue-800 mt-1">
                {recordings.filter((r) => r.status === 'approved').length}
              </div>
              <div className="text-[10px] text-blue-600 mt-0.5">recordings</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
              <div className="text-xs text-amber-700">Needs Work</div>
              <div className="text-xl font-bold text-amber-800 mt-1">
                {recordings.filter((r) => r.status === 'needs_improvement').length}
              </div>
              <div className="text-[10px] text-amber-600 mt-0.5">recordings</div>
            </div>
          </div>
        </section>
      </div>

      {/* Charts */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 grid gap-4 md:grid-cols-2">
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Weekly Volume (Last 7 Days)
            </h2>
            <span className="text-xs text-slate-500">by duration</span>
          </div>
          <div className="h-40 flex items-end gap-3">
            {week.map((d, i) => {
              const h = (d.seconds / maxWeek) * 100;
              const isToday = i === week.length - 1;
              return (
                <div
                  key={d.label + d.dateISO}
                  className="flex-1 flex flex-col items-center gap-2 group"
                >
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isToday
                        ? 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                        : 'bg-gradient-to-t from-teal-500 to-teal-400'
                    }`}
                    style={{ height: `${Math.max(2, h)}%` }}
                    title={`${formatDuration(d.seconds)} · ${d.recordings} rec`}
                  />
                  <div className="text-[10px] text-slate-500">{d.label}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Monthly Trend (Last 8 Weeks)
            </h2>
            <span className="text-xs text-slate-500">by duration</span>
          </div>
          {weeks.length === 0 ? (
            <p className="text-sm text-slate-500 h-40 flex items-center justify-center">
              Not enough data yet — submit more recordings to see trends.
            </p>
          ) : (
            <div className="h-40 flex items-end gap-2">
              {weeks.map((w) => {
                const h = (w.seconds / maxMonth) * 100;
                return (
                  <div
                    key={w.label}
                    className="flex-1 flex flex-col items-center gap-2"
                    title={`Week of ${w.label}: ${hoursMinutes(w.seconds)} · ${w.recordings} rec`}
                  >
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-violet-500 to-fuchsia-400"
                      style={{ height: `${Math.max(2, h)}%` }}
                    />
                    <div className="text-[10px] text-slate-500">{w.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Strengths + Weak areas */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 grid gap-4 md:grid-cols-2">
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <button
            onClick={() => setExpandStrides((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 text-left">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Strengths & Progress
            </h2>
            {expandStrides ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          {expandStrides && (
            <ul className="mt-4 divide-y divide-slate-100">
              {strengths.length === 0 && (
                <li className="py-3 text-sm text-slate-500">
                  Keep submitting recordings — approved work will show up here as strengths.
                </li>
              )}
              {strengths.map((s) => (
                <li key={s.surah} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900">
                      Surah {s.surah} — {s.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {s.recordings} rec · {Math.round(s.minutes)} min · {s.approved} approved
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <Trophy className="w-3.5 h-3.5" />
                    {s.minutes.toFixed(1)} min logged
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <button
            onClick={() => setExpandWeak((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 text-left">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Areas for Improvement
            </h2>
            {expandWeak ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          {expandWeak && (
            <ul className="mt-4 divide-y divide-slate-100">
              {weak.length === 0 && (
                <li className="py-3 text-sm text-slate-500">
                  No weak verses flagged yet. Have recordings reviewed to see recommendations.
                </li>
              )}
              {weak.map((w) => (
                <li key={w.surah} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">
                      Surah {w.surah} — {w.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {w.mistakes > 0 ? `${w.mistakes} mistake${w.mistakes === 1 ? '' : 's'} flagged` : `No approvals yet`}
                      {w.recordings > 0 ? ` · ${w.recordings} submission${w.recordings === 1 ? '' : 's'}` : ''}
                    </div>
                  </div>
                  <Link
                    href={`/quran-studio?surah=${w.surah}`}
                    className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-1 hover:bg-amber-100 whitespace-nowrap"
                  >
                    Practice again
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Personalized Report */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <section className="rounded-xl border border-slate-200 p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-white">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Personalized Progress Report
          </h2>
          <ProgressReport
            recordings={recordings}
            streakDays={streakDays}
            consistency={consistency}
            coverage={coverage}
            strengthsCount={strengths.length}
            weakCount={weak.length}
          />
        </section>
      </div>

      {/* Tabs + list */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex flex-wrap gap-2 border-b border-slate-200">
          {[
            { id: 'all', label: 'All Recordings', count: recordings.length },
            { id: 'pending', label: 'Pending Review', count: recordings.filter(r => r.status === 'pending').length },
            { id: 'reviewed', label: 'Reviewed', count: recordings.filter(r => r.status !== 'pending').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recordings */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {recordings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No recordings yet</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Record in the Studio for verse-by-verse tracking, or submit a file to get feedback.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/quran-studio"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
              >
                <Waves className="w-5 h-5" /> Open Studio
              </Link>
              <Link
                href="/quran-recording/submit"
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                <Plus className="w-5 h-5" /> Upload Recording
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {recordings
              .filter((r) =>
                activeTab === 'pending' ? r.status === 'pending' :
                activeTab === 'reviewed' ? r.status !== 'pending' : true
              )
              .map((r) => (
                <article
                  key={r.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <button
                      onClick={() => setPlayingId(playingId === r.id ? null : r.id)}
                      className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 hover:bg-emerald-200 transition-colors"
                    >
                      {playingId === r.id
                        ? <Pause className="w-5 h-5 text-emerald-700" />
                        : <Play className="w-5 h-5 text-emerald-700 ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-lg">{r.title}</h3>
                          {r.description && (
                            <p className="text-slate-600 text-sm mt-1 line-clamp-2">{r.description}</p>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border self-start ${getStatusColor(r.status)}`}>
                          {getStatusIcon(r.status)}
                          {getStatusText(r.status)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                        {r.surah_from && (
                          <span className="flex items-center gap-1">
                            <Headphones className="w-4 h-4" />
                            Surah {r.surah_from}{r.ayah_from ? `:${r.ayah_from}` : ''}
                            {r.surah_to && ` - Surah ${r.surah_to}`}
                          </span>
                        )}
                        {r.juz && <span>Juz {r.juz}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(r.duration_seconds)}
                        </span>
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                        {r.comments && r.comments[0]?.count > 0 && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <MessageSquare className="w-4 h-4" />
                            {r.comments[0].count}
                          </span>
                        )}
                      </div>
                      {r.status !== 'pending' && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                          <div className="flex flex-wrap items-center gap-4">
                            {r.admin_rating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span className="font-medium text-slate-900">{r.admin_rating}/10</span>
                              </div>
                            )}
                            {r.points_awarded ? (
                              <span className="text-emerald-600 font-medium">+{r.points_awarded} points</span>
                            ) : null}
                            {r.mistakes_count ? (
                              <span className="text-amber-700">{r.mistakes_count} mistake{r.mistakes_count > 1 ? 's' : ''}</span>
                            ) : null}
                          </div>
                          {r.admin_feedback && (
                            <p className="text-slate-700 text-sm mt-2">“{r.admin_feedback}”</p>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 hidden sm:block mt-4" />
                  </div>
                </article>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function StatCard({
  icon, color, label, value, sub, children,
}: {
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'orange' | 'purple';
  label: string;
  value: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  const c: Record<string, string> = {
    emerald: 'bg-emerald-100',
    blue: 'bg-blue-100',
    orange: 'bg-orange-100',
    purple: 'bg-purple-100',
  };
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${c[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-slate-600">{label}</p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ProgressReport({
  recordings,
  streakDays,
  consistency,
  coverage,
  strengthsCount,
  weakCount,
}: {
  recordings: Recording[];
  streakDays: number;
  consistency: { activeDays: number; total: number; pct: number };
  coverage: Record<number, { minutes: number; recordings: number; approved: number; mistakes: number }>;
  strengthsCount: number;
  weakCount: number;
}) {
  const approved = recordings.filter((r) => r.status === 'approved').length;
  const reviewed = recordings.filter((r) => r.status !== 'pending').length;
  const totalSurahs = new Set(
    Object.keys(coverage).map(Number).concat(
      recordings.flatMap((r) => {
        const out: number[] = [];
        if (!r.surah_from) return out;
        for (let s = r.surah_from; s <= (r.surah_to || r.surah_from); s++) out.push(s);
        return out;
      })
    )
  );

  const positives: string[] = [];
  if (streakDays >= 7) positives.push(`${streakDays}-day recitation streak — amazing consistency!`);
  else if (streakDays >= 3) positives.push(`${streakDays}-day streak going — keep the momentum.`);
  if (consistency.pct >= 70) positives.push(`You've recited ${consistency.activeDays} of the last 14 days (${consistency.pct}%) — great discipline.`);
  if (strengthsCount >= 3) positives.push(`Strong progress on ${strengthsCount} surahs — keep building from your strengths.`);
  if (approved >= 5) positives.push(`${approved} recordings approved — your hafiz instructor trusts your work.`);
  if (totalSurahs.size >= 10) positives.push(`Touched ${totalSurahs.size} unique surahs — wide coverage.`);

  const improvements: string[] = [];
  if (consistency.pct < 50 && recordings.length > 0)
    improvements.push(`Only ${consistency.activeDays}/${consistency.total} active days last 2 weeks — aim for at least 10 min/day every day.`);
  if (streakDays < 3 && recordings.length > 0)
    improvements.push(`Short streak (${streakDays} days) — short daily sessions beat long occasional ones.`);
  if (weakCount >= 2)
    improvements.push(`${weakCount} surahs have repeated mistakes or no approvals yet — re-record them in the Studio.`);
  if (reviewed > 0 && recordings.filter((r) => r.status === 'needs_improvement').length > reviewed * 0.5)
    improvements.push(`Many recent submissions need fixes — re-read with tajweed focus before resubmitting.`);
  if (recordings.length === 0)
    improvements.push(`First submission? Open the Studio to start.`);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wide mb-2">
          What's going well
        </h3>
        {positives.length === 0 ? (
          <p className="text-sm text-slate-500">
            Build up a streak and get recordings approved to populate this report.
          </p>
        ) : (
          <ul className="space-y-2">
            {positives.map((t, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide mb-2">
          Recommended focus
        </h3>
        {improvements.length === 0 ? (
          <p className="text-sm text-slate-500">No action items — keep up the great work.</p>
        ) : (
          <ul className="space-y-2">
            {improvements.map((t, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
