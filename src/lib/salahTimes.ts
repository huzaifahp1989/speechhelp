export const SALAH_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type SalahPrayer = (typeof SALAH_PRAYERS)[number];

export type SalahTimings = Record<SalahPrayer, string> & {
  date: string;
  timezone?: string;
};

export type SalahAlarmPrefs = {
  enabled: boolean;
  lat: number;
  lng: number;
  cityLabel: string;
  /** Aladhan calculation method id (2 = ISNA, 3 = MWL, 4 = Makkah, …) */
  method: number;
  prayers: Record<SalahPrayer, boolean>;
  /** Minutes before adhan to notify (0 = at time) */
  minutesBefore: number;
  playAdhan: boolean;
};

export const DEFAULT_SALAH_PREFS: SalahAlarmPrefs = {
  enabled: false,
  lat: 51.5074,
  lng: -0.1278,
  cityLabel: 'London',
  method: 3,
  prayers: {
    Fajr: true,
    Dhuhr: true,
    Asr: true,
    Maghrib: true,
    Isha: true,
  },
  minutesBefore: 0,
  playAdhan: true,
};

const PREFS_KEY = 'speechhelp_salah_alarms_v1';
const SCHEDULE_IDS_KEY = 'speechhelp_salah_onesignal_ids_v1';

export function loadSalahPrefs(): SalahAlarmPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_SALAH_PREFS, prayers: { ...DEFAULT_SALAH_PREFS.prayers } };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_SALAH_PREFS, prayers: { ...DEFAULT_SALAH_PREFS.prayers } };
    const parsed = JSON.parse(raw) as Partial<SalahAlarmPrefs>;
    return {
      ...DEFAULT_SALAH_PREFS,
      ...parsed,
      prayers: { ...DEFAULT_SALAH_PREFS.prayers, ...(parsed.prayers || {}) },
    };
  } catch {
    return { ...DEFAULT_SALAH_PREFS, prayers: { ...DEFAULT_SALAH_PREFS.prayers } };
  }
}

export function saveSalahPrefs(prefs: SalahAlarmPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function loadScheduledNotificationIds(): string[] {
  try {
    const raw = localStorage.getItem(SCHEDULE_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function saveScheduledNotificationIds(ids: string[]) {
  try {
    localStorage.setItem(SCHEDULE_IDS_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

/** Parse "HH:mm" or "HH:mm (…)" from Aladhan into today/tomorrow Date in local TZ. */
export function prayerTimeToDate(timeStr: string, dayOffset = 0, now = new Date()): Date {
  const clean = timeStr.replace(/\s*\(.*\)\s*/g, '').trim();
  const [h, m] = clean.split(':').map((n) => Number(n));
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, h || 0, m || 0, 0, 0);
  return d;
}

export async function fetchSalahTimings(
  lat: number,
  lng: number,
  method: number,
  date = new Date()
): Promise<SalahTimings> {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const url = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=${method}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not load prayer times');
  const json = (await res.json()) as {
    data?: {
      timings?: Record<string, string>;
      date?: { readable?: string };
      meta?: { timezone?: string };
    };
  };
  const t = json.data?.timings;
  if (!t) throw new Error('Invalid prayer times response');

  return {
    Fajr: t.Fajr,
    Dhuhr: t.Dhuhr,
    Asr: t.Asr,
    Maghrib: t.Maghrib,
    Isha: t.Isha,
    date: json.data?.date?.readable || `${dd}-${mm}-${yyyy}`,
    timezone: json.data?.meta?.timezone,
  };
}

export type UpcomingSalah = {
  prayer: SalahPrayer;
  at: Date;
  label: string;
};

export function listUpcomingSalah(
  today: SalahTimings,
  tomorrow: SalahTimings,
  prefs: SalahAlarmPrefs,
  now = new Date()
): UpcomingSalah[] {
  const out: UpcomingSalah[] = [];
  for (const prayer of SALAH_PRAYERS) {
    if (!prefs.prayers[prayer]) continue;
    for (const [timings, offset] of [
      [today, 0],
      [tomorrow, 1],
    ] as const) {
      const at = prayerTimeToDate(timings[prayer], offset, now);
      const notifyAt = new Date(at.getTime() - prefs.minutesBefore * 60_000);
      if (notifyAt.getTime() <= now.getTime() + 30_000) continue;
      out.push({
        prayer,
        at: notifyAt,
        label: prefs.minutesBefore > 0 ? `${prayer} in ${prefs.minutesBefore} min` : prayer,
      });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Play built-in alarm tone, or /audio/adhan.mp3 if present. */
export async function playAdhanAlarm(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const audio = new Audio('/audio/adhan.mp3');
    audio.volume = 0.9;
    await audio.play();
    return;
  } catch {
    /* fall through to synthesized tone */
  }

  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const now = ctx.currentTime;
  const notes = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.35 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.35 + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.35);
    osc.stop(now + i * 0.35 + 0.34);
  });

  window.setTimeout(() => void ctx.close(), 3200);
}
