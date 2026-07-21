'use client';

import { useEffect, useRef } from 'react';
import {
  listUpcomingSalah,
  loadSalahPrefs,
  playAdhanAlarm,
  fetchSalahTimings,
  type UpcomingSalah,
} from '@/lib/salahTimes';

/**
 * Foreground salah alarms — plays adhan / tone while the site is open.
 * Background delivery is handled by OneSignal scheduled pushes.
 */
export default function SalahAlarmRunner() {
  const timersRef = useRef<number[]>([]);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const clearTimers = () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };

    const schedule = async () => {
      clearTimers();
      const prefs = loadSalahPrefs();
      if (!prefs.enabled || !prefs.playAdhan) return;

      try {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const [today, next] = await Promise.all([
          fetchSalahTimings(prefs.lat, prefs.lng, prefs.method, now),
          fetchSalahTimings(prefs.lat, prefs.lng, prefs.method, tomorrow),
        ]);
        if (cancelled) return;

        const upcoming: UpcomingSalah[] = listUpcomingSalah(today, next, prefs, now).slice(0, 6);
        for (const item of upcoming) {
          const key = `${item.prayer}-${item.at.toISOString()}`;
          if (firedRef.current.has(key)) continue;
          const delay = item.at.getTime() - Date.now();
          if (delay <= 0 || delay > 36 * 60 * 60 * 1000) continue;

          const timer = window.setTimeout(() => {
            firedRef.current.add(key);
            void playAdhanAlarm();
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                new Notification(`${item.label} · SpeechHelp`, {
                  body: `Time for ${item.prayer}`,
                  icon: '/globe.svg',
                });
              } catch {
                /* ignore */
              }
            }
          }, delay);
          timersRef.current.push(timer);
        }
      } catch {
        /* network */
      }
    };

    void schedule();
    const refresh = window.setInterval(() => void schedule(), 15 * 60 * 1000);

    return () => {
      cancelled = true;
      clearTimers();
      window.clearInterval(refresh);
    };
  }, []);

  return null;
}
