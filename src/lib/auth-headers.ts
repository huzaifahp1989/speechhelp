import { getSupabaseClient } from '@/lib/supabaseClient';

const PROJECT_REF = 'jlqrbbqsuksncrxjcmbc';
const DEFAULT_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;
const PRIMARY_STORAGE_KEY = DEFAULT_STORAGE_KEY;
const LEGACY_STORAGE_KEYS = Array.from(
  new Set(['supabase.auth.token', DEFAULT_STORAGE_KEY].filter(Boolean))
) as string[];

function safeGet(storage: Storage | null, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function readStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  const keys = Array.from(new Set([PRIMARY_STORAGE_KEY, ...LEGACY_STORAGE_KEYS]));
  const storages = [window.localStorage, window.sessionStorage];

  for (const storage of storages) {
    for (const key of keys) {
      const raw = safeGet(storage, key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as {
          access_token?: string;
          currentSession?: { access_token?: string };
        };
        const token = parsed?.access_token || parsed?.currentSession?.access_token;
        if (typeof token === 'string' && token.length > 0) return token;
      } catch {
        /* ignore malformed storage */
      }
    }
  }

  return null;
}

export function shouldAttemptAuthRefresh(
  status: number | undefined,
  hasStoredAccessToken: boolean,
  hasActiveSession: boolean
): boolean {
  return status === 401 && hasStoredAccessToken && hasActiveSession;
}

async function resolveAccessToken(timeoutMs = 2_500): Promise<string | null> {
  const stored = readStoredAccessToken();
  if (stored) return stored;

  try {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (result && typeof result === 'object' && 'data' in result) {
      const token = result.data.session?.access_token ?? null;
      if (token) return token;
    }
  } catch {
    /* fall through */
  }

  return readStoredAccessToken();
}

async function refreshSessionWithTimeout(timeoutMs = 3_000): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    const result = await Promise.race([
      supabase.auth.refreshSession(),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), timeoutMs)),
    ]);
    return result !== 'timeout';
  } catch {
    return false;
  }
}

export async function getAuthFetchHeaders(
  extra?: Record<string, string>
): Promise<Record<string, string>> {
  const token = await resolveAccessToken();
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type AuthJsonFetchOptions = RequestInit & {
  timeoutMs?: number;
};

export async function authJsonFetch(
  url: string,
  init: AuthJsonFetchOptions = {}
): Promise<Response> {
  const { timeoutMs = 25_000, ...fetchInit } = init;
  const headers = await getAuthFetchHeaders({
    'Content-Type': 'application/json',
    ...(fetchInit.headers as Record<string, string> | undefined),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response = await fetch(url, { ...fetchInit, headers, signal: controller.signal });

    const hasStoredAccessToken = Boolean(readStoredAccessToken());
    const supabase = getSupabaseClient();
    const hasActiveSession = Boolean(
      supabase && (await supabase.auth.getSession()).data.session?.access_token
    );
    if (shouldAttemptAuthRefresh(response.status, hasStoredAccessToken, hasActiveSession)) {
      try {
        const refreshed = await refreshSessionWithTimeout(3_000);
        if (refreshed) {
          const retryHeaders = await getAuthFetchHeaders({
            'Content-Type': 'application/json',
            ...(fetchInit.headers as Record<string, string> | undefined),
          });
          response = await fetch(url, { ...fetchInit, headers: retryHeaders, signal: controller.signal });
        }
      } catch {
        /* keep original 401 */
      }
    }

    return response;
  } finally {
    clearTimeout(timer);
  }
}
