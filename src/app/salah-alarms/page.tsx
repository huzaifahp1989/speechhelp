'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlarmClock,
  Bell,
  BellOff,
  Loader2,
  MapPin,
  Volume2,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { requestPushPermission, setOneSignalExternalUser } from '@/components/OneSignalProvider';
import { isOneSignalConfiguredClient } from '@/lib/oneSignalConfig';
import {
  DEFAULT_SALAH_PREFS,
  fetchSalahTimings,
  loadSalahPrefs,
  loadScheduledNotificationIds,
  playAdhanAlarm,
  SALAH_PRAYERS,
  saveSalahPrefs,
  saveScheduledNotificationIds,
  type SalahAlarmPrefs,
  type SalahPrayer,
  type SalahTimings,
} from '@/lib/salahTimes';

function SalahAlarmsInner() {
  const searchParams = useSearchParams();
  const [prefs, setPrefs] = useState<SalahAlarmPrefs>(DEFAULT_SALAH_PREFS);
  const [timings, setTimings] = useState<SalahTimings | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const refreshTimings = useCallback(async (p: SalahAlarmPrefs) => {
    try {
      const t = await fetchSalahTimings(p.lat, p.lng, p.method);
      setTimings(t);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const saved = loadSalahPrefs();
    setPrefs(saved);
    setMounted(true);
    void refreshTimings(saved);

    const supabase = getSupabaseClient();
    supabase?.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, [refreshTimings]);

  useEffect(() => {
    if (!mounted) return;
    if (searchParams.get('play') === '1') {
      void playAdhanAlarm();
    }
  }, [mounted, searchParams]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          ...prefs,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          cityLabel: 'My location',
        };
        setPrefs(next);
        saveSalahPrefs(next);
        void refreshTimings(next);
      },
      () => setError('Could not get location — allow location access.'),
      { enableHighAccuracy: false, timeout: 12000 }
    );
  };

  const updatePrefs = (patch: Partial<SalahAlarmPrefs>) => {
    const next = { ...prefs, ...patch, prayers: patch.prayers ? { ...prefs.prayers, ...patch.prayers } : prefs.prayers };
    setPrefs(next);
    saveSalahPrefs(next);
  };

  const togglePrayer = (prayer: SalahPrayer) => {
    updatePrefs({ prayers: { ...prefs.prayers, [prayer]: !prefs.prayers[prayer] } });
  };

  const enablePush = async () => {
    setError(null);
    if (!isOneSignalConfiguredClient()) {
      setError('OneSignal App ID is not set on this deploy.');
      return;
    }
    const ok = await requestPushPermission();
    setPushOn(ok.ok);
    if (!ok.ok) setError(ok.message);
    else setError(null);
    if (userId) await setOneSignalExternalUser(userId);
  };

  const saveAndSchedule = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      saveSalahPrefs(prefs);

      if (!prefs.enabled) {
        const cancelIds = loadScheduledNotificationIds();
        if (userId && cancelIds.length) {
          await fetch('/api/salah/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefs: { ...prefs, enabled: false }, cancelIds }),
          });
        }
        saveScheduledNotificationIds([]);
        setStatus('Salah alarms turned off.');
        return;
      }

      if (!userId) {
        setStatus(
          'Saved for this device (foreground alarms). Sign in + allow push for background OneSignal reminders.'
        );
        return;
      }

      if (isOneSignalConfiguredClient()) {
        await enablePush();
        await setOneSignalExternalUser(userId);
      }

      const cancelIds = loadScheduledNotificationIds();
      const res = await fetch('/api/salah/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefs, cancelIds }),
      });
      const data = (await res.json()) as {
        error?: string;
        scheduled?: { id: string }[];
      };
      if (!res.ok) throw new Error(data.error || 'Could not schedule');

      const ids = (data.scheduled || []).map((s) => s.id).filter(Boolean);
      saveScheduledNotificationIds(ids);
      setStatus(
        `Saved. ${ids.length} background salah reminder${ids.length === 1 ? '' : 's'} scheduled via OneSignal (next ~2 days).`
      );
      void refreshTimings(prefs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <AlarmClock className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Salah alarms</h1>
          <p className="mt-2 text-sm text-slate-600">
            Adhan audio when the site is open, plus OneSignal push when it runs in the background.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <label className="flex items-center justify-between gap-3">
            <span className="font-semibold text-slate-800">Enable salah alarms</span>
            <input
              type="checkbox"
              checked={prefs.enabled}
              onChange={(e) => updatePrefs({ enabled: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-emerald-600"
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <Volume2 className="h-4 w-4" />
              Play adhan / tone in app
            </span>
            <input
              type="checkbox"
              checked={prefs.playAdhan}
              onChange={(e) => updatePrefs({ playAdhan: e.target.checked })}
              className="h-5 w-5"
            />
          </label>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Location</span>
              <button
                type="button"
                onClick={useMyLocation}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
              >
                <MapPin className="h-3.5 w-3.5" />
                Use my location
              </button>
            </div>
            <input
              value={prefs.cityLabel}
              onChange={(e) => updatePrefs({ cityLabel: e.target.value })}
              className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="City label"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.0001"
                value={prefs.lat}
                onChange={(e) => updatePrefs({ lat: Number(e.target.value) })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Latitude"
              />
              <input
                type="number"
                step="0.0001"
                value={prefs.lng}
                onChange={(e) => updatePrefs({ lng: Number(e.target.value) })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Longitude"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Calculation method</label>
            <select
              value={prefs.method}
              onChange={(e) => {
                const method = Number(e.target.value);
                updatePrefs({ method });
                void refreshTimings({ ...prefs, method });
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value={3}>Muslim World League</option>
              <option value={2}>ISNA</option>
              <option value={4}>Umm Al-Qura (Makkah)</option>
              <option value={5}>Egyptian</option>
              <option value={1}>Karachi</option>
              <option value={13}>Diyanet</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Notify minutes before
            </label>
            <select
              value={prefs.minutesBefore}
              onChange={(e) => updatePrefs({ minutesBefore: Number(e.target.value) })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              {[0, 5, 10, 15, 20, 30].map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? 'At adhan time' : `${m} minutes before`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Prayers</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SALAH_PRAYERS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePrayer(p)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${
                    prefs.prayers[p]
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  {p}
                  {timings ? (
                    <span className="mt-0.5 block text-[11px] font-medium opacity-80">
                      {timings[p]?.replace(/\s*\(.*\)/, '')}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            {timings && (
              <p className="mt-2 text-center text-xs text-slate-400">Times for {timings.date}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void playAdhanAlarm()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Volume2 className="h-4 w-4" />
              Test sound
            </button>
            <button
              type="button"
              onClick={() => void enablePush()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {pushOn ? <Bell className="h-4 w-4 text-emerald-600" /> : <BellOff className="h-4 w-4" />}
              Allow push
            </button>
          </div>

          {!userId && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <Link href="/auth?redirect=/salah-alarms" className="font-bold underline">
                Sign in
              </Link>{' '}
              so OneSignal can deliver salah alarms while the browser is in the background.
            </p>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {status && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {status}
            </div>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void saveAndSchedule()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlarmClock className="h-4 w-4" />}
            Save & schedule background alarms
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          Optional: add <code className="font-mono">public/audio/adhan.mp3</code> for full adhan audio.
          Otherwise a built-in tone plays.
        </p>
      </div>
    </div>
  );
}

export default function SalahAlarmsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <SalahAlarmsInner />
    </Suspense>
  );
}
