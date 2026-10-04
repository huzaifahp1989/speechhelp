import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getSupabaseServiceRoleClient } from '@/lib/supabaseServiceRole';
import { ensureAdminGateForRoute } from '@/lib/adminGate';

// GET /api/admin/quran-recordings - Admin list all recordings
export async function GET(request: Request) {
  try {
    const gate = await ensureAdminGateForRoute(request);
    if (gate) return gate;

    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = getSupabaseServiceRoleClient();
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Admin service is not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = adminSupabase
      .from('quran_recordings')
      .select(`
        *,
        comments:quran_recording_comments(count)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching recordings:', error);
      return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 });
    }

    const recordingRows = (data || []) as Array<Record<string, unknown> & { user_id: string }>;
    const userIds = [...new Set(recordingRows.map((recording) => recording.user_id))];
    const users = await Promise.all(
      userIds.map(async (userId) => {
        const { data: userData } = await adminSupabase.auth.admin.getUserById(userId);
        return [userId, userData.user] as const;
      })
    );
    const usersById = new Map(users);
    const recordings = recordingRows.map((recording) => ({
      ...recording,
      user: usersById.get(recording.user_id) || {
        id: recording.user_id,
        email: 'Unknown user',
      },
    }));

    return NextResponse.json({ recordings });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
