'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, Cloud, CloudOff, Download, Flame, Loader2, Plus, Star, Trash2, Upload, UserRound } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Metrics = { durood: number; zikr: number; pages: number; juz: number };
type Targets = { durood: number; zikr: number; pages: number; juz: number };
type Profile = { id: string; name: string; group: 'Youth' | 'Adult' };
type CustomTask = { id: string; title: string; target: number; days: number[] };
type DayRecord = { taskCounts?: Record<string, number>; note?: string; metrics?: Metrics };
type StoredData = {
  profiles: Profile[];
  activeProfileId: string;
  tasksByProfile: Record<string, CustomTask[]>;
  daysByProfile: Record<string, Record<string, DayRecord>>;
  reminderTime: string;
  remindersEnabled: boolean;
};

const STORAGE_KEY = 'youth_adult_tracker_extras_v1';
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DEFAULT_PROFILE: Profile = { id: 'personal', name: 'My progress', group: 'Adult' };
const DEFAULT_DATA: StoredData = {
  profiles: [DEFAULT_PROFILE],
  activeProfileId: DEFAULT_PROFILE.id,
  tasksByProfile: {},
  daysByProfile: {},
  reminderTime: '19:00',
  remindersEnabled: false,
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

function isMetricDayComplete(metrics: Metrics | undefined, targets: Targets) {
  if (!metrics) return false;
  const enabled = Object.entries(targets).filter(([, target]) => target > 0) as Array<[keyof Targets, number]>;
  return enabled.length > 0 && enabled.every(([key, target]) => metrics[key] >= target);
}

function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function isStoredData(value: unknown): value is StoredData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredData>;
  return Array.isArray(candidate.profiles)
    && candidate.profiles.length > 0
    && typeof candidate.activeProfileId === 'string'
    && Boolean(candidate.tasksByProfile && typeof candidate.tasksByProfile === 'object')
    && Boolean(candidate.daysByProfile && typeof candidate.daysByProfile === 'object');
}

export default function TrackerExtras({ selectedDay, metrics, targets, userId }: { selectedDay: string; metrics: Metrics; targets: Targets; userId?: string }) {
  const [data, setData] = useState<StoredData>(DEFAULT_DATA);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'local' | 'loading' | 'syncing' | 'synced' | 'error'>('local');
  const loadedUserIdRef = useRef<string | undefined>(undefined);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileGroup, setNewProfileGroup] = useState<'Youth' | 'Adult'>('Youth');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTarget, setNewTaskTarget] = useState(1);
  const [newTaskDays, setNewTaskDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setReady(false);
      setSyncStatus(userId ? 'loading' : 'local');
      let localData = DEFAULT_DATA;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) localData = { ...DEFAULT_DATA, ...(JSON.parse(saved) as Partial<StoredData>) };
      } catch {}

      let nextData = localData;
      if (userId) {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data: cloudRow, error } = await supabase
            .from('tracker_cloud_data')
            .select('payload')
            .eq('user_id', userId)
            .maybeSingle();
          if (!error && isStoredData(cloudRow?.payload)) {
            nextData = { ...DEFAULT_DATA, ...cloudRow.payload };
          } else if (error) {
            setSyncStatus('error');
          }
        }
      }

      if (cancelled) return;
      loadedUserIdRef.current = userId;
      setData(nextData);
      setReady(true);
      if (userId) setSyncStatus('synced');
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (!userId || loadedUserIdRef.current !== userId) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;
    setSyncStatus('syncing');
    const timer = window.setTimeout(() => {
      void supabase.from('tracker_cloud_data').upsert(
        { user_id: userId, payload: data, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      ).then(({ error }) => setSyncStatus(error ? 'error' : 'synced'));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [data, ready, userId]);

  useEffect(() => {
    if (!ready) return;
    setData((previous) => {
      const profileDays = previous.daysByProfile[previous.activeProfileId] ?? {};
      const current = profileDays[selectedDay] ?? {};
      if (JSON.stringify(current.metrics) === JSON.stringify(metrics)) return previous;
      return {
        ...previous,
        daysByProfile: {
          ...previous.daysByProfile,
          [previous.activeProfileId]: { ...profileDays, [selectedDay]: { ...current, metrics } },
        },
      };
    });
  }, [metrics, ready, selectedDay]);

  useEffect(() => {
    if (!ready || !data.remindersEnabled || Notification.permission !== 'granted') return;
    const checkReminder = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const sentKey = `progress_reminder_sent_${dateKey(now)}`;
      if (currentTime === data.reminderTime && !localStorage.getItem(sentKey)) {
        new Notification('Progress check-in', { body: 'Your daily goals and scheduled tasks are ready.' });
        localStorage.setItem(sentKey, '1');
      }
    };
    checkReminder();
    const timer = window.setInterval(checkReminder, 30_000);
    return () => window.clearInterval(timer);
  }, [data.reminderTime, data.remindersEnabled, ready]);

  const activeProfile = data.profiles.find((profile) => profile.id === data.activeProfileId) ?? DEFAULT_PROFILE;
  const profileTasks = data.tasksByProfile[activeProfile.id] ?? [];
  const profileDays = data.daysByProfile[activeProfile.id] ?? {};
  const selectedRecord = profileDays[selectedDay] ?? {};
  const selectedWeekday = new Date(`${selectedDay}T12:00:00`).getDay();
  const dueTasks = profileTasks.filter((task) => task.days.includes(selectedWeekday));

  const reportDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(selectedDay, index - 6)),
    [selectedDay]
  );
  const reportValues = reportDays.map((day) => {
    const dayMetrics = profileDays[day]?.metrics;
    if (!dayMetrics) return 0;
    const ratios = (Object.keys(targets) as Array<keyof Targets>)
      .filter((key) => targets[key] > 0)
      .map((key) => Math.min(1, dayMetrics[key] / targets[key]));
    return ratios.length ? Math.round((ratios.reduce((sum, value) => sum + value, 0) / ratios.length) * 100) : 0;
  });
  const maxReport = Math.max(1, ...reportValues);

  let streak = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    if (!isMetricDayComplete(profileDays[addDays(selectedDay, -offset)]?.metrics, targets)) break;
    streak += 1;
  }

  const completedGoals = (Object.keys(targets) as Array<keyof Targets>).filter(
    (key) => targets[key] > 0 && metrics[key] >= targets[key]
  ).length;
  const achievements = [
    { label: 'First step', earned: Object.keys(profileDays).length > 0 },
    { label: 'Goal getter', earned: completedGoals >= 2 },
    { label: 'Consistent 7', earned: streak >= 7 },
    { label: 'Thirty-day focus', earned: streak >= 30 },
  ];

  const updateSelectedRecord = (update: Partial<DayRecord>) => {
    setData((previous) => ({
      ...previous,
      daysByProfile: {
        ...previous.daysByProfile,
        [activeProfile.id]: {
          ...(previous.daysByProfile[activeProfile.id] ?? {}),
          [selectedDay]: { ...(previous.daysByProfile[activeProfile.id]?.[selectedDay] ?? {}), ...update },
        },
      },
    }));
  };

  const addProfile = () => {
    const name = newProfileName.trim();
    if (!name) return;
    const profile = { id: crypto.randomUUID(), name, group: newProfileGroup };
    setData((previous) => ({ ...previous, profiles: [...previous.profiles, profile], activeProfileId: profile.id }));
    setNewProfileName('');
  };

  const addTask = () => {
    const title = newTaskTitle.trim();
    if (!title || newTaskDays.length === 0) return;
    const task: CustomTask = { id: crypto.randomUUID(), title, target: Math.max(1, newTaskTarget), days: [...newTaskDays].sort() };
    setData((previous) => ({
      ...previous,
      tasksByProfile: { ...previous.tasksByProfile, [activeProfile.id]: [...profileTasks, task] },
    }));
    setNewTaskTitle('');
    setNewTaskTarget(1);
  };

  const updateActiveProfile = (update: Partial<Pick<Profile, 'name' | 'group'>>) => {
    setData((previous) => ({
      ...previous,
      profiles: previous.profiles.map((profile) => profile.id === activeProfile.id ? { ...profile, ...update } : profile),
    }));
  };

  const deleteActiveProfile = () => {
    if (data.profiles.length <= 1) {
      setNotice('Keep at least one profile.');
      return;
    }
    if (!window.confirm(`Delete ${activeProfile.name} and all of this profile's local history?`)) return;
    setData((previous) => {
      const profiles = previous.profiles.filter((profile) => profile.id !== activeProfile.id);
      const tasksByProfile = { ...previous.tasksByProfile };
      const daysByProfile = { ...previous.daysByProfile };
      delete tasksByProfile[activeProfile.id];
      delete daysByProfile[activeProfile.id];
      return { ...previous, profiles, tasksByProfile, daysByProfile, activeProfileId: profiles[0].id };
    });
    setNotice('Profile deleted.');
  };

  const exportBackup = () => {
    downloadFile(`progress-tracker-backup-${dateKey(new Date())}.json`, JSON.stringify(data, null, 2), 'application/json');
    setNotice('Backup downloaded.');
  };

  const exportCsv = () => {
    const header = ['date', 'profile', 'group', 'durood', 'zikr', 'quran_pages', 'juz', 'reflection'];
    const rows = Object.entries(profileDays).sort(([first], [second]) => first.localeCompare(second)).map(([day, record]) => {
      const values = [day, activeProfile.name, activeProfile.group, record.metrics?.durood ?? 0, record.metrics?.zikr ?? 0, record.metrics?.pages ?? 0, record.metrics?.juz ?? 0, record.note ?? ''];
      return values.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',');
    });
    const filename = `${activeProfile.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-progress.csv`;
    downloadFile(filename, [header.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8');
    setNotice('Progress CSV downloaded.');
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isStoredData(parsed)) throw new Error('Invalid tracker backup');
      setData({ ...DEFAULT_DATA, ...parsed });
      setNotice('Backup restored successfully.');
    } catch {
      setNotice('This file is not a valid progress tracker backup.');
    }
  };

  const requestReminders = async () => {
    if (!('Notification' in window)) {
      setNotice('Notifications are not supported on this device.');
      return;
    }
    const permission = await Notification.requestPermission();
    const enabled = permission === 'granted';
    setData((previous) => ({ ...previous, remindersEnabled: enabled }));
    setNotice(enabled ? 'Daily reminder enabled while the app is open.' : 'Notification permission was not granted.');
  };

  if (!ready) return <div className="h-40 animate-pulse rounded-lg bg-slate-100" />;

  return (
    <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-[#0d4f4f]">My progress</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Habits, streaks, and reflections</h2>
          <p className="mt-1 text-sm text-slate-600">Personal tools for {activeProfile.name} ({activeProfile.group}).</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <select
            value={activeProfile.id}
            onChange={(event) => setData((previous) => ({ ...previous, activeProfileId: event.target.value }))}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold sm:w-auto"
            aria-label="Active progress profile"
          >
            {data.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.group}</option>)}
          </select>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${syncStatus === 'error' ? 'text-red-700' : 'text-slate-500'}`}>
            {syncStatus === 'local' && <CloudOff className="h-3.5 w-3.5" />}
            {(syncStatus === 'loading' || syncStatus === 'syncing') && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {syncStatus === 'synced' && <Cloud className="h-3.5 w-3.5 text-emerald-700" />}
            {syncStatus === 'error' && <CloudOff className="h-3.5 w-3.5" />}
            {syncStatus === 'local' ? 'Local only' : syncStatus === 'loading' ? 'Loading cloud data' : syncStatus === 'syncing' ? 'Syncing' : syncStatus === 'synced' ? 'Cloud synced' : 'Cloud sync failed'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-md bg-amber-50 p-3"><Flame className="h-5 w-5 text-amber-700" /><p className="mt-2 text-2xl font-black text-slate-900">{streak}</p><p className="text-xs text-slate-600">day streak</p></div>
        <div className="rounded-md bg-emerald-50 p-3"><Check className="h-5 w-5 text-emerald-700" /><p className="mt-2 text-2xl font-black text-slate-900">{completedGoals}/4</p><p className="text-xs text-slate-600">goals today</p></div>
        <div className="col-span-2 rounded-md border border-slate-200 p-3">
          <p className="text-xs font-bold text-slate-700">Last seven days</p>
          <div className="mt-3 flex h-14 items-end gap-2">
            {reportValues.map((value, index) => <div key={reportDays[index]} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t bg-[#0d4f4f]" style={{ height: `${Math.max(3, (value / maxReport) * 42)}px` }} title={`${value}%`} /><span className="text-[10px] text-slate-500">{new Date(`${reportDays[index]}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</span></div>)}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900">Custom scheduled tasks</h3>
          {dueTasks.length === 0 && <p className="text-sm text-slate-500">No custom tasks due for this date.</p>}
          {dueTasks.map((task) => {
            const count = selectedRecord.taskCounts?.[task.id] ?? 0;
            return <div key={task.id} className="flex items-center gap-2 rounded-md border border-slate-200 p-2"><button type="button" onClick={() => updateSelectedRecord({ taskCounts: { ...selectedRecord.taskCounts, [task.id]: count >= task.target ? 0 : count + 1 } })} className={`flex min-h-10 flex-1 items-center justify-between rounded px-3 text-left text-sm font-semibold ${count >= task.target ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-800'}`}><span>{task.title}</span><span>{count}/{task.target}</span></button><button type="button" title="Delete task" onClick={() => setData((previous) => ({ ...previous, tasksByProfile: { ...previous.tasksByProfile, [activeProfile.id]: profileTasks.filter((item) => item.id !== task.id) } }))} className="p-2 text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>;
          })}
          {profileTasks.some((task) => !task.days.includes(selectedWeekday)) && (
            <details className="rounded-md border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-sm font-bold text-slate-700">Manage tasks scheduled for other days</summary>
              <div className="mt-3 space-y-2">
                {profileTasks.filter((task) => !task.days.includes(selectedWeekday)).map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-3 rounded bg-slate-50 px-3 py-2 text-sm">
                    <span><span className="font-semibold text-slate-800">{task.title}</span><span className="ml-2 text-xs text-slate-500">Target {task.target}</span></span>
                    <button type="button" title="Delete task" onClick={() => setData((previous) => ({ ...previous, tasksByProfile: { ...previous.tasksByProfile, [activeProfile.id]: profileTasks.filter((item) => item.id !== task.id) } }))} className="p-2 text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </details>
          )}
          <div className="space-y-2 rounded-md bg-slate-50 p-3">
            <div className="flex flex-col gap-2 sm:flex-row"><input value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} placeholder="New task name" className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm" /><input type="number" min={1} value={newTaskTarget} onChange={(event) => setNewTaskTarget(Math.max(1, Number(event.target.value)))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm sm:w-20" aria-label="Task target" /><button type="button" onClick={addTask} className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Add</button></div>
            <div className="grid grid-cols-7 gap-1">{WEEKDAYS.map((day, index) => <button key={`${day}-${index}`} type="button" aria-pressed={newTaskDays.includes(index)} onClick={() => setNewTaskDays((days) => days.includes(index) ? days.filter((value) => value !== index) : [...days, index])} className={`h-8 rounded text-xs font-bold ${newTaskDays.includes(index) ? 'bg-[#0d4f4f] text-white' : 'bg-white text-slate-600'}`}>{day}</button>)}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-slate-900">Achievements</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">{achievements.map((achievement) => <div key={achievement.label} className={`flex items-center gap-2 rounded-md border p-2 text-xs font-bold ${achievement.earned ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-400'}`}><Star className="h-4 w-4" />{achievement.label}</div>)}</div>
          </div>
          <div>
            <label htmlFor="daily-reflection" className="font-bold text-slate-900">Daily reflection</label>
            <textarea id="daily-reflection" value={selectedRecord.note ?? ''} onChange={(event) => updateSelectedRecord({ note: event.target.value })} placeholder="What went well today?" rows={3} className="mt-2 w-full resize-y rounded-md border border-slate-200 bg-slate-50 p-3 text-sm" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-t border-slate-200 pt-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2 sm:flex-row"><input value={newProfileName} onChange={(event) => setNewProfileName(event.target.value)} placeholder="Add profile name" className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm" /><select value={newProfileGroup} onChange={(event) => setNewProfileGroup(event.target.value as 'Youth' | 'Adult')} className="rounded-md border border-slate-200 px-3 py-2 text-sm"><option>Youth</option><option>Adult</option></select><button type="button" onClick={addProfile} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0d4f4f] px-3 py-2 text-sm font-bold text-white"><UserRound className="h-4 w-4" /> Add profile</button></div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><input type="time" value={data.reminderTime} onChange={(event) => setData((previous) => ({ ...previous, reminderTime: event.target.value }))} className="rounded-md border border-slate-200 px-3 py-2 text-sm" aria-label="Daily reminder time" /><button type="button" onClick={requestReminders} className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold ${data.remindersEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}><Bell className="h-4 w-4" />{data.remindersEnabled ? 'Reminder enabled' : 'Enable reminder'}</button></div>
      </div>
      <div className="grid gap-4 border-t border-slate-200 pt-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900">Manage active profile</h3>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={activeProfile.name} onChange={(event) => updateActiveProfile({ name: event.target.value })} aria-label="Active profile name" className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm" />
            <select value={activeProfile.group} onChange={(event) => updateActiveProfile({ group: event.target.value as 'Youth' | 'Adult' })} aria-label="Active profile group" className="rounded-md border border-slate-200 px-3 py-2 text-sm"><option>Youth</option><option>Adult</option></select>
            <button type="button" onClick={deleteActiveProfile} disabled={data.profiles.length <= 1} className="inline-flex items-center justify-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" /> Delete</button>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900">Backup and export</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button type="button" onClick={exportBackup} className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800"><Download className="h-4 w-4" /> Backup</button>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800"><Upload className="h-4 w-4" /> Restore<input type="file" accept="application/json,.json" onChange={(event) => void importBackup(event.target.files?.[0])} className="sr-only" aria-label="Restore tracker backup" /></label>
            <button type="button" onClick={exportCsv} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0d4f4f] px-3 py-2 text-sm font-bold text-white"><Download className="h-4 w-4" /> CSV</button>
          </div>
        </div>
      </div>
      {notice && <p className="text-xs text-slate-500">{notice}</p>}
    </section>
  );
}