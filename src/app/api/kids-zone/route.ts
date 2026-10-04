import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

type ChildProfileInput = {
  nickname?: unknown;
  avatar?: unknown;
  leaderboardEnabled?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const allowedAvatars = new Set(['moon', 'star', 'book', 'headphones', 'mosque', 'flower']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  }

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user && !authData.user.is_anonymous ? authData.user : null;

  const { searchParams } = new URL(request.url);
  const childProfileId = searchParams.get('childProfileId');
  if (childProfileId && !uuidPattern.test(childProfileId)) {
    return NextResponse.json({ error: 'Invalid child profile ID.' }, { status: 400 });
  }
  const period = searchParams.get('period') || 'weekly';
  if (childProfileId && !user) {
    return NextResponse.json({ error: 'Sign in to view a child dashboard.' }, { status: 401 });
  }

  let children: unknown[] = [];
  let challenges: unknown[] = [];
  let challengeProgress: unknown[] = [];
  if (user) {
    const { error: challengeInitError } = await supabase.rpc('ensure_current_kids_challenges');
    if (challengeInitError) {
      console.error('Could not initialize current Kids Zone challenges.', challengeInitError);
      return NextResponse.json({ error: 'Could not load current challenges.' }, { status: 500 });
    }

    const { data, error: childrenError } = await supabase
      .from('kids_child_profiles')
      .select('id, nickname, avatar, leaderboard_enabled, created_at')
      .order('created_at', { ascending: true });
    if (childrenError) {
      console.error('Could not load Kids Zone child profiles.', childrenError);
      return NextResponse.json({ error: 'Could not load child profiles.' }, { status: 500 });
    }
    children = data || [];

    const today = new Date().toISOString().slice(0, 10);
    const { data: currentChallenges, error: challengesError } = await supabase
      .from('kids_challenges')
      .select('id, scope, title, description, metric, target, reward_points, starts_on, ends_on')
      .eq('active', true)
      .lte('starts_on', today)
      .gte('ends_on', today)
      .order('scope', { ascending: true });
    if (challengesError) {
      console.error('Could not load Kids Zone challenges.', challengesError);
      return NextResponse.json({ error: 'Could not load current challenges.' }, { status: 500 });
    }
    challenges = currentChallenges || [];
  }

  const [
    { data: globalLeaderboard, error: globalError },
    { data: quranLeaderboard, error: quranError },
    { data: listeningActivity, error: activityError },
  ] =
    await Promise.all([
      supabase.rpc('kids_global_leaderboard', { p_limit: 20 }),
      supabase.rpc('quran_listening_leaderboard', { p_period: period, p_limit: 20 }),
      supabase.rpc('quran_recent_listening_activity', { p_limit: 30 }),
    ]);
  if (globalError || quranError || activityError) {
    console.error('Could not load Kids Zone leaderboard data.', globalError || quranError || activityError);
    return NextResponse.json({ error: 'Could not load leaderboard data.' }, { status: 500 });
  }

  if (childProfileId && user) {
    const { data, error } = await supabase
      .from('kids_challenge_progress')
      .select('challenge_id, progress, completed_at')
      .eq('child_profile_id', childProfileId);
    if (error) {
      console.error('Could not load child challenge progress.', error);
      return NextResponse.json({ error: 'Could not load challenge progress.' }, { status: 500 });
    }
    challengeProgress = data || [];
  }

  let dashboard: unknown = null;
  if (childProfileId && user) {
    const { data, error } = await supabase.rpc('kids_child_dashboard', {
      p_child_profile_id: childProfileId,
    });
    if (error) {
      console.error('Could not load Kids Zone dashboard.', error);
      return NextResponse.json({ error: 'Could not load this child dashboard.' }, { status: 500 });
    }
    dashboard = data;
  }

  return NextResponse.json({
    children: children || [],
    dashboard,
    globalLeaderboard: globalLeaderboard || [],
    quranLeaderboard: quranLeaderboard || [],
    listeningActivity: listeningActivity || [],
    challenges: challenges || [],
    challengeProgress,
    requiresSignIn: !user,
  });
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || authData.user.is_anonymous) {
    return NextResponse.json({ error: 'Sign in to create a child profile.' }, { status: 401 });
  }

  let body: ChildProfileInput;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  if (nickname.length < 2 || nickname.length > 30) {
    return NextResponse.json({ error: 'Nickname must be between 2 and 30 characters.' }, { status: 400 });
  }
  const avatar = typeof body.avatar === 'string' && allowedAvatars.has(body.avatar) ? body.avatar : null;
  if (body.avatar != null && (typeof body.avatar !== 'string' || !allowedAvatars.has(body.avatar))) {
    return NextResponse.json({ error: 'Choose an available avatar.' }, { status: 400 });
  }
  const leaderboardEnabled = typeof body.leaderboardEnabled === 'boolean' ? body.leaderboardEnabled : true;

  const { data, error } = await supabase
    .from('kids_child_profiles')
    .insert({
      parent_user_id: authData.user.id,
      nickname,
      avatar,
      leaderboard_enabled: leaderboardEnabled,
    })
    .select('id, nickname, avatar, leaderboard_enabled, created_at')
    .single();
  if (error) {
    console.error('Could not create a Kids Zone child profile.', error);
    return NextResponse.json({ error: 'Could not create the child profile.' }, { status: 500 });
  }

  return NextResponse.json({ child: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || authData.user.is_anonymous) {
    return NextResponse.json({ error: 'Sign in to update a child profile.' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const childProfileId = typeof body.childProfileId === 'string' ? body.childProfileId : '';
  if (!uuidPattern.test(childProfileId)) {
    return NextResponse.json({ error: 'A valid child profile ID is required.' }, { status: 400 });
  }

  const updates: { nickname?: string; avatar?: string | null; leaderboard_enabled?: boolean } = {};
  if (body.nickname !== undefined) {
    if (typeof body.nickname !== 'string' || body.nickname.trim().length < 2 || body.nickname.trim().length > 30) {
      return NextResponse.json({ error: 'Nickname must be between 2 and 30 characters.' }, { status: 400 });
    }
    updates.nickname = body.nickname.trim();
  }
  if (body.avatar !== undefined) {
    if (body.avatar !== null && (typeof body.avatar !== 'string' || !allowedAvatars.has(body.avatar))) {
      return NextResponse.json({ error: 'Avatar must be text or null.' }, { status: 400 });
    }
    updates.avatar = typeof body.avatar === 'string' ? body.avatar : null;
  }
  if (body.leaderboardEnabled !== undefined) {
    if (typeof body.leaderboardEnabled !== 'boolean') {
      return NextResponse.json({ error: 'Leaderboard setting must be true or false.' }, { status: 400 });
    }
    updates.leaderboard_enabled = body.leaderboardEnabled;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No profile changes were supplied.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('kids_child_profiles')
    .update(updates)
    .eq('id', childProfileId)
    .eq('parent_user_id', authData.user.id)
    .select('id, nickname, avatar, leaderboard_enabled, created_at')
    .single();
  if (error) {
    console.error('Could not update a Kids Zone child profile.', error);
    return NextResponse.json({ error: 'Could not update the child profile.' }, { status: 500 });
  }

  return NextResponse.json({ child: data });
}
