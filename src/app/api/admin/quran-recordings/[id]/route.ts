import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getSupabaseServiceRoleClient } from '@/lib/supabaseServiceRole';
import { ensureAdminGateForRoute } from '@/lib/adminGate';

// GET /api/admin/quran-recordings/[id] - Admin get specific recording
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await ensureAdminGateForRoute(request);
    if (gate) return gate;

    const { id } = await params;
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

    const { data, error } = await adminSupabase
      .from('quran_recordings')
      .select(`
        *,
        comments:quran_recording_comments(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
      }
      console.error('Error fetching recording:', error);
      return NextResponse.json({ error: 'Failed to fetch recording' }, { status: 500 });
    }

    const recording = data as unknown as Record<string, unknown> & {
      user_id: string;
      reviewed_by: string | null;
      comments: Array<Record<string, unknown> & { user_id: string }>;
    };
    const userIds = [...new Set([
      recording.user_id,
      recording.reviewed_by,
      ...recording.comments.map((comment) => comment.user_id),
    ].filter((userId): userId is string => Boolean(userId)))];
    const users = await Promise.all(
      userIds.map(async (userId) => {
        const { data: userData } = await adminSupabase.auth.admin.getUserById(userId);
        return [userId, userData.user] as const;
      })
    );
    const usersById = new Map(users);

    return NextResponse.json({
      recording: {
        ...recording,
        user: usersById.get(recording.user_id) || {
          id: recording.user_id,
          email: 'Unknown user',
        },
        reviewed_by: recording.reviewed_by
          ? usersById.get(recording.reviewed_by) || null
          : null,
        comments: recording.comments.map((comment) => ({
          ...comment,
          user: usersById.get(comment.user_id) || {
            id: comment.user_id,
            email: 'Unknown user',
          },
        })),
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/quran-recordings/[id]/review - Submit review
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await ensureAdminGateForRoute(request);
    if (gate) return gate;

    const { id } = await params;
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
    
    const updateData: any = {
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (body.status) {
      const validStatuses = ['pending', 'reviewing', 'approved', 'needs_improvement'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: pending, reviewing, approved, needs_improvement' },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    if (body.admin_feedback !== undefined) {
      updateData.admin_feedback = body.admin_feedback;
    }

    if (body.admin_rating !== undefined) {
      const rating = parseInt(body.admin_rating);
      if (isNaN(rating) || rating < 1 || rating > 10) {
        return NextResponse.json(
          { error: 'Invalid rating. Must be between 1 and 10.' },
          { status: 400 }
        );
      }
      updateData.admin_rating = rating;
    }

    if (body.points_awarded !== undefined) {
      const points = parseInt(body.points_awarded);
      if (isNaN(points) || points < 0) {
        return NextResponse.json(
          { error: 'Invalid points. Must be >= 0.' },
          { status: 400 }
        );
      }
      updateData.points_awarded = points;
    }

    if (body.mistakes_count !== undefined) {
      const mistakes = parseInt(body.mistakes_count);
      if (!isNaN(mistakes) && mistakes >= 0) {
        updateData.mistakes_count = mistakes;
      }
    }

    if (body.mistakes_details !== undefined) {
      updateData.mistakes_details = body.mistakes_details;
    }

    // Supabase has no generated Database type in this project, so mutations infer `never`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recordingTable = adminSupabase.from('quran_recordings') as any;
    const { data, error } = await recordingTable
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating recording:', error);
      return NextResponse.json({ error: 'Failed to update recording' }, { status: 500 });
    }

    return NextResponse.json({ recording: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
