import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import {
  describeGlobalNoticesSupabase,
  globalNoticesSupabaseAdmin,
} from '@/lib/global-notices-supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  const user = await getAuthenticatedRequestUser(request);
  const { noticeId } = await params;
  const debug = describeGlobalNoticesSupabase();

  if (!noticeId) {
    const r = NextResponse.json({ error: 'noticeId is required' }, { status: 400 });
    r.headers.set('X-Global-Notices-Supabase', debug.url);
    return r;
  }
  if (!user) {
    const r = NextResponse.json({ ok: true, noticeId, guest: true });
    r.headers.set('X-Global-Notices-Supabase', debug.url);
    return r;
  }

  try {
    const now = new Date().toISOString();
    const { error } = await globalNoticesSupabaseAdmin
      .from('global_notice_views')
      .upsert(
        { notice_id: noticeId, user_id: user.id, read_at: now, seen_at: now },
        { onConflict: 'notice_id,user_id' }
      );
    if (error) {
      if (String(error.message || '').includes('does not exist')) {
        const r = NextResponse.json(
          {
            error: 'Notices table is not configured yet. Apply migration 20260829_create_global_notices.sql.',
            setupRequired: true,
          },
          { status: 500 }
        );
        r.headers.set('X-Global-Notices-Supabase', debug.url);
        return r;
      }
      throw error;
    }
    const r = NextResponse.json({ ok: true, noticeId });
    r.headers.set('X-Global-Notices-Supabase', debug.url);
    return r;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to mark notice read';
    const r = NextResponse.json({ error: message }, { status: 500 });
    r.headers.set('X-Global-Notices-Supabase', debug.url);
    return r;
  }
}
