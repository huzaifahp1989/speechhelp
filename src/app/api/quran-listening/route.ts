import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

type SessionPayload = {
  action?: unknown;
  childProfileId?: unknown;
  clientSessionId?: unknown;
  sessionId?: unknown;
  mode?: unknown;
  surahNumber?: unknown;
  juzNumber?: unknown;
  ayahStart?: unknown;
  ayahEnd?: unknown;
  reciterId?: unknown;
  reciterName?: unknown;
  isPlaying?: unknown;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalInt(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Sign in to save Quran listening activity.' }, { status: 401 });
  }

  let body: SessionPayload;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  if (body.action === 'start') {
    const childProfileId = typeof body.childProfileId === 'string' ? body.childProfileId : '';
    const clientSessionId = typeof body.clientSessionId === 'string' ? body.clientSessionId : '';
    const mode = body.mode;
    if (!uuidPattern.test(childProfileId) || !uuidPattern.test(clientSessionId)) {
      return NextResponse.json({ error: 'A valid child profile and session ID are required.' }, { status: 400 });
    }
    if (mode !== 'surah' && mode !== 'juz' && mode !== 'quran') {
      return NextResponse.json({ error: 'Invalid Quran listening mode.' }, { status: 400 });
    }

    const surahNumber = optionalInt(body.surahNumber, 1, 114);
    const juzNumber = optionalInt(body.juzNumber, 1, 30);
    const ayahStart = optionalInt(body.ayahStart, 1, 300);
    const ayahEnd = optionalInt(body.ayahEnd, 1, 300);
    if ((body.surahNumber != null && surahNumber === null)
      || (body.juzNumber != null && juzNumber === null)
      || (body.ayahStart != null && ayahStart === null)
      || (body.ayahEnd != null && ayahEnd === null)) {
      return NextResponse.json({ error: 'The selected Quran location is invalid.' }, { status: 400 });
    }
    if ((mode === 'juz' && juzNumber === null)
      || (mode !== 'juz' && surahNumber === null)
      || (ayahStart !== null && ayahEnd !== null && ayahEnd < ayahStart)) {
      return NextResponse.json({ error: 'The selected Quran location is incomplete or inconsistent.' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('start_quran_listening_session', {
      p_child_profile_id: childProfileId,
      p_client_session_id: clientSessionId,
      p_mode: mode,
      p_surah_number: surahNumber,
      p_juz_number: juzNumber,
      p_ayah_start: ayahStart,
      p_ayah_end: ayahEnd,
      p_reciter_id: typeof body.reciterId === 'string' ? body.reciterId.slice(0, 120) : null,
      p_reciter_name: typeof body.reciterName === 'string' ? body.reciterName.slice(0, 120) : null,
    });
    if (error) {
      console.error('Could not start Quran listening session.', error);
      const status = error.code === '23505' ? 409 : error.code === '42501' ? 403 : 500;
      return NextResponse.json({ error: status === 409 ? 'Another listening session is active for this child.' : 'Could not start listening session.' }, { status });
    }
    return NextResponse.json({ sessionId: data });
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!uuidPattern.test(sessionId)) {
    return NextResponse.json({ error: 'A valid listening session ID is required.' }, { status: 400 });
  }

  if (body.action === 'heartbeat') {
    if (typeof body.isPlaying !== 'boolean') {
      return NextResponse.json({ error: 'Playback state is required.' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('heartbeat_quran_listening_session', {
      p_session_id: sessionId,
      p_is_playing: body.isPlaying,
    });
    if (error) {
      console.error('Could not record Quran listening heartbeat.', error);
      return NextResponse.json({ error: 'Could not record listening progress.' }, { status: 500 });
    }
    return NextResponse.json({ result: data });
  }

  if (body.action === 'end') {
    const { error } = await supabase.rpc('end_quran_listening_session', {
      p_session_id: sessionId,
    });
    if (error) {
      console.error('Could not end Quran listening session.', error);
      return NextResponse.json({ error: 'Could not end listening session.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'completeSurah' || body.action === 'completeJuz') {
    const functionName = body.action === 'completeSurah' ? 'complete_quran_surah' : 'complete_quran_juz';
    const { data, error } = await supabase.rpc(functionName, { p_session_id: sessionId });
    if (error) {
      console.error('Could not record Quran completion.', error);
      return NextResponse.json({ error: 'Could not record Quran completion.' }, { status: 500 });
    }
    return NextResponse.json({ result: data });
  }

  return NextResponse.json({ error: 'Unknown session action.' }, { status: 400 });
}
