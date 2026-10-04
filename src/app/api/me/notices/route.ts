import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import {
  describeGlobalNoticesSupabase,
  globalNoticesSupabaseAdmin,
} from '@/lib/global-notices-supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function selectList(): string {
  return `id,title,body,url,icon,priority,publish_at,expire_at,created_at,updated_at,sites,
       global_notice_views(user_id,seen_at,read_at)`;
}

let _sitesColumnCache: boolean | null = null;
async function hasSitesColumn(): Promise<boolean> {
  if (typeof _sitesColumnCache === 'boolean') return _sitesColumnCache;
  try {
    const { data, error } = await globalNoticesSupabaseAdmin
      .from('global_notices')
      .select('id,sites')
      .limit(1);
    _sitesColumnCache = Boolean(!error && data && data.length >= 0);
  } catch {
    _sitesColumnCache = false;
  }
  return _sitesColumnCache as boolean;
}

async function fetchLiveNotices(limit: number) {
  const now = new Date().toISOString();
  const supabase = globalNoticesSupabaseAdmin;

  const sitesCol = await hasSitesColumn();
  const selectFields = sitesCol ? selectList() : selectList().replace(',sites', '');

  let q = supabase
    .from('global_notices')
    .select(selectFields, { count: 'exact' })
    .eq('active', true)
    .lte('publish_at', now)
    .or('expire_at.is.null,expire_at.gt.' + now);

  if (sitesCol) {
    q = q.or('sites.is.null,sites.cs.{"*"}');
  }

  const { data: rows, error, count } = await q
    .order('publish_at', { ascending: false })
    .limit(limit);

  return { rows, error, count };
}

function mapRowsToNotices(rows: any[] | null, user_id: string | null) {
  return (rows || []).map((r: any) => {
    const views: Array<any> = Array.isArray(r.global_notice_views) ? r.global_notice_views : [];
    const mine = user_id ? views.find((v) => v.user_id === user_id) : undefined;
    return {
      id: r.id,
      title: r.title,
      body: r.body,
      url: r.url || null,
      icon: r.icon || '🔔',
      priority: (r.priority as any) || 'normal',
      publishAt: r.publish_at,
      expireAt: r.expire_at || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      sites: Array.isArray(r.sites) ? r.sites : null,
      seenAt: mine?.seen_at || null,
      readAt: mine?.read_at || null,
      isSeen: Boolean(mine?.seen_at),
      isRead: Boolean(mine?.read_at),
    };
  });
}

function summarize(notices: any[]) {
  const total = notices.length;
  let unread_count = 0;
  let unseen_count = 0;
  let urgent_unread_count = 0;
  for (const n of notices) {
    if (!n.isSeen) unseen_count += 1;
    if (!n.isRead) {
      unread_count += 1;
      if (n.priority === 'urgent') urgent_unread_count += 1;
    }
  }
  return { total, unread_count, unseen_count, urgent_unread_count, notices };
}

export async function GET(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get('limit');
  const limit = Number.isFinite(Number(limitRaw))
    ? Math.max(1, Math.min(100, Math.floor(Number(limitRaw))))
    : 25;

  const user_id: string | null = user?.id ?? null;
  const debug = describeGlobalNoticesSupabase();

  try {
    const { rows, error, count } = await fetchLiveNotices(limit);
    if (error) {
      if (String(error.message || '').includes('does not exist')) {
        const res = NextResponse.json(
          {
            error: 'Notices table is not configured yet. Apply migration 20260829_create_global_notices.sql.',
            setupRequired: true,
          },
          { status: 500 }
        );
        res.headers.set('X-Global-Notices-Supabase', debug.url + (debug.usesSharedMaster ? ' (MASTER-SHARED)' : ''));
        return res;
      }
      throw error;
    }

    const notices = mapRowsToNotices(rows, user_id);
    const payload = summarize(notices);
    const res = NextResponse.json({
      ...payload,
      ...(searchParams.get('debug') === '1'
        ? {
            _debug: {
              supabase: debug,
              user_id: user_id || null,
              signedIn: Boolean(user_id),
              totalCountHint: count,
            },
          }
        : {}),
    });
    res.headers.set(
      'X-Global-Notices-Supabase',
      debug.url +
        (debug.usesSharedMaster ? ' (MASTER-SHARED)' : ' (CUSTOM-OVERRIDE)') +
        (debug.override ? ' · ENV-OVERRIDE' : '')
    );
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notices';
    const res = NextResponse.json({ error: message }, { status: 500 });
    res.headers.set('X-Global-Notices-Supabase', debug.url + (debug.usesSharedMaster ? ' (MASTER-SHARED)' : ''));
    return res;
  }
}
