import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getSupabaseServiceRoleClient } from '@/lib/supabaseServiceRole';
import { ensureAdminGateForRoute } from '@/lib/adminGate';

// POST /api/admin/quran-recordings/comments - Add timestamped comment (admin/instructor)
export async function POST(request: Request) {
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

    const body = await request.json();
    const { recording_id, comment, audio_timestamp_seconds, is_admin_comment = true } = body || {};

    if (!recording_id || !comment || !comment.trim()) {
      return NextResponse.json(
        { error: 'recording_id and comment are required.' },
        { status: 400 }
      );
    }

    const insertPayload: any = {
      recording_id,
      user_id: user.id,
      comment: comment.trim(),
      is_admin_comment: !!is_admin_comment,
    };
    if (
      audio_timestamp_seconds !== undefined &&
      audio_timestamp_seconds !== null &&
      !isNaN(Number(audio_timestamp_seconds))
    ) {
      insertPayload.audio_timestamp_seconds = Number(audio_timestamp_seconds);
    }

    // Supabase has no generated Database type in this project, so mutations infer `never`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commentsTable = adminSupabase.from('quran_recording_comments') as any;
    const { data, error } = await commentsTable
      .insert(insertPayload)
      .select(`*, user:user_id(id, email)`)
      .single();

    if (error) {
      console.error('Insert comment error:', error);
      return NextResponse.json({ error: 'Failed to post comment.' }, { status: 500 });
    }

    // Fire a notification for the student (best-effort, non-blocking)
    try {
      await fetch(
        new URL('/api/notifications/triggers/review-comment', request.url).toString(),
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            recording_id,
            comment_id: data.id,
          }),
        }
      ).catch(() => null);
    } catch {
      // ignore
    }

    return NextResponse.json({ comment: data });
  } catch (e: any) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/admin/quran-recordings/comments?recording_id=xxx - List comments for recording
export async function GET(request: Request) {
  try {
    const gate = await ensureAdminGateForRoute(request, { verbose: false });
    if (gate) return gate;

    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminSupabase = getSupabaseServiceRoleClient();
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Admin service is not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const recording_id = searchParams.get('recording_id');
    if (!recording_id) {
      return NextResponse.json({ error: 'recording_id query required.' }, { status: 400 });
    }

    const { error: fetchErr } = await adminSupabase
      .from('quran_recordings')
      .select('id')
      .eq('id', recording_id)
      .single();
    if (fetchErr) return NextResponse.json({ error: 'Recording not found' }, { status: 404 });

    const { data, error } = await adminSupabase
      .from('quran_recording_comments')
      .select(`*, user:user_id(id, email, raw_user_meta_data)`)
      .eq('recording_id', recording_id)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: 'Failed to load comments.' }, { status: 500 });
    return NextResponse.json({ comments: data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
