import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import {
  describeGlobalNoticesSupabase,
  globalNoticesSupabaseAdmin,
} from '@/lib/global-notices-supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  const debug = describeGlobalNoticesSupabase();

  try {
    const now = new Date().toISOString();
    let q = globalNoticesSupabaseAdmin
      .from('global_notices')
      .select('id')
      .eq('active', true)
      .lte('publish_at', now)
      .or('expire_at.is.null,expire_at.gt.' + now);

    try {
      q = q.or('sites.is.null,sites.cs.{\"*\"}');
    } catch {
      /* sites column absent — proceed */
    }

    const { data: idsData, error: idsError } = await q;
    if (idsError) {
      if (String(idsError.message || '').includes('does not exist')) {
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
      throw idsError;
    }
    const ids: Array<string> = (idsData || []).map((r: any) => r.id);
    if (ids.length === 0) {
      const r = NextResponse.json({ ok: true, marked: 0 });
      r.headers.set('X-Global-Notices-Supabase', debug.url);
      return r;
    }

    if (!user) {
      const r = NextResponse.json({ ok: true, marked: ids.length, guest: true });
      r.headers.set('X-Global-Notices-Supabase', debug.url);
      return r;
    }

    const rows = ids.map((id) => ({
      notice_id: id,
      user_id: user.id,
      seen_at: now,
      read_at: now,
    }));
    const { error } = await globalNoticesSupabaseAdmin
      .from('global_notice_views')
      .upsert(rows, { onConflict: 'notice_id,user_id', ignoreDuplicates: false });
    if (error) throw error;
    const r = NextResponse.json({ ok: true, marked: ids.length });
    r.headers.set('X-Global-Notices-Supabase', debug.url);
    return r;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to mark all notices read';
    const r = NextResponse.json({ error: message }, { status: 500 });
    r.headers.set('X-Global-Notices-Supabase', debug.url);
    return r;
  }
}
