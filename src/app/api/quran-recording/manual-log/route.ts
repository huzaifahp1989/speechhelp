import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

type SessionType = 'recited' | 'memorized_new' | 'tajweed_listening';

const VALID_SESSION_TYPES: SessionType[] = [
  'recited',
  'memorized_new',
  'tajweed_listening',
];

function ymdFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function validateDay(dayRaw: unknown): string | null {
  if (!dayRaw || typeof dayRaw !== 'string') return null;
  const t = new Date(dayRaw + 'T00:00:00Z');
  if (Number.isNaN(t.getTime())) return null;
  return ymdFromDate(new Date(dayRaw));
}

function weekKeyFromYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // Monday = 0
  dt.setUTCDate(dt.getUTCDate() - dow);
  return ymdFromDate(new Date(dt.getTime() - dt.getTimezoneOffset() * 60_000));
}

function monthKeyFromYmd(ymd: string): string {
  return ymd.slice(0, 7); // YYYY-MM
}

// GET /api/quran-recording/manual-log?days=30 — fetch own manual logs
export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const days = Math.max(1, Math.min(365, Number(searchParams.get('days') || '45')));
    const since = new Date(Date.now() - days * 86_400_000);
    const sinceYmd = ymdFromDate(since);

    const { data, error } = await supabase
      .from('quran_manual_practice_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('day', sinceYmd)
      .order('day', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      // Graceful fallback in case the table migration hasn't been applied yet.
      if ((error as any)?.code === '42P01') {
        return NextResponse.json({ manualLogs: [], migrationMissing: true });
      }
      console.error('[manual-log GET]', error);
      return NextResponse.json({ error: 'Failed to fetch manual logs' }, { status: 500 });
    }

    return NextResponse.json({ manualLogs: data || [] });
  } catch (err) {
    console.error('[manual-log GET unexpected]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/quran-recording/manual-log — create a manual practice entry
export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

    const minutesRaw = Number(body.minutes);
    const minutes = Math.max(1, Math.min(1440, Math.floor(minutesRaw)));
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return NextResponse.json({ error: 'Minutes must be a positive number' }, { status: 400 });
    }

    let sessionType: SessionType = 'recited';
    if (typeof body.sessionType === 'string' && VALID_SESSION_TYPES.includes(body.sessionType as any)) {
      sessionType = body.sessionType as SessionType;
    }

    const day = validateDay(body.day) ?? ymdFromDate(new Date());
    const ayatCount =
      typeof body.ayatCount === 'number' && Number.isFinite(body.ayatCount) && body.ayatCount > 0
        ? Math.max(1, Math.floor(body.ayatCount))
        : null;

    const coverageText = typeof body.coverageText === 'string' ? body.coverageText.trim().slice(0, 300) : null;
    const notes = typeof body.notes === 'string' ? body.notes.slice(0, 500) : null;
    const tajweedFocus = typeof body.tajweedFocus === 'string' ? body.tajweedFocus.slice(0, 200) : null;
    const goalMinutes =
      typeof body.goalMinutes === 'number' && Number.isFinite(body.goalMinutes) && body.goalMinutes > 0
        ? Math.max(5, Math.floor(body.goalMinutes))
        : null;

    // 1) Insert manual log (best-effort — skip gracefully if migration not applied)
    let inserted: any = null;
    try {
      const { data: ins, error: insErr } = await supabase
        .from('quran_manual_practice_logs')
        .insert({
          user_id: user.id,
          day,
          session_type: sessionType,
          minutes,
          ayat_count: ayatCount,
          coverage_text: coverageText,
          notes,
          tajweed_focus: tajweedFocus,
        })
        .select()
        .maybeSingle();
      if (!insErr) inserted = ins;
    } catch {
      /* ignore */
    }

    // 2) Upsert user_daily_activity (sum with existing manual minutes for the same day).
    //    We read current count first then upsert to make multi-log stacking deterministic.
    const ACTIVITY_KEY = 'quran_recitation_manual';
    try {
      const existing = await supabase
        .from('user_daily_activity')
        .select('count,goal')
        .eq('user_id', user.id)
        .eq('day', day)
        .eq('activity', ACTIVITY_KEY)
        .maybeSingle();
      const currentCount = (existing && existing.data && Number(existing.data.count)) || 0;
      const currentGoalExisting = (existing && existing.data && Number(existing.data.goal)) || null;
      const nextCount = Math.max(0, Math.floor(currentCount + minutes));
      const nextGoal = goalMinutes ?? currentGoalExisting ?? null;
      const completed = nextGoal ? nextCount >= nextGoal : undefined;
      const payload: Record<string, any> = {
        user_id: user.id,
        day,
        activity: ACTIVITY_KEY,
        count: nextCount,
      };
      if (nextGoal) payload.goal = nextGoal;
      if (typeof completed === 'boolean') payload.completed = completed;
      if (completed) payload.completed_at = new Date().toISOString();
      await supabase.from('user_daily_activity').upsert(payload, {
        onConflict: 'user_id,day,activity',
      });
    } catch {
      /* ignore — the core manual log insert already succeeded */
    }

    // 3) Upsert user_weekly_activity + user_monthly_activity for aggregates/streaks charts.
    try {
      const weekKey = weekKeyFromYmd(day);
      const monthKey = monthKeyFromYmd(day);
      void supabase.from('user_weekly_activity').upsert(
        {
          user_id: user.id,
          week: weekKey,
          activity: ACTIVITY_KEY,
          count: minutes,
        },
        { onConflict: 'user_id,week,activity', ignoreDuplicates: false } as any
      );
      void supabase.from('user_monthly_activity').upsert(
        {
          user_id: user.id,
          month: monthKey,
          activity: ACTIVITY_KEY,
          count: minutes,
        },
        { onConflict: 'user_id,month,activity', ignoreDuplicates: false } as any
      );
    } catch {
      /* ignore */
    }

    // 4) user_daily_quran — convert ayat → ceiling(ayat / 20) pages to aggregate.
    if (ayatCount && ayatCount > 0) {
      try {
        const pagesInc = Math.max(1, Math.ceil(ayatCount / 20));
        const cur = await supabase
          .from('user_daily_quran')
          .select('pages')
          .eq('user_id', user.id)
          .eq('day', day)
          .maybeSingle();
        const curPages = (cur && cur.data && Number(cur.data.pages)) || 0;
        const nextPages = Math.max(0, Math.floor(curPages + pagesInc));
        await supabase
          .from('user_daily_quran')
          .upsert({ user_id: user.id, day, pages: nextPages }, { onConflict: 'user_id,day' });
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json({ success: true, log: inserted, day, minutes, sessionType });
  } catch (err) {
    console.error('[manual-log POST unexpected]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
