'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Heart, Mail, Target, Trophy, X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const DISMISS_UNTIL_KEY_SIGNED_OUT = 'speechhelp_signup_popup_dismiss_until_ms_signed_out';

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
  const [authReady, setAuthReady] = useState(false);
  const [authConfigured, setAuthConfigured] = useState(true);
  const signedIn = Boolean(user?.id && !user.is_anonymous);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      const timeoutId = window.setTimeout(() => {
        setAuthConfigured(false);
        setAuthReady(true);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    }).catch(() => {
      if (active) setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
      if (session?.user && !session.user.is_anonymous) setOpen(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || signedIn || !pathname) return;
    if (pathname.startsWith('/auth') || pathname.startsWith('/admin')) return;
    if (/^\/quran\/(juz\/\d+|\d+|mushaf-13)/.test(pathname)) return;
    if (getDismissUntilMs(DISMISS_UNTIL_KEY_SIGNED_OUT) > Date.now()) return;

    let timeoutId: number;
    const tryOpen = () => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        timeoutId = window.setTimeout(tryOpen, 10_000);
        return;
      }
      setOpen(true);
    };
    timeoutId = window.setTimeout(tryOpen, 35_000);
    return () => window.clearTimeout(timeoutId);
  }, [authReady, pathname, signedIn]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setDismissForDays(DISMISS_UNTIL_KEY_SIGNED_OUT, 30);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const closeForNow = () => {
    setOpen(false);
    setDismissForDays(DISMISS_UNTIL_KEY_SIGNED_OUT, 30);
  };

  if (!open || signedIn) return null;
  const redirect = pathname?.startsWith('/') && !pathname.startsWith('/auth') ? pathname : '/';
  const signupHref = `/auth?mode=signup&redirect=${encodeURIComponent(redirect)}`;
  const signinHref = `/auth?redirect=${encodeURIComponent(redirect)}`;
  const benefits = [
    { icon: CalendarDays, label: 'Track daily Azkaar and Durood' },
    { icon: BookOpen, label: 'Learn Quran, practise Hifz, and plan revision' },
    { icon: Target, label: 'Set daily and monthly goals' },
    { icon: Heart, label: 'Keep your worship and learning progress together' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        onClick={closeForNow}
        aria-label="Dismiss sign-up invitation"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
      />
      <div role="dialog" aria-modal="true" aria-labelledby="signup-popup-title" className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#12336b]">
                <Trophy className="h-4 w-4" /> Islam Media Central
              </p>
              <h2 id="signup-popup-title" className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">
                Keep your progress moving
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Create a free account to track your daily worship, learn Quran, and keep your goals together.
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

          <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
            {benefits.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 py-2.5 text-sm text-slate-700">
                <Icon className="h-4 w-4 shrink-0 text-[#12336b]" />
                <span>{label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href={signupHref}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#12336b] hover:bg-[#214f8d] text-white font-semibold px-4 py-3"
              onClick={() => setOpen(false)}
            >
              Create a free account
            </Link>
            <Link
              href={signinHref}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold px-4 py-3"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
          </div>

          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" /> Email confirmation may be required to finish creating your account.
          </p>
          {!authConfigured && (
            <p className="mt-2 text-xs leading-relaxed text-amber-800" role="status">
              Account creation needs Supabase auth configuration in this environment.
            </p>
          )}
          <button type="button" onClick={closeForNow} className="mt-3 min-h-[40px] w-full text-sm font-medium text-slate-500 hover:text-slate-800">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
