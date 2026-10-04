'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type SettingKey =
  | 'points_per_listening_minute'
  | 'daily_point_cap'
  | 'daily_streak_minutes'
  | 'daily_listening_goal_minutes'
  | 'surah_completion_points'
  | 'juz_completion_points'
  | 'reciter_bonus_points'
  | 'min_listening_seconds'
  | 'weekly_listening_target_minutes'
  | 'weekly_challenge_reward_points'
  | 'daily_listening_10_minute_reward_points'
  | 'daily_listening_30_minute_reward_points'
  | 'daily_surah_completion_reward_points'
  | 'streak_reward_points'
  | 'badge_reward_points';

type Settings = Record<SettingKey, number>;
type AdminChild = { id: string; nickname: string };
type AnalyticsData = {
  today?: Record<string, number>;
  week?: Record<string, number>;
  month?: Record<string, number>;
  topListeners?: { nickname: string; minutes: number; points: number }[];
  popularReciters?: { name: string; minutes: number; sessions: number }[];
  popularSurahs?: { surahNumber: number; minutes: number }[];
  child?: {
    nickname: string;
    totalMinutes: number;
    quranPoints: number;
    streak: number;
    reciters: number;
    surahsCompleted: number;
    juzCompleted: number;
    history: {
      date: string;
      surahNumber: number | null;
      juzNumber: number | null;
      reciterName: string | null;
      minutes: number;
      completionPercentage: number;
      points: number;
    }[];
  } | null;
};

type AdminResponse = {
  error?: string;
  settings?: Partial<Settings>;
  analytics?: AnalyticsData;
  children?: AdminChild[];
};

const settingLabels: { key: SettingKey; label: string; suffix: string }[] = [
  { key: 'points_per_listening_minute', label: 'Points per verified minute', suffix: 'points' },
  { key: 'daily_point_cap', label: 'Daily listening points cap', suffix: 'points' },
  { key: 'daily_listening_goal_minutes', label: 'Daily listening goal', suffix: 'minutes' },
  { key: 'daily_streak_minutes', label: 'Minimum minutes for a streak day', suffix: 'minutes' },
  { key: 'min_listening_seconds', label: 'Minimum listening session', suffix: 'seconds' },
  { key: 'surah_completion_points', label: 'Surah completion bonus', suffix: 'points' },
  { key: 'juz_completion_points', label: 'Juz completion bonus', suffix: 'points' },
  { key: 'reciter_bonus_points', label: 'New reciter bonus', suffix: 'points' },
  { key: 'weekly_listening_target_minutes', label: 'Weekly challenge target', suffix: 'minutes' },
  { key: 'weekly_challenge_reward_points', label: 'Weekly challenge reward', suffix: 'points' },
  { key: 'daily_listening_10_minute_reward_points', label: '10-minute challenge reward', suffix: 'points' },
  { key: 'daily_listening_30_minute_reward_points', label: '30-minute challenge reward', suffix: 'points' },
  { key: 'daily_surah_completion_reward_points', label: 'Surah challenge reward', suffix: 'points' },
  { key: 'streak_reward_points', label: '7/30-day streak reward', suffix: 'points' },
  { key: 'badge_reward_points', label: 'Each badge reward', suffix: 'points' },
];

const defaultSettings: Settings = {
  points_per_listening_minute: 1,
  daily_point_cap: 120,
  daily_streak_minutes: 10,
  daily_listening_goal_minutes: 60,
  surah_completion_points: 10,
  juz_completion_points: 25,
  reciter_bonus_points: 5,
  min_listening_seconds: 60,
  weekly_listening_target_minutes: 150,
  weekly_challenge_reward_points: 100,
  daily_listening_10_minute_reward_points: 10,
  daily_listening_30_minute_reward_points: 30,
  daily_surah_completion_reward_points: 10,
  streak_reward_points: 10,
  badge_reward_points: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readResponse(response: Response): Promise<AdminResponse> {
  const value: unknown = await response.json();
  if (!isRecord(value)) throw new Error('The admin API returned an invalid response.');
  return {
    error: typeof value.error === 'string' ? value.error : undefined,
    settings: isRecord(value.settings) ? value.settings as Partial<Settings> : undefined,
    analytics: isRecord(value.analytics) ? value.analytics as AnalyticsData : undefined,
    children: Array.isArray(value.children)
      ? value.children.filter((child): child is AdminChild =>
          isRecord(child) && typeof child.id === 'string' && typeof child.nickname === 'string')
      : undefined,
  };
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export default function KidsZoneAdminClient() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [children, setChildren] = useState<AdminChild[]>([]);
  const [childProfileId, setChildProfileId] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (selectedChildId: string) => {
    const query = selectedChildId ? `?childProfileId=${encodeURIComponent(selectedChildId)}` : '';
    const response = await fetch(`/api/admin/kids-zone${query}`, { cache: 'no-store' });
    const result = await readResponse(response);
    if (!response.ok) throw new Error(result.error || 'Could not load admin analytics.');
    if (result.settings) setSettings({ ...defaultSettings, ...result.settings });
    setChildren(result.children || []);
    setAnalytics(result.analytics || null);
  }, []);

  useEffect(() => {
    setLoading(true);
    void load(childProfileId)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load admin analytics.'))
      .finally(() => setLoading(false));
  }, [childProfileId, load]);

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const response = await fetch('/api/admin/kids-zone', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await readResponse(response);
      if (!response.ok || !result.settings) throw new Error(result.error || 'Could not save the settings.');
      setSettings({ ...defaultSettings, ...result.settings });
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !analytics) {
    return <main className="mx-auto max-w-6xl p-6 text-sm text-muted">Loading Quran analytics…</main>;
  }

  return (
    <main className="min-h-screen bg-background px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <Link href="/admin" className="text-sm font-semibold text-primary">← Admin tools</Link>
          <h1 className="mt-3 text-3xl font-extrabold text-foreground">Quran Audio Analytics</h1>
          <p className="mt-2 text-sm text-muted">Listening totals, leaderboards, child history, and points configuration.</p>
        </header>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {analytics && (
          <>
            <section className="grid gap-4 lg:grid-cols-3">
              <AnalyticsCard title="Today" values={analytics.today} labels={['listeners', 'minutes', 'points', 'sessions']} />
              <AnalyticsCard title="This week" values={analytics.week} labels={['activeChildren', 'minutes', 'points', 'sessions']} />
              <AnalyticsCard title="This month" values={analytics.month} labels={['activeChildren', 'minutes', 'points', 'sessions']} />
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <ListCard title="Top listeners this week" rows={(analytics.topListeners || []).map((row) => `${row.nickname} — ${row.minutes} min · ${row.points} pts`)} />
              <ListCard title="Popular reciters this week" rows={(analytics.popularReciters || []).map((row) => `${row.name} — ${row.minutes} min`)} />
              <ListCard title="Popular Surahs this week" rows={(analytics.popularSurahs || []).map((row) => `Surah ${row.surahNumber} — ${row.minutes} min`)} />
            </section>

            <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-foreground">Individual child history</h2>
                  <p className="mt-1 text-xs text-muted">Recent sessions are limited to 100 records.</p>
                </div>
                <select
                  value={childProfileId}
                  onChange={(event) => setChildProfileId(event.target.value)}
                  className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="">Choose a child</option>
                  {children.map((child) => <option key={child.id} value={child.id}>{child.nickname}</option>)}
                </select>
              </div>
              {analytics.child && (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <ValueCard label="Minutes" value={analytics.child.totalMinutes} />
                    <ValueCard label="Quran points" value={analytics.child.quranPoints} />
                    <ValueCard label="Current streak" value={`${analytics.child.streak} days`} />
                    <ValueCard label="Reciters" value={analytics.child.reciters} />
                    <ValueCard label="Surahs" value={analytics.child.surahsCompleted} />
                    <ValueCard label="Juz" value={analytics.child.juzCompleted} />
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="text-xs text-muted">
                        <tr><th className="py-2">Date</th><th>Surah</th><th>Juz</th><th>Reciter</th><th>Minutes</th><th>Completion</th><th>Points</th></tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {analytics.child.history.map((session, index) => (
                          <tr key={`${session.date}-${index}`}>
                            <td className="py-2">{new Date(session.date).toLocaleString()}</td>
                            <td>{session.surahNumber ?? '—'}</td>
                            <td>{session.juzNumber ?? '—'}</td>
                            <td>{session.reciterName ?? '—'}</td>
                            <td>{session.minutes}</td>
                            <td>{session.completionPercentage}%</td>
                            <td>{session.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        )}

        <form onSubmit={saveSettings} className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
          <h2 className="font-bold text-foreground">Points and listening settings</h2>
          <p className="mt-1 text-xs text-muted">Changes are enforced by the database. Only site administrators can update them.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {settingLabels.map(({ key, label, suffix }) => (
              <label key={key} className="text-sm font-semibold text-foreground">
                {label}
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={settings[key]}
                    onChange={(event) => setSettings((current) => ({ ...current, [key]: Number(event.target.value) }))}
                    className="min-h-11 w-full rounded-xl border border-border bg-background px-3"
                  />
                  <span className="text-xs text-muted">{suffix}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button disabled={saving} className="min-h-11 rounded-xl bg-primary px-5 font-bold text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            {saved && <span className="text-sm font-semibold text-emerald-700">Settings saved.</span>}
          </div>
        </form>
      </div>
    </main>
  );
}

function AnalyticsCard({ title, values, labels }: { title: string; values?: Record<string, number>; labels: string[] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-bold text-foreground">{title}</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {labels.map((key) => (
          <ValueCard key={key} label={key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)} value={asNumber(values?.[key])} />
        ))}
      </div>
    </section>
  );
}

function ValueCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-background p-3">
      <p className="text-xs capitalize text-muted">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function ListCard({ title, rows }: { title: string; rows: string[] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-bold text-foreground">{title}</h2>
      {rows.length ? (
        <ul className="mt-3 space-y-2 text-sm text-foreground">{rows.map((row) => <li key={row}>{row}</li>)}</ul>
      ) : <p className="mt-3 text-sm text-muted">No activity yet.</p>}
    </section>
  );
}
