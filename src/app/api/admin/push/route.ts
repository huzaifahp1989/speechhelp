import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { isSiteAdmin } from '@/lib/siteAdmin';
import { isOneSignalConfiguredServer } from '@/lib/oneSignalConfig';
import { sendOneSignalPush } from '@/lib/oneSignalServer';

export async function POST(request: Request) {
  try {
    if (!isOneSignalConfiguredServer()) {
      return NextResponse.json(
        {
          error:
            'OneSignal not configured. Set NEXT_PUBLIC_ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY in Vercel env.',
        },
        { status: 503 }
      );
    }

    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const admin = await isSiteAdmin(supabase, user.id, user.email);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = (await request.json()) as {
      heading?: string;
      content?: string;
      url?: string;
      sendAfter?: string;
      segment?: 'Subscribed Users' | 'All';
    };

    const heading = (body.heading || '').trim();
    const content = (body.content || '').trim();
    if (!heading || !content) {
      return NextResponse.json({ error: 'Heading and message are required' }, { status: 400 });
    }

    const siteUrl =
      (process.env.NEXT_PUBLIC_SITE_URL || 'https://traespeechhelpbe6b.vercel.app').replace(/\/$/, '');
    let url = (body.url || '').trim() || `${siteUrl}/quran`;
    if (url.startsWith('/')) url = `${siteUrl}${url}`;

    const result = await sendOneSignalPush({
      heading,
      content,
      url,
      sendAfter: body.sendAfter || undefined,
      segment: body.segment || 'Subscribed Users',
      data: { type: 'admin_reminder', source: 'speechhelp' },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'Failed to send' }, { status: 500 });
  }
}
