import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

// GET /api/quran-recordings/[id] - Get a specific recording
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('quran_recordings')
      .select(`
        *,
        reviewed_by:reviewed_by(id, email),
        comments:quran_recording_comments(*, user_id, comment, created_at, is_admin_comment)
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

    // Check if user owns this recording or is admin
    if (data.user_id !== user.id) {
      // Check if admin
      const { data: isAdmin } = await supabase.rpc('is_site_admin');
      if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    return NextResponse.json({ recording: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/quran-recordings/[id] - Delete a recording (only if pending)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the recording first to check ownership and status
    const { data: recording, error: fetchError } = await supabase
      .from('quran_recordings')
      .select('user_id, status, audio_path')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
      }
      console.error('Error fetching recording:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch recording' }, { status: 500 });
    }

    // Check permissions
    if (recording.user_id !== user.id) {
      // Check if admin
      const { data: isAdmin } = await supabase.rpc('is_site_admin');
      if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else {
      // User can only delete their own recordings if pending
      if (recording.status !== 'pending') {
        return NextResponse.json(
          { error: 'Cannot delete recording that has been reviewed' },
          { status: 403 }
        );
      }
    }

    // Delete the audio file from storage
    if (recording.audio_path) {
      const { error: storageError } = await supabase.storage
        .from('quran-recordings')
        .remove([recording.audio_path]);

      if (storageError) {
        console.error('Error deleting audio file:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete the recording from database
    const { error: deleteError } = await supabase
      .from('quran_recordings')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting recording:', deleteError);
      return NextResponse.json({ error: 'Failed to delete recording' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
