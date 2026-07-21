import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { isOneSignalConfiguredServer } from '@/lib/oneSignalConfig';
import { cancelOneSignalNotification, sendOneSignalPush } from '@/lib/oneSignalServer';
import {
  DEFAULT_SALAH_PREFS,
  fetchSalahTimings,
  listUpcomingSalah,
  SALAH_PRAYERS,
  type SalahAlarmPrefs,
  type SalahPrayer,
} from '@/lib/salahTimes';

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://traespeechhelpbe6b.vercel.app').replace(/\/$/, '');

export async function POST(request: Request) {
  try {
    if (!isOneSignalConfiguredServer()) {
      return NextResponse.json(
        { error: 'OneSignal not configured on server (need REST API key).' },
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
      return NextResponse.json({ error: 'Sign in required to schedule background salah alarms' }, { status: 401 });
    }

    const body = (await request.json()) as {
      prefs?: Partial<SalahAlarmPrefs>;
      cancelIds?: string[];
    };

    const prefs: SalahAlarmPrefs = {
      ...DEFAULT_SALAH_PREFS,
      ...(body.prefs || {}),
      prayers: {
        ...DEFAULT_SALAH_PREFS.prayers,
        ...(body.prefs?.prayers || {}),
      },
    };

    for (const id of body.cancelIds || []) {
      await cancelOneSignalNotification(id);
    }

    if (!prefs.enabled) {
      return NextResponse.json({ ok: true, scheduled: [], cancelled: body.cancelIds?.length || 0 });
    }

    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const [today, nextDay] = await Promise.all([
      fetchSalahTimings(prefs.lat, prefs.lng, prefs.method, now),
      fetchSalahTimings(prefs.lat, prefs.lng, prefs.method, tomorrow),
    ]);

    const upcoming = listUpcomingSalah(today, nextDay, prefs, now).slice(0, 10);
    const scheduled: { id: string; prayer: SalahPrayer; at: string }[] = [];

    for (const item of upcoming) {
      const result = await sendOneSignalPush({
        heading: `${item.label} · SpeechHelp`,
        content:
          prefs.minutesBefore > 0
            ? `${item.prayer} is in ${prefs.minutesBefore} minutes. Open SpeechHelp for adhan.`
            : `It's time for ${item.prayer}. Tap to open SpeechHelp.`,
        url: `${siteUrl()}/salah-alarms?play=1&prayer=${encodeURIComponent(item.prayer)}`,
        sendAfter: item.at.toISOString(),
        externalUserIds: [user.id],
        data: {
          type: 'salah_alarm',
          prayer: item.prayer,
          play_adhan: prefs.playAdhan ? '1' : '0',
        },
      });

      if (result.id) {
        scheduled.push({ id: result.id, prayer: item.prayer, at: item.at.toISOString() });
      }
    }

    return NextResponse.json({
      ok: true,
      scheduled,
      prayers: SALAH_PRAYERS.filter((p) => prefs.prayers[p]),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'Schedule failed' }, { status: 500 });
  }
}
