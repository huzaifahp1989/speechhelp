import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { sendOneSignalPush } from '@/lib/oneSignalServer';
import { getOneSignalAppId, getOneSignalRestApiKey } from '@/lib/oneSignalConfig';

function isOneSignalConfiguredServer(): boolean {
  return Boolean(getOneSignalAppId() && getOneSignalRestApiKey());
}

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// POST /api/notifications/triggers/review-comment
// Body: { recording_id: string, comment_id?: string }
export async function POST(request: Request) {
  let recording_id: string | undefined;
  let comment_id: string | undefined;
  try {
    const body = await request.json().catch(() => null);
    recording_id = body?.recording_id;
    comment_id = body?.comment_id;
    if (!recording_id) {
      return NextResponse.json({ error: 'recording_id required' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: 'Supabase not configured' },
      { status: 500 }
    );
  }

  const { data: rec, error: fetchErr } = await supabase
    .from('quran_recordings')
    .select('id, title, user_id, user:user_id(id, email, raw_user_meta_data)')
    .eq('id', recording_id)
    .maybeSingle();

  if (fetchErr || !rec) {
    return NextResponse.json({ ok: false, error: 'Recording not found.' }, { status: 404 });
  }

  let comment: any = null;
  if (comment_id) {
    const { data: c } = await supabase
      .from('quran_recording_comments')
      .select('id, comment, audio_timestamp_seconds, is_admin_comment, created_at')
      .eq('id', comment_id)
      .maybeSingle();
    comment = c || null;
  }

  const studentId: string = (rec.user_id as unknown as string) || (rec.user as any)?.id;
  const studentName: string =
    (rec.user as any)?.raw_user_meta_data?.name ||
    (rec.user as any)?.email?.split('@')[0] ||
    'Student';

  const stamp =
    comment?.audio_timestamp_seconds != null ? ` @ ${fmt(Number(comment.audio_timestamp_seconds))}` : '';
  const preview =
    comment?.comment && comment.comment.length > 80
      ? `${comment.comment.slice(0, 77).trim()}…`
      : comment?.comment || 'A new note';

  const heading = 'New Note on Your Quran Recitation';
  const content = `${studentName}, your instructor left feedback on "${rec.title || 'your recording'}"${stamp}: ${preview}`;
  const url = `/quran-recording?commented=${encodeURIComponent(rec.id)}${
    comment?.id ? `&c=${encodeURIComponent(comment.id)}` : ''
  }`;

  const pushConfigured = isOneSignalConfiguredServer();
  let pushResult: any = null;
  let pushError: string | null = null;
  if (pushConfigured && studentId) {
    try {
      pushResult = await sendOneSignalPush({
        heading,
        content,
        url,
        externalUserIds: [studentId],
        data: {
          type: 'quran_review_comment',
          recording_id: rec.id,
          comment_id: comment?.id || '',
          audio_timestamp_seconds:
            comment?.audio_timestamp_seconds != null
              ? String(comment.audio_timestamp_seconds)
              : '',
        },
      });
    } catch (e: any) {
      pushError = e?.message || 'Push failed silently';
    }
  }

  let inappError: string | null = null;
  try {
    const { error: insertErr } = await supabase.from('inapp_notifications').insert({
      user_id: studentId,
      category: 'quran_comment',
      title: heading,
      body: content,
      deep_link: url,
      context: JSON.stringify({
        type: 'quran_review_comment',
        recording_id: rec.id,
        comment_id: comment?.id || null,
      }),
    });
    if (insertErr) inappError = `insert skipped (${insertErr.code})`;
  } catch (e: any) {
    inappError = e?.message || 'insert skipped';
  }

  return NextResponse.json({
    ok: true,
    sent: {
      push: pushConfigured && !pushError,
      inapp: !inappError,
    },
    push: pushResult,
    push_error: pushError,
    inapp_error: inappError,
  });
}
