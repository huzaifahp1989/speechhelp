import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

// GET /api/quran-recordings - List user's recordings
export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('quran_recordings')
      .select(`
        *,
        reviewed_by:reviewed_by(id, email),
        comments:quran_recording_comments(count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching recordings:', error);
      return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 });
    }

    return NextResponse.json({ recordings: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/quran-recordings - Create new recording entry
export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.audio_url || !body.audio_path) {
      return NextResponse.json(
        { error: 'Missing required fields: title, audio_url, audio_path' },
        { status: 400 }
      );
    }

    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      title: body.title,
      description: body.description,
      surah_from: body.surah_from,
      ayah_from: body.ayah_from,
      surah_to: body.surah_to,
      ayah_to: body.ayah_to,
      audio_url: body.audio_url,
      audio_path: body.audio_path,
      duration_seconds: body.duration_seconds,
      file_size_bytes: body.file_size_bytes,
    };
    // Optional fields — only add if truthy (or explicit null for juz since 0 is not valid)
    if (body.juz != null) insertPayload.juz = body.juz;
    if (body.mistakes_details != null) insertPayload.mistakes_details = body.mistakes_details;

    const { data, error } = await supabase
      .from('quran_recordings')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error creating recording:', error);
      if (error.code === 'PGRST205') {
        return NextResponse.json(
          {
            error: 'Quran recording storage is not set up yet. Apply supabase/schema_recording.sql to this Supabase project.',
            code: error.code,
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: 'Failed to create recording' }, { status: 500 });
    }

    return NextResponse.json({ recording: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
