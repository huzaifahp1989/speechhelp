import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { getFirebaseAnalytics } from '@/lib/firebase';

type EventParams = Record<string, string | number | boolean | undefined | null>;

function sanitizeParams(params?: EventParams): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Log a custom Analytics event (no-ops on SSR / if Analytics unavailable). */
export async function trackEvent(name: string, params?: EventParams): Promise<void> {
  try {
    const analytics = await getFirebaseAnalytics();
    if (!analytics) return;
    logEvent(analytics, name, sanitizeParams(params));
  } catch {
    /* ignore analytics failures */
  }
}

/** Track SPA page views on every route change. */
export async function trackPageView(pathname: string, search?: string): Promise<void> {
  const pagePath = search ? `${pathname}${search}` : pathname;
  await trackEvent('page_view', {
    page_path: pagePath,
    page_location: typeof window !== 'undefined' ? window.location.href : pagePath,
    page_title: typeof document !== 'undefined' ? document.title : pathname,
  });
}

export async function trackUserId(userId: string | null): Promise<void> {
  try {
    const analytics = await getFirebaseAnalytics();
    if (!analytics) return;
    setUserId(analytics, userId);
  } catch {
    /* ignore */
  }
}

export async function trackUserProperties(
  props: Record<string, string | undefined | null>
): Promise<void> {
  try {
    const analytics = await getFirebaseAnalytics();
    if (!analytics) return;
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(props)) {
      if (v) cleaned[k] = v;
    }
    if (Object.keys(cleaned).length) setUserProperties(analytics, cleaned);
  } catch {
    /* ignore */
  }
}

/** Named helpers for common product actions */
export const AnalyticsEvents = {
  navClick: (href: string, label: string) =>
    trackEvent('nav_click', { link_url: href, link_text: label }),
  search: (query: string, source: string) =>
    trackEvent('search', { search_term: query.slice(0, 100), source }),
  ayahPlay: (verseKey: string, source: string) =>
    trackEvent('ayah_play', { verse_key: verseKey, source }),
  surahOpen: (surahId: number | string) =>
    trackEvent('surah_open', { surah_id: String(surahId) }),
  juzOpen: (juzId: number | string) =>
    trackEvent('juz_open', { juz_id: String(juzId) }),
  mistakeCheckToggle: (enabled: boolean, verseKey?: string | null) =>
    trackEvent('mistake_check_toggle', {
      enabled,
      verse_key: verseKey ?? undefined,
    }),
  mistakeDetected: (verseKey: string, wordCount: number) =>
    trackEvent('mistake_detected', { verse_key: verseKey, word_count: wordCount }),
  voiceSearch: (lang: string) => trackEvent('voice_search_start', { language: lang }),
  hifzRecord: (verseKey: string) => trackEvent('hifz_record', { verse_key: verseKey }),
  auth: (action: 'login' | 'signup' | 'logout') => trackEvent('auth_action', { action }),
  featureClick: (feature: string, detail?: string) =>
    trackEvent('feature_click', { feature, detail }),
} as const;
