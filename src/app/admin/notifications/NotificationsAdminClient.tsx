'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, ChevronLeft, Loader2, Send } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { isSiteAdmin } from '@/lib/siteAdmin';
import { isOneSignalConfiguredClient } from '@/lib/oneSignalConfig';

const TEMPLATES = [
  {
    id: 'juz',
    label: 'Daily juz reminder',
    heading: 'Time for your daily juz',
    content: 'Keep your khatam going — open SpeechHelp and log today’s recitation.',
    url: '/khatam',
  },
  {
    id: 'quran',
    label: 'Qur’an reading reminder',
    heading: 'Qur’an reminder',
    content: 'Take a few minutes to recite. Your progress is waiting.',
    url: '/quran',
  },
  {
    id: 'mistake',
    label: 'Practice reminder',
    heading: 'Practice with mistake check',
    content: 'Open a surah, enable Mistake check, and refine your recitation.',
    url: '/quran/1',
  },
  {
    id: 'hifz',
    label: 'Hifz revision',
    heading: 'Hifz revision time',
    content: 'Review your Sabak / Sabak Para / Dhor in the Hifz planner.',
    url: '/hifz-planner?tab=hifz',
  },
] as const;

export default function NotificationsAdminClient() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [heading, setHeading] = useState<string>(TEMPLATES[0].heading);
  const [content, setContent] = useState<string>(TEMPLATES[0].content);
  const [url, setUrl] = useState<string>(TEMPLATES[0].url);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [sendAfterLocal, setSendAfterLocal] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function gate() {
      if (!supabase) {
        setError('Supabase is not configured.');
        setAuthChecked(true);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/auth?redirect=${encodeURIComponent('/admin/notifications')}`);
        return;
      }
      const admin = await isSiteAdmin(supabase, user.id, user.email);
      setIsAdmin(admin);
      setAuthChecked(true);
      if (!admin) setError('Admin access required.');
    }
    void gate();
  }, [supabase, router]);

  const applyTemplate = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setHeading(t.heading);
    setContent(t.content);
    setUrl(t.url);
  };

  const handleSend = async () => {
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      let sendAfter: string | undefined;
      if (scheduleMode === 'later') {
        if (!sendAfterLocal) throw new Error('Pick a date and time to schedule.');
        sendAfter = new Date(sendAfterLocal).toISOString();
        if (Number.isNaN(new Date(sendAfter).getTime())) throw new Error('Invalid schedule time.');
        if (new Date(sendAfter).getTime() <= Date.now()) {
          throw new Error('Scheduled time must be in the future.');
        }
      }

      const res = await fetch('/api/admin/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heading, content, url, sendAfter }),
      });
      const data = (await res.json()) as { error?: string; id?: string; recipients?: number };
      if (!res.ok) throw new Error(data.error || 'Send failed');

      setSuccess(
        scheduleMode === 'later'
          ? `Scheduled notification${data.id ? ` (${data.id})` : ''}.`
          : `Sent to ${data.recipients ?? 'subscribers'}${data.id ? ` · id ${data.id}` : ''}.`
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Admin access required</h1>
        <p className="mt-2 text-slate-600">{error || 'You are not authorized.'}</p>
        <Link href="/" className="mt-6 inline-block text-emerald-700 font-semibold hover:underline">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/admin/announcements"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-emerald-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Announcements admin
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Push reminders</h1>
            <p className="text-sm text-slate-500">Send Qur’an reminders via OneSignal (background push)</p>
          </div>
        </div>

        {!isOneSignalConfiguredClient() && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Set <code className="font-mono text-xs">NEXT_PUBLIC_ONESIGNAL_APP_ID</code> and{' '}
            <code className="font-mono text-xs">ONESIGNAL_REST_API_KEY</code> in Vercel env, then redeploy.
          </div>
        )}

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Template</label>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              defaultValue={TEMPLATES[0].id}
              onChange={(e) => applyTemplate(e.target.value)}
            >
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Heading</label>
            <input
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              maxLength={80}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Message</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              maxLength={240}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Open URL (path or full)
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/khatam"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="radio"
                checked={scheduleMode === 'now'}
                onChange={() => setScheduleMode('now')}
              />
              Send now
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="radio"
                checked={scheduleMode === 'later'}
                onChange={() => setScheduleMode('later')}
              />
              Schedule
            </label>
          </div>

          {scheduleMode === 'later' && (
            <input
              type="datetime-local"
              value={sendAfterLocal}
              onChange={(e) => setSendAfterLocal(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </div>
          )}

          <button
            type="button"
            disabled={sending || !heading.trim() || !content.trim()}
            onClick={() => void handleSend()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {scheduleMode === 'later' ? 'Schedule push' : 'Send push to subscribers'}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Users must allow notifications on the site. Salah alarms:{' '}
          <Link href="/salah-alarms" className="text-emerald-700 hover:underline">
            /salah-alarms
          </Link>
        </p>
      </div>
    </div>
  );
}
