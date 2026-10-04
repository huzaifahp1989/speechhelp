import { getSupabaseClient } from '@/lib/supabaseClient';
import { recordRevisionStreak } from '@/lib/hifzStats';

export const HIFZ_SESSIONS_UPDATED = 'speechhelp:hifz-sessions-updated';

export type HifzSessionType = 'recited' | 'memorized_new' | 'tajweed_listening';

export type HifzSessionLog = {
  id: string;
  day: string;
  session_type: HifzSessionType;
  minutes: number;
  ayat_count: number | null;
  coverage_text: string | null;
  notes: string | null;
  created_at: string;
  owner_id: string | null;
  synced: boolean;
};

type HifzSessionInput = {
  session_type: HifzSessionType;
  minutes: number;
  ayat_count?: number;
  coverage_text?: string;
  notes?: string;
};

const STORAGE_KEY = 'speechhelp_hifz_sessions_v1';

function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
}

function readLocalSessions(): HifzSessionLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? (parsed as HifzSessionLog[]) : [];
  } catch {
    return [];
  }
}

function writeLocalSessions(sessions: HifzSessionLog[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 300)));
  window.dispatchEvent(new Event(HIFZ_SESSIONS_UPDATED));
}

export async function recordHifzSession(input: HifzSessionInput): Promise<'synced' | 'local'> {
  const createdAt = new Date().toISOString();
  const session: HifzSessionLog = {
    id: createId(),
    day: localDayKey(new Date(createdAt)),
    session_type: input.session_type,
    minutes: Math.min(1440, Math.max(1, Math.ceil(input.minutes))),
    ayat_count: input.ayat_count ?? null,
    coverage_text: input.coverage_text ?? null,
    notes: input.notes ?? null,
    created_at: createdAt,
    owner_id: null,
    synced: false,
  };

  const localSessions = readLocalSessions();
  writeLocalSessions([session, ...localSessions]);
  recordRevisionStreak();

  const supabase = getSupabaseClient();
  if (!supabase) return 'local';

  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession?.user) return 'local';

    session.owner_id = authSession.user.id;
    writeLocalSessions([session, ...localSessions]);

    const { error } = await supabase.from('quran_manual_practice_logs').insert({
      id: session.id,
      user_id: authSession.user.id,
      day: session.day,
      session_type: session.session_type,
      minutes: session.minutes,
      ayat_count: session.ayat_count,
      coverage_text: session.coverage_text,
      notes: session.notes,
    });

    if (error) return 'local';

    session.synced = true;
    writeLocalSessions([session, ...localSessions]);
    return 'synced';
  } catch {
    return 'local';
  }
}

export async function syncPendingHifzSessions(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const localSessions = readLocalSessions();
    const pending = localSessions.filter((item) => !item.synced && item.owner_id === session.user.id);
    if (pending.length === 0) return;

    const syncedIds = new Set<string>();
    for (const item of pending) {
      const { error } = await supabase.from('quran_manual_practice_logs').upsert({
        id: item.id,
        user_id: session.user.id,
        day: item.day,
        session_type: item.session_type,
        minutes: item.minutes,
        ayat_count: item.ayat_count,
        coverage_text: item.coverage_text,
        notes: item.notes,
        created_at: item.created_at,
      }, { onConflict: 'id', ignoreDuplicates: true });
      if (!error) syncedIds.add(item.id);
    }

    if (syncedIds.size > 0) {
      writeLocalSessions(localSessions.map((item) =>
        syncedIds.has(item.id) ? { ...item, synced: true } : item,
      ));
    }
  } catch {
    return;
  }
}

export async function getHifzSessionHistory(): Promise<HifzSessionLog[]> {
  const localSessions = readLocalSessions();
  const supabase = getSupabaseClient();
  if (!supabase) return localSessions.filter((item) => item.owner_id === null);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return localSessions.filter((item) => item.owner_id === null);

    const { data, error } = await supabase
      .from('quran_manual_practice_logs')
      .select('id, day, session_type, minutes, ayat_count, coverage_text, notes, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) {
      return localSessions.filter((item) => item.owner_id === session.user.id);
    }

    const cloudSessions: HifzSessionLog[] = data.map((row) => ({
      id: row.id,
      day: row.day,
      session_type: row.session_type as HifzSessionType,
      minutes: row.minutes,
      ayat_count: row.ayat_count,
      coverage_text: row.coverage_text,
      notes: row.notes,
      created_at: row.created_at,
      owner_id: session.user.id,
      synced: true,
    }));
    const visibleLocal = localSessions.filter((item) => item.owner_id === session.user.id);
    const merged = new Map<string, HifzSessionLog>();
    for (const item of visibleLocal) merged.set(item.id, item);
    for (const item of cloudSessions) merged.set(item.id, item);
    return [...merged.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch {
    return localSessions.filter((item) => item.owner_id === null);
  }
}