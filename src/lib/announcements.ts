import type { SiteAnnouncement } from '@/types/announcement';

export const ANNOUNCEMENT_PAGE_PRESETS: { id: string; label: string }[] = [
  { id: '*', label: 'All pages' },
  { id: '/', label: 'Home' },
  { id: '/quran', label: 'Quran index' },
  { id: '/quran/juz', label: 'Juz reader' },
  { id: '/hifz-planner', label: 'Hifz planner' },
  { id: '/tracker', label: 'Tracker' },
  { id: '/tasbeeh', label: 'Tasbeeh' },
  { id: '/auth', label: 'Auth' },
];

const DISMISS_PREFIX = 'speechhelp_announcement_dismissed_';

/** Match pathname against target rules (* = all, prefix, or exact). */
export function announcementMatchesPath(pathname: string, targets: string[]): boolean {
  if (!targets?.length || targets.includes('*')) return true;
  const path = pathname.split('?')[0] || '/';
  return targets.some((target) => {
    const t = target.trim();
    if (!t || t === '*') return true;
    if (t.endsWith('*')) {
      const prefix = t.slice(0, -1);
      return path === prefix || path.startsWith(prefix);
    }
    if (t.endsWith('/')) return path.startsWith(t) || path === t.slice(0, -1);
    return path === t || path.startsWith(`${t}/`);
  });
}

export function isAnnouncementScheduled(announcement: SiteAnnouncement, now = new Date()): boolean {
  if (!announcement.is_active) return false;
  const start = new Date(announcement.starts_at);
  if (Number.isNaN(start.getTime()) || start > now) return false;
  if (announcement.ends_at) {
    const end = new Date(announcement.ends_at);
    if (!Number.isNaN(end.getTime()) && end < now) return false;
  }
  return true;
}

export function pickAnnouncementForPath(
  announcements: SiteAnnouncement[],
  pathname: string,
  now = new Date()
): SiteAnnouncement | null {
  const eligible = announcements
    .filter((a) => isAnnouncementScheduled(a, now))
    .filter((a) => announcementMatchesPath(pathname, a.target_pages))
    .filter((a) => !a.show_once || !isAnnouncementDismissed(a.id))
    .sort((a, b) => b.priority - a.priority || b.starts_at.localeCompare(a.starts_at));

  return eligible[0] ?? null;
}

export function isAnnouncementDismissed(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(`${DISMISS_PREFIX}${id}`) === '1';
  } catch {
    return false;
  }
}

export function dismissAnnouncement(id: string): void {
  try {
    localStorage.setItem(`${DISMISS_PREFIX}${id}`, '1');
  } catch {
    /* ignore */
  }
}

/** datetime-local value → ISO for Supabase */
export function localInputToIso(value: string): string | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO → datetime-local for form inputs */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatScheduleLabel(announcement: SiteAnnouncement): string {
  const start = new Date(announcement.starts_at);
  const end = announcement.ends_at ? new Date(announcement.ends_at) : null;
  const fmt = (d: Date) =>
    d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  if (end) return `${fmt(start)} → ${fmt(end)}`;
  return `From ${fmt(start)}`;
}
