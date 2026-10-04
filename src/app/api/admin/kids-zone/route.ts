import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

const settingRanges = {
  points_per_listening_minute: [0, 100],
  daily_point_cap: [0, 10000],
  daily_streak_minutes: [1, 1440],
  daily_listening_goal_minutes: [1, 1440],
  surah_completion_points: [0, 10000],
  juz_completion_points: [0, 10000],
  reciter_bonus_points: [0, 10000],
  min_listening_seconds: [1, 3600],
  weekly_listening_target_minutes: [1, 10000],
  weekly_challenge_reward_points: [0, 10000],
  daily_listening_10_minute_reward_points: [0, 10000],
  daily_listening_30_minute_reward_points: [0, 10000],
  daily_surah_completion_reward_points: [0, 10000],
  streak_reward_points: [0, 10000],
  badge_reward_points: [0, 10000],
} as const;

type SettingsKey = keyof typeof settingRanges;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getAdminClient() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { supabase: null, response: NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 }) };
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { supabase: null, response: NextResponse.json({ error: 'Sign in to manage Kids Zone settings.' }, { status: 401 }) };
  }
  const { data: isAdmin, error: adminError } = await supabase.rpc('is_site_admin');
  if (adminError) {
    console.error('Could not verify Kids Zone administrator access.', adminError);
    return { supabase: null, response: NextResponse.json({ error: 'Could not verify administrator access.' }, { status: 500 }) };
  }
  if (!isAdmin) {
    return { supabase: null, response: NextResponse.json({ error: 'Administrator access required.' }, { status: 403 }) };
  }
  return { supabase, response: null };
}

export async function GET(request: Request) {
  const { supabase, response } = await getAdminClient();
  if (!supabase) return response;

  const childProfileId = new URL(request.url).searchParams.get('childProfileId');
  const [{ data: settings, error: settingsError }, { data: analytics, error: analyticsError }, { data: children, error: childrenError }] =
    await Promise.all([
      supabase.from('kids_zone_settings').select('*').eq('singleton', true).single(),
      supabase.rpc('kids_zone_admin_analytics', {
        p_child_profile_id: childProfileId || null,
      }),
      supabase.from('kids_child_profiles').select('id, nickname').order('nickname'),
    ]);
  const error = settingsError || analyticsError || childrenError;
  if (error) {
    console.error('Could not load Kids Zone admin analytics.', error);
    return NextResponse.json({ error: 'Could not load Kids Zone analytics.' }, { status: 500 });
  }

  return NextResponse.json({ settings, analytics, children: children || [] });
}

export async function PATCH(request: Request) {
  const { supabase, response } = await getAdminClient();
  if (!supabase) return response;

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const updates: Partial<Record<SettingsKey, number>> = {};
  for (const key of Object.keys(settingRanges) as SettingsKey[]) {
    if (!(key in body)) continue;
    const value = body[key];
    const [min, max] = settingRanges[key];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
      return NextResponse.json({ error: `Invalid value for ${key}.` }, { status: 400 });
    }
    updates[key] = value;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid settings were supplied.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('kids_zone_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('singleton', true)
    .select('*')
    .single();
  if (error) {
    console.error('Could not update Kids Zone settings.', error);
    return NextResponse.json({ error: 'Could not save settings.' }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
