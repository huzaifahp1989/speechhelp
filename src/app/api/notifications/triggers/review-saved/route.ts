import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { sendOneSignalPush } from '@/lib/oneSignalServer';
import { getOneSignalAppId, getOneSignalRestApiKey } from '@/lib/oneSignalConfig';

function isOneSignalConfiguredServer(): boolean {
  return Boolean(getOneSignalAppId() && getOneSignalRestApiKey());
}

// POST /api/notifications/triggers/review-saved
// Body: { recording_id: string }
// Triggers an in-app + push notification (if configured) to the recording's student owner
// that their review is ready.
export async function POST(request: Request) {
  let recording_id: string | undefined;
  try {
    const body = await request.json().catch(() => null);
    recording_id = body?.recording_id;
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
    .select(
      `id, title, status, user_id, admin_rating, points_awarded,
       user:user_id(id, email, raw_user_meta_data)`
    )
    .eq('id', recording_id)
    .maybeSingle();

  if (fetchErr || !rec) {
    return NextResponse.json({ ok: false, error: 'Recording not found.' }, { status: 404 });
  }

  const studentId: string = (rec.user_id as unknown as string) || (rec.user as any)?.id;
  const studentName: string =
    (rec.user as any)?.raw_user_meta_data?.name ||
    (rec.user as any)?.email?.split('@')[0] ||
    'Student';
  const rating = rec.admin_rating ?? null;
  const points = rec.points_awarded ?? null;
  const statusText = (() => {
    switch (rec.status) {
      case 'approved':
        return '✅ Approved';
      case 'needs_improvement':
        return '📋 Needs Improvement';
      case 'reviewing':
        return '📝 Under Review';
      default:
        return '📬 Updated';
    }
  })();

  const heading = 'Your Quran Review is Ready!';
  const contentParts = [
    `${studentName}, ${statusText} — "${rec.title || 'Your recording'}".`,
    rating ? `Rating: ${rating}/10.` : null,
    points ? `Points: +${points}.` : null,
    'Open the app to read the feedback.',
  ].filter(Boolean) as string[];
  const content = contentParts.join(' ');
  const url = `/quran-recording?reviewed=${encodeURIComponent(rec.id)}`;

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
          type: 'quran_review_saved',
          recording_id: rec.id,
          status: rec.status || '',
          rating: rating != null ? String(rating) : '',
          points: points != null ? String(points) : '',
        },
      });
    } catch (e: any) {
      pushError = e?.message || 'Push failed silently';
    }
  }

  // Always attempt to insert an in-app notification row if the table exists (best-effort).
  let inappError: string | null = null;
  try {
    const { error: insertErr } = await supabase.from('inapp_notifications').insert({
      user_id: studentId,
      category: 'quran_review',
      title: heading,
      body: content,
      deep_link: url,
      context: JSON.stringify({ type: 'quran_review_saved', recording_id: rec.id }),
    });
    if (insertErr) {
      inappError = `inapp_notifications insert skipped (${insertErr.code})`;
    }
  } catch (e: any) {
    inappError = e?.message || 'inapp insert skipped';
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
