'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Mail, Trophy, X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const DISMISS_UNTIL_KEY_SIGNED_OUT = 'speechhelp_signup_popup_dismiss_until_ms_signed_out';
const DISMISS_UNTIL_KEY_SIGNED_IN = 'speechhelp_signup_popup_dismiss_until_ms_signed_in';

function getDismissUntilMs(storageKey: string) {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(storageKey);
  const value = Number(raw || 0);
  return Number.isFinite(value) ? value : 0;
}

function setDismissForDays(storageKey: string, days: number) {
  if (typeof window === 'undefined') return;
  const ms = Math.max(0, Math.floor(days)) * 24 * 60 * 60 * 1000;
  window.localStorage.setItem(storageKey, String(Date.now() + ms));
}

export default function SignupTrackerPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const signedIn = Boolean(user?.id);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/auth/callback')) return;
    const dismissKey = signedIn ? DISMISS_UNTIL_KEY_SIGNED_IN : DISMISS_UNTIL_KEY_SIGNED_OUT;
    const until = getDismissUntilMs(dismissKey);
    if (until <= Date.now()) setOpen(true);
    else setOpen(false);
  }, [pathname, signedIn]);

  const closeForNow = () => {
    setOpen(false);
    const dismissKey = signedIn ? DISMISS_UNTIL_KEY_SIGNED_IN : DISMISS_UNTIL_KEY_SIGNED_OUT;
    setDismissForDays(dismissKey, 30);
  };

  if (!open) return null;

  const displayName = ((user?.user_metadata as any)?.display_name || user?.email || '').trim();

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        onClick={closeForNow}
        aria-label="Close"
        className="absolute inset-0 bg-slate-950/50"
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold">
                <Trophy className="h-4 w-4" />
                Monthly Tracker + Leaderboard
              </div>
              <h2 className="mt-3 text-xl font-bold text-slate-900">
                Track your Qur’an, Zikr, and Durood — and compete together
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Log your progress and see how you’re doing on the weekly/monthly leaderboard.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForNow}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {!user ? (
            <>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-slate-700 mt-0.5" />
                  <div className="text-sm text-slate-700">
                    You’ll get a confirmation email. Check your inbox or junk/spam, then click the confirmation link and sign in.
                    If the link opens but looks broken, you can still sign in from the app.
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/auth?mode=signup&redirect=/tracker"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3"
                  onClick={() => setOpen(false)}
                >
                  Sign up
                </Link>
                <Link
                  href="/auth?redirect=/tracker"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold px-4 py-3"
                  onClick={() => setOpen(false)}
                >
                  Sign in
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Signed in as <span className="font-semibold">{displayName || 'you'}</span>. Jump into the tracker and check the leaderboard.
              </div>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/tracker"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3"
                  onClick={() => setOpen(false)}
                >
                  Open tracker
                </Link>
                <button
                  type="button"
                  onClick={closeForNow}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold px-4 py-3"
                >
                  Close
                </button>
              </div>
            </>
          )}

          <div className="mt-4 text-xs text-slate-500">
            Tip: close this and it won’t show again for 30 days.
          </div>
        </div>
      </div>
    </div>
  );
}
