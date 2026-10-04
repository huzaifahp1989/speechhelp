'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, BookOpen, Check, Flame, Headphones, LoaderCircle, Plus, Trophy } from 'lucide-react';
import { surahs as quranSurahs } from '@/data/surahs';

type PanelMode = 'kids' | 'quran';

type ChildProfile = {
  id: string;
  nickname: string;
  avatar: string | null;
  leaderboard_enabled: boolean;
};

type LeaderboardEntry = {
  nickname: string;
  avatar: string | null;
  points?: number;
  minutes?: number;
  surahs?: number;
};

type Dashboard = {
  totalPoints: number;
  quranPoints: number;
  todayMinutes: number;
  todayPoints: number;
  todayGoal: number;
  weekMinutes: number;
  weekPoints: number;
  monthMinutes: number;
  surahsCompleted: number;
  juzCompleted: number;
  recitersCount: number;
  currentStreak: number;
  streakGoalMinutes: number;
  completedSurahs: number[];
  completedJuz: number[];
  reciters: { name: string; minutes: number }[];
  badges: { code: string; title: string; description: string; icon: string }[];
};

type Challenge = {
  id: string;
  scope: 'daily' | 'weekly';
  metric: string;
  title: string;
  description: string;
  target: number;
  reward_points: number;
};

type ChallengeProgress = {
  challenge_id: string;
  progress: number;
  completed_at: string | null;
};

type ListeningActivity = {
  nickname: string;
  avatar: string | null;
  minutes: number;
  reciterName: string | null;
  surahNumber: number | null;
  juzNumber: number | null;
  startedAt: string;
  completionPercentage: number;
};

type KidsApiResponse = {
  error?: string;
  requiresSignIn?: boolean;
  children?: ChildProfile[];
  dashboard?: Dashboard | null;
  globalLeaderboard?: LeaderboardEntry[];
  quranLeaderboard?: LeaderboardEntry[];
  child?: ChildProfile;
  challenges?: Challenge[];
  challengeProgress?: ChallengeProgress[];
  listeningActivity?: ListeningActivity[];
};

type QuranListeningPanelProps = {
  mode: PanelMode;
  onChildChange?: (childProfileId: string | null) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseChild(value: unknown): ChildProfile | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.nickname !== 'string') return null;
  return {
    id: value.id,
    nickname: value.nickname,
    avatar: typeof value.avatar === 'string' ? value.avatar : null,
    leaderboard_enabled: value.leaderboard_enabled === true,
  };
}

function parseLeaderboard(value: unknown, type: 'global' | 'quran'): LeaderboardEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!isRecord(row) || typeof row.nickname !== 'string') return [];
    return [{
      nickname: row.nickname,
      avatar: typeof row.avatar === 'string' ? row.avatar : null,
      ...(type === 'global'
        ? { points: Number(row.total_points) || 0 }
        : {
            minutes: Number(row.listening_minutes) || 0,
            points: Number(row.quran_points) || 0,
            surahs: Number(row.surahs_completed) || 0,
          }),
    }];
  });
}

function parseDashboard(value: unknown): Dashboard | null {
  if (!isRecord(value)) return null;
  const numeric = (key: string) => typeof value[key] === 'number' ? value[key] as number : 0;
  const reciters = Array.isArray(value.reciters)
    ? value.reciters.flatMap((reciter) => {
        if (!isRecord(reciter) || typeof reciter.name !== 'string') return [];
        return [{ name: reciter.name, minutes: Number(reciter.minutes) || 0 }];
      })
    : [];
  const badges = Array.isArray(value.badges)
    ? value.badges.flatMap((badge) => {
        if (!isRecord(badge) || typeof badge.code !== 'string' || typeof badge.title !== 'string') return [];
        return [{
          code: badge.code,
          title: badge.title,
          description: typeof badge.description === 'string' ? badge.description : '',
          icon: typeof badge.icon === 'string' ? badge.icon : 'award',
        }];
      })
    : [];
  const numberArray = (key: string) => Array.isArray(value[key])
    ? value[key].filter((item): item is number => typeof item === 'number')
    : [];
  return {
    totalPoints: numeric('totalPoints'),
    quranPoints: numeric('quranPoints'),
    todayMinutes: numeric('todayMinutes'),
    todayPoints: numeric('todayPoints'),
    todayGoal: numeric('todayGoal') || 60,
    weekMinutes: numeric('weekMinutes'),
    weekPoints: numeric('weekPoints'),
    monthMinutes: numeric('monthMinutes'),
    surahsCompleted: numeric('surahsCompleted'),
    juzCompleted: numeric('juzCompleted'),
    recitersCount: numeric('recitersCount'),
    currentStreak: numeric('currentStreak'),
    streakGoalMinutes: numeric('streakGoalMinutes') || 10,
    completedSurahs: numberArray('completedSurahs'),
    completedJuz: numberArray('completedJuz'),
    reciters,
    badges,
  };
}

async function readResponse(response: Response): Promise<KidsApiResponse> {
  const payload: unknown = await response.json();
  if (!isRecord(payload)) throw new Error('The server returned an invalid Kids Zone response.');
  return {
    error: typeof payload.error === 'string' ? payload.error : undefined,
    requiresSignIn: payload.requiresSignIn === true,
    children: Array.isArray(payload.children)
      ? payload.children.map(parseChild).filter((child): child is ChildProfile => child !== null)
      : undefined,
    dashboard: payload.dashboard === null ? null : parseDashboard(payload.dashboard),
    globalLeaderboard: parseLeaderboard(payload.globalLeaderboard, 'global'),
    quranLeaderboard: parseLeaderboard(payload.quranLeaderboard, 'quran'),
    child: parseChild(payload.child) ?? undefined,
    challenges: Array.isArray(payload.challenges)
      ? payload.challenges.filter((challenge): challenge is Challenge =>
          isRecord(challenge) && typeof challenge.id === 'string'
          && (challenge.scope === 'daily' || challenge.scope === 'weekly')
          && typeof challenge.title === 'string' && typeof challenge.description === 'string'
          && typeof challenge.metric === 'string'
          && typeof challenge.target === 'number' && typeof challenge.reward_points === 'number')
      : undefined,
    challengeProgress: Array.isArray(payload.challengeProgress)
      ? payload.challengeProgress.filter((item): item is ChallengeProgress =>
          isRecord(item) && typeof item.challenge_id === 'string' && typeof item.progress === 'number'
          && (typeof item.completed_at === 'string' || item.completed_at === null))
      : undefined,
    listeningActivity: Array.isArray(payload.listeningActivity)
      ? payload.listeningActivity.flatMap((value) => {
          if (!isRecord(value) || typeof value.nickname !== 'string'
            || typeof value.listening_minutes !== 'number'
            || (typeof value.reciter_name !== 'string' && value.reciter_name !== null)
            || (typeof value.surah_number !== 'number' && value.surah_number !== null)
            || (typeof value.juz_number !== 'number' && value.juz_number !== null)
            || typeof value.started_at !== 'string') return [];
          return [{
            nickname: value.nickname,
            avatar: typeof value.avatar === 'string' ? value.avatar : null,
            minutes: value.listening_minutes,
            reciterName: value.reciter_name,
            surahNumber: value.surah_number,
            juzNumber: value.juz_number,
            startedAt: value.started_at,
            completionPercentage: typeof value.completion_percentage === 'number' ? value.completion_percentage : 0,
          }];
        })
      : undefined,
  };
}

export default function KidsZonePanel({ mode, onChildChange }: QuranListeningPanelProps) {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [activeChildId, setActiveChildId] = useState('');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [quranLeaderboard, setQuranLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeProgress, setChallengeProgress] = useState<ChallengeProgress[]>([]);
  const [listeningActivity, setListeningActivity] = useState<ListeningActivity[]>([]);
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all_time'>('weekly');
  const [nickname, setNickname] = useState('');
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingNickname, setEditingNickname] = useState('');
  const [editingAvatar, setEditingAvatar] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  const refresh = useCallback(async (selectedChildId: string, selectedPeriod: string) => {
    const query = new URLSearchParams({ period: selectedPeriod });
    if (selectedChildId) query.set('childProfileId', selectedChildId);
    const response = await fetch(`/api/kids-zone?${query}`, { cache: 'no-store' });
    const payload = await readResponse(response);
    if (!response.ok) throw new Error(payload.error || 'Could not load Kids Zone.');
    setError('');
    setRequiresSignIn(payload.requiresSignIn === true);
    const nextChildren = payload.children || [];
    setChildren(nextChildren);
    setGlobalLeaderboard(payload.globalLeaderboard || []);
    setQuranLeaderboard(payload.quranLeaderboard || []);
    setChallenges(payload.challenges || []);
    setChallengeProgress(payload.challengeProgress || []);
    setListeningActivity(payload.listeningActivity || []);
    if (selectedChildId) setDashboard(payload.dashboard || null);
    else setDashboard(null);
    return nextChildren;
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void refresh('', period)
      .then((nextChildren) => {
        if (!active) return;
        let remembered = '';
        try {
          remembered = localStorage.getItem('speechhelp_active_kids_child') || '';
        } catch (storageError) {
          console.error('Could not read the selected child profile.', storageError);
        }
        const preferred = nextChildren.find((child) => child.id === remembered)?.id
          || nextChildren[0]?.id
          || '';
        setActiveChildId(preferred);
        onChildChange?.(preferred || null);
        if (preferred) return refresh(preferred, period);
        return undefined;
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load Kids Zone.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onChildChange, period, refresh]);

  useEffect(() => {
    if (mode !== 'quran' || !activeChildId) return;
    const timer = window.setInterval(() => {
      void refresh(activeChildId, period).catch((loadError: unknown) => {
        console.error('Could not refresh Quran listening activity.', loadError);
      });
    }, 30000);
    return () => window.clearInterval(timer);
  }, [activeChildId, mode, period, refresh]);

  const selectChild = (childId: string) => {
    setActiveChildId(childId);
    onChildChange?.(childId || null);
    try {
      if (childId) localStorage.setItem('speechhelp_active_kids_child', childId);
      else localStorage.removeItem('speechhelp_active_kids_child');
    } catch (storageError) {
      console.error('Could not save the selected child profile.', storageError);
    }
    setLoading(true);
    void refresh(childId, period)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load the child dashboard.'))
      .finally(() => setLoading(false));
  };

  const createChild = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/kids-zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname,
          avatar: selectedAvatar,
          leaderboardEnabled: true,
        }),
      });
      const payload = await readResponse(response);
      if (!response.ok || !payload.child) throw new Error(payload.error || 'Could not create profile.');
      setNickname('');
      setSelectedAvatar(null);
      await refresh(payload.child.id, period);
      selectChild(payload.child.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not create profile.');
    } finally {
      setSaving(false);
    }
  };

  const openEditProfile = () => {
    const child = children.find((item) => item.id === activeChildId);
    if (!child) return;
    setEditingNickname(child.nickname);
    setEditingAvatar(child.avatar || null);
    setEditingProfile(true);
  };

  const cancelEditProfile = () => {
    setEditingProfile(false);
    setEditingNickname('');
    setEditingAvatar(null);
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const child = children.find((item) => item.id === activeChildId);
    if (!child) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/kids-zone', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childProfileId: child.id,
          nickname: editingNickname,
          avatar: editingAvatar,
        }),
      });
      const payload = await readResponse(response);
      if (!response.ok || !payload.child) throw new Error(payload.error || 'Could not update profile.');
      setChildren((current) => current.map((item) => item.id === child.id ? payload.child! : item));
      setEditingProfile(false);
      setEditingNickname('');
      setEditingAvatar(null);
      await refresh(child.id, period);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const toggleLeaderboard = async () => {
    const child = children.find((item) => item.id === activeChildId);
    if (!child) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/kids-zone', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childProfileId: child.id,
          leaderboardEnabled: !child.leaderboard_enabled,
        }),
      });
      const payload = await readResponse(response);
      if (!response.ok || !payload.child) throw new Error(payload.error || 'Could not update privacy settings.');
      setChildren((current) => current.map((item) => item.id === child.id ? payload.child! : item));
      await refresh(child.id, period);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update privacy settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && children.length === 0 && mode === 'kids') {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
        <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" /> Loading Kids Zone…
      </section>
    );
  }

  if (error && children.length === 0 && mode === 'kids') {
    const requiresSignIn = error.toLowerCase().includes('sign in');
    return (
      <section className="rounded-2xl border border-border bg-surface p-5">
        <p role="alert" className="text-sm text-red-700">{error}</p>
        {requiresSignIn && (
          <Link href="/auth?redirect=%2Fkids-zone" className="mt-3 inline-flex font-semibold text-primary">
            Sign in to use Kids Zone
          </Link>
        )}
      </section>
    );
  }

  const activeChild = children.find((child) => child.id === activeChildId);
  const progress = dashboard
    ? Math.min(100, Math.round((dashboard.todayMinutes / Math.max(1, dashboard.todayGoal)) * 100))
    : 0;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              {mode === 'quran' ? 'Qur’an listening' : 'Kids Zone'}
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-foreground">
              {mode === 'quran' ? 'Your listening progress' : 'My overall points'}
            </h2>
          </div>
          {children.length > 0 && (
            <label className="text-sm font-semibold text-foreground">
              <span className="sr-only">Choose child profile</span>
              <select
                value={activeChildId}
                onChange={(event) => selectChild(event.target.value)}
                className="min-h-11 min-w-48 rounded-xl border border-border bg-background px-3"
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id}>{child.nickname}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {!activeChild ? (
          <div className="mt-5 rounded-xl bg-background p-4">
            <p className="text-sm text-muted">
              {loading
                ? 'Loading listening profile and public leaderboard…'
                : 'Create a child profile to save listening minutes and points privately.'}
            </p>
            {mode === 'kids' && requiresSignIn ? (
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href="/auth?redirect=%2Fkids-zone" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 font-bold text-white">
                  Sign in with email and password
                </Link>
                <Link href="/auth?mode=signup&redirect=%2Fkids-zone" className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 font-semibold text-primary">
                  Create an account
                </Link>
              </div>
            ) : mode === 'kids' ? (
              <div className="mt-3 space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">Choose avatar (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ['moon', '🌙'],
                      ['star', '⭐'],
                      ['book', '📚'],
                      ['headphones', '🎧'],
                      ['mosque', '🕌'],
                      ['flower', '🌸'],
                    ] as const).map(([key, glyph]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedAvatar(selectedAvatar === key ? null : key)}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-lg ring-2 transition ${
                          selectedAvatar === key
                            ? 'ring-primary bg-primary/10'
                            : 'ring-border bg-surface hover:bg-primary/5'
                        }`}
                        aria-label={`Pick avatar ${glyph}`}
                        aria-pressed={selectedAvatar === key}
                      >
                        {glyph}
                      </button>
                    ))}
                  </div>
                </div>
                <form onSubmit={createChild} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    minLength={2}
                    maxLength={30}
                    required
                    aria-label="Child nickname for leaderboard"
                    placeholder="Child nickname for leaderboard"
                    className="min-h-11 flex-1 rounded-xl border border-border bg-surface px-3"
                  />
                  <button
                    disabled={saving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-white disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Add child
                  </button>
                </form>
              </div>
            ) : requiresSignIn ? (
              <div className="mt-3 flex flex-wrap gap-3">
                <>
                  <Link href="/auth?redirect=%2Fquran%2Flisten" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 font-bold text-white">
                    Sign in with email and password
                  </Link>
                  <Link href="/auth?mode=signup&redirect=%2Fquran%2Flisten" className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 font-semibold text-primary">
                    Create an account
                  </Link>
                </>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-muted">
                  Add your name to join the public listening leaderboard and earn points per reciter.
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">Choose avatar (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ['moon', '🌙'],
                      ['star', '⭐'],
                      ['book', '📚'],
                      ['headphones', '🎧'],
                      ['mosque', '🕌'],
                      ['flower', '🌸'],
                    ] as const).map(([key, glyph]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedAvatar(selectedAvatar === key ? null : key)}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-lg ring-2 transition ${
                          selectedAvatar === key
                            ? 'ring-primary bg-primary/10'
                            : 'ring-border bg-surface hover:bg-primary/5'
                        }`}
                        aria-label={`Pick avatar ${glyph}`}
                        aria-pressed={selectedAvatar === key}
                      >
                        {glyph}
                      </button>
                    ))}
                  </div>
                </div>
                <form onSubmit={createChild} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    minLength={2}
                    maxLength={30}
                    required
                    aria-label="Your name for the leaderboard"
                    placeholder="Your name or nickname (2-30 chars)"
                    className="min-h-11 flex-1 rounded-xl border border-border bg-surface px-3"
                  />
                  <button
                    disabled={saving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-white disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Add my name
                  </button>
                </form>
                <Link href="/kids-zone" className="inline-flex text-xs font-semibold text-primary">
                  Open full Kids Zone dashboard →
                </Link>
              </div>
            )}
          </div>
        ) : dashboard ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {mode === 'kids' ? (
                <>
                  <Stat icon={<Trophy />} label="Overall points" value={dashboard.totalPoints} />
                  <Stat icon={<Headphones />} label="Qur’an points" value={dashboard.quranPoints} />
                  <Stat icon={<BookOpen />} label="Surahs completed" value={dashboard.surahsCompleted} />
                  <Stat icon={<Flame />} label="Listening streak" value={`${dashboard.currentStreak} days`} />
                </>
              ) : (
                <>
                  <Stat icon={<Headphones />} label="Today" value={`${dashboard.todayMinutes} min`} />
                  <Stat icon={<Trophy />} label="Qur’an points" value={dashboard.quranPoints} />
                  <Stat icon={<Flame />} label="Streak" value={`${dashboard.currentStreak} days`} />
                  <Stat icon={<BookOpen />} label="Surahs completed" value={dashboard.surahsCompleted} />
                </>
              )}
            </div>
            {mode === 'quran' && (
              <>
                <div className="mt-4 rounded-xl bg-background p-4">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-semibold text-foreground">Today&apos;s listening goal</span>
                    <span className="text-muted">{dashboard.todayMinutes} / {dashboard.todayGoal} minutes</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="This week" value={`${dashboard.weekMinutes} min`} />
                  <Stat label="Weekly Qur’an points" value={dashboard.weekPoints} />
                  <Stat label="Juz completed" value={dashboard.juzCompleted} />
                  <Stat label="Different reciters" value={dashboard.recitersCount} />
                </div>
                <div className="mt-4 rounded-xl border border-border bg-background p-4">
                  <h3 className="text-sm font-bold text-foreground">Juz progress</h3>
                  <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
                    {Array.from({ length: 30 }, (_, index) => {
                      const juz = index + 1;
                      const completed = dashboard.completedJuz.includes(juz);
                      return (
                        <span
                          key={juz}
                          title={completed ? `Juz ${juz} completed` : `Juz ${juz} not completed`}
                          className={`rounded-lg px-2 py-2 text-center text-xs font-bold ${completed ? 'bg-emerald-100 text-emerald-800' : 'bg-surface text-muted'}`}
                        >
                          {completed ? '✓' : '·'} {juz}
                        </span>
                      );
                    })}
                  </div>
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-primary">View all 114 Surahs</summary>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {quranSurahs.map((surah) => {
                        const completed = dashboard.completedSurahs.includes(surah.id);
                        return (
                          <span
                            key={surah.id}
                            title={completed ? `${surah.name_simple} completed` : `${surah.name_simple} not completed`}
                            className={`truncate rounded-lg px-2 py-2 text-xs ${completed ? 'bg-emerald-100 font-semibold text-emerald-800' : 'bg-surface text-muted'}`}
                          >
                            {completed ? '✓' : '·'} {surah.id}. {surah.name_simple}
                          </span>
                        );
                      })}
                    </div>
                  </details>
                </div>
              </>
            )}
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3 border-t border-border pt-4">
              {editingProfile ? (
                <form onSubmit={saveProfile} className="w-full space-y-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">Edit your profile for the leaderboard</p>
                    <p className="mt-1 text-xs text-muted">
                      Your name and avatar appear on the public listening leaderboard.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-foreground">Name / Nickname</label>
                    <input
                      value={editingNickname}
                      onChange={(event) => setEditingNickname(event.target.value)}
                      minLength={2}
                      maxLength={30}
                      required
                      className="min-h-11 w-full rounded-xl border border-border bg-surface px-3"
                      aria-label="Leaderboard name"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Avatar</p>
                    <div className="flex flex-wrap gap-2">
                      {([
                        [null, 'None'],
                        ['moon', '🌙'],
                        ['star', '⭐'],
                        ['book', '📚'],
                        ['headphones', '🎧'],
                        ['mosque', '🕌'],
                        ['flower', '🌸'],
                      ] as const).map(([key, glyph]) => (
                        <button
                          key={key || 'none'}
                          type="button"
                          onClick={() => setEditingAvatar(key)}
                          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-lg ring-2 transition ${
                            editingAvatar === key
                              ? 'ring-primary bg-primary/10'
                              : 'ring-border bg-surface hover:bg-primary/5'
                          }`}
                          aria-pressed={editingAvatar === key}
                          aria-label={key === null ? 'No avatar' : `Avatar ${glyph}`}
                        >
                          {key === null ? <span className="text-xs text-muted font-bold">—</span> : glyph}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save profile'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditProfile}
                      disabled={saving}
                      className="inline-flex min-h-10 items-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-xs text-muted">
                      {mode === 'quran'
                        ? `${dashboard.monthMinutes} minutes this month · ${dashboard.todayPoints} points today`
                        : `${dashboard.weekMinutes} Qur’an minutes this week · ${dashboard.juzCompleted} Juz completed`}
                    </p>
                    <p className="text-xs text-muted">
                      Leaderboard name: <span className="font-semibold text-foreground">{activeChild.nickname}</span>
                      {activeChild.avatar ? <span className="ml-2 text-base"> {avatarGlyph(activeChild.avatar)} </span> : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={openEditProfile}
                      className="text-xs font-semibold text-primary disabled:opacity-50"
                    >
                      Edit name / avatar
                    </button>
                    <span aria-hidden className="mx-1 h-3 w-px border-l border-border" />
                    <button
                      type="button"
                      onClick={() => void toggleLeaderboard()}
                      disabled={saving}
                      className="text-xs font-semibold text-primary disabled:opacity-50"
                    >
                      {activeChild.leaderboard_enabled ? 'Hide from leaderboards' : 'Join leaderboards'}
                    </button>
                  </div>
                </>
              )}
            </div>
            {dashboard.reciters.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-bold text-foreground">My reciters</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {dashboard.reciters.slice(0, 8).map((reciter) => (
                    <span key={reciter.name} className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                      {reciter.name} · {reciter.minutes} min
                    </span>
                  ))}
                </div>
              </div>
            )}
            {dashboard.badges.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-bold text-foreground">Badges</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {dashboard.badges.map((badge) => (
                    <span key={badge.code} title={badge.description} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground">
                      <Award className="h-4 w-4 text-amber-500" /> {badge.title}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {challenges.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-bold text-foreground">Listening challenges</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {challenges.map((challenge) => {
                    const progressItem = challengeProgress.find((item) => item.challenge_id === challenge.id);
                    const value = Math.min(challenge.target, progressItem?.progress || 0);
                    const pct = Math.round((value / challenge.target) * 100);
                    return (
                      <div key={challenge.id} className="rounded-xl border border-border bg-background p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-foreground">{challenge.title}</p>
                            <p className="mt-1 text-xs text-muted">{challenge.description}</p>
                          </div>
                          {progressItem?.completed_at
                            ? <Check className="h-5 w-5 shrink-0 text-emerald-600" />
                            : <span className="text-xs font-bold text-primary">+{challenge.reward_points}</span>}
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-right text-[11px] text-muted">
                          {value} / {challenge.target} {challenge.metric === 'surahs_completed' ? 'Surahs' : 'min'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-5 text-sm text-muted">Loading this child&apos;s progress…</p>
        )}
        {error && mode === 'quran' && (
          <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {error.toLowerCase().includes('supabase')
              ? 'Quran listening leaderboards need the Supabase setup migration and project configuration before shared entries can load.'
              : error}
          </p>
        )}
        {error && mode === 'kids' && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </section>

      {mode === 'kids' && (
        <Leaderboard
          title="Global Kids Zone leaderboard"
          subtitle="Overall points from Quran listening and approved Kids Zone activities."
          entries={globalLeaderboard}
          valueLabel="points"
        />
      )}
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-foreground">Qur’an listening leaderboard</h2>
            <p className="mt-1 text-xs text-muted">Ranked by listening minutes. Only opted-in nicknames and avatars are shown.</p>
          </div>
          <div className="flex gap-1 rounded-xl bg-background p-1">
            {(['weekly', 'monthly', 'all_time'] as const).map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setPeriod(item)}
                className={`min-h-9 rounded-lg px-3 text-xs font-bold ${period === item ? 'bg-primary text-white' : 'text-muted'}`}
              >
                {item === 'all_time' ? 'All time' : item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <Leaderboard entries={quranLeaderboard} valueLabel="minutes" compact />
      </section>
      {mode === 'quran' && <ListeningActivityFeed entries={listeningActivity} />}
    </div>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-background p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted">
        {icon && <span className="text-primary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        {label}
      </div>
      <div className="mt-1 text-lg font-extrabold text-foreground">{value}</div>
    </div>
  );
}

function Leaderboard({
  title,
  subtitle,
  entries,
  valueLabel,
  compact = false,
}: {
  title?: string;
  subtitle?: string;
  entries: LeaderboardEntry[];
  valueLabel: 'points' | 'minutes';
  compact?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
      {title && <h2 className="font-bold text-foreground">{title}</h2>}
      {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      {entries.length === 0 ? (
        <p className="mt-4 rounded-xl bg-background p-4 text-sm text-muted">No opted-in listeners yet.</p>
      ) : (
        <ol className="mt-3 divide-y divide-border">
          {entries.map((entry, index) => (
            <li key={`${entry.nickname}-${index}`} className="flex items-center gap-3 py-3">
              <span className="w-7 text-sm font-extrabold text-primary">{index + 1}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {entry.avatar ? avatarGlyph(entry.avatar) : entry.nickname.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{entry.nickname}</span>
              <span className="text-right text-xs font-bold text-foreground">
                {valueLabel === 'points' ? entry.points : entry.minutes} {valueLabel}
                {!compact && valueLabel === 'points' && entry.minutes !== undefined && (
                  <span className="block font-normal text-muted">{entry.minutes} min · {entry.surahs || 0} Surahs</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function avatarGlyph(avatar: string): string {
  const glyphs: Record<string, string> = {
    moon: '🌙',
    star: '⭐',
    book: '📚',
    headphones: '🎧',
    mosque: '🕌',
    flower: '🌸',
  };
  return glyphs[avatar] || avatar.slice(0, 1).toUpperCase();
}

function ListeningActivityFeed({ entries }: { entries: ListeningActivity[] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <div>
        <h2 className="font-bold text-foreground">Recent Quran listening</h2>
        <p className="mt-1 text-xs text-muted">
          Recent sessions from families who have chosen to appear on the leaderboard.
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="mt-4 rounded-xl bg-background p-4 text-sm text-muted">
          No shared listening sessions yet. Opted-in activity will appear here after a minute of listening.
        </p>
      ) : (
        <ol className="mt-3 divide-y divide-border">
          {entries.map((entry, index) => {
            const surahName = entry.surahNumber
              ? quranSurahs.find((surah) => surah.id === entry.surahNumber)?.name_simple
              : null;
            const quranLocation = [
              entry.surahNumber ? `Surah ${surahName || entry.surahNumber}` : null,
              entry.juzNumber ? `Juz ${entry.juzNumber}` : null,
            ].filter(Boolean).join(' · ') || 'Quran audio';
            return (
              <li key={`${entry.nickname}-${entry.startedAt}-${index}`} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {entry.avatar ? avatarGlyph(entry.avatar) : entry.nickname.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">
                    {entry.nickname} listened for {entry.minutes} {entry.minutes === 1 ? 'minute' : 'minutes'}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {quranLocation}
                    {entry.reciterName ? ` · ${entry.reciterName}` : ''}
                    {entry.completionPercentage === 100 ? ' · Completed' : ''}
                  </p>
                  <time className="mt-1 block text-[11px] text-muted" dateTime={entry.startedAt}>
                    {new Date(entry.startedAt).toLocaleString()}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
