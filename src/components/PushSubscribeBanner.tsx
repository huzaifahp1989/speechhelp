'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { Bell, BellRing, Loader2, X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { isOneSignalConfiguredClient } from '@/lib/oneSignalConfig';
import {
  isPushOptedIn,
  requestPushPermission,
  setOneSignalExternalUser,
} from '@/components/OneSignalProvider';

const DISMISS_KEY = 'speechhelp_push_banner_dismissed_until';
const DISMISS_DAYS = 14;

function isDismissed(): boolean {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function dismissForDays(days: number) {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
  } catch {
    /* ignore */
  }
}

function clearDismiss() {
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* ignore */
  }
}

/** Site-wide push subscribe — banner + compact bell on every page. */
export default function PushSubscribeBanner() {
  const pathname = usePathname();
  const showPushUi = pathname !== '/quran/listen';
  const [mounted, setMounted] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [optedIn, setOptedIn] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!isOneSignalConfiguredClient()) {
      setConfigured(false);
      return;
    }
    setConfigured(true);

    // Web only: if the user blocked the site, hide the opt-in banner.
    if (
      !Capacitor.isNativePlatform() &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'denied'
    ) {
      setOptedIn(false);
      setShowBanner(false);
      return;
    }

    // Do NOT request permission here — that must stay on a click gesture.
    const subscribed = await isPushOptedIn().catch(() => false);
    setOptedIn(subscribed);
    setShowBanner(!subscribed && !isDismissed());
  }, []);

  useEffect(() => {
    setMounted(true);
    void refreshStatus();
  }, [refreshStatus]);

  const handleAllow = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      if (session?.user?.id) await setOneSignalExternalUser(session.user.id);

      const result = await requestPushPermission();
      setMessage(result.message);
      if (result.ok) {
        setOptedIn(true);
        clearDismiss();
        setShowBanner(false);
        window.setTimeout(() => setMessage(null), 3000);
      } else {
        // Keep banner/bell visible so user can retry
        setOptedIn(false);
        setShowBanner(true);
      }
    } catch (e) {
      setMessage((e as Error).message || 'Could not enable notifications.');
      setShowBanner(true);
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    dismissForDays(DISMISS_DAYS);
    setShowBanner(false);
  };

  if (!mounted || !configured) return null;

  return (
    <>
      {showPushUi && showBanner && !optedIn && (
        <div className="fixed inset-x-0 bottom-0 z-[120] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
          <div className="pointer-events-auto mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-3 shadow-lg shadow-emerald-900/10 sm:p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <BellRing className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">Enable Qur’an & salah reminders</p>
              <p className="mt-0.5 text-xs text-slate-500 leading-snug">
                Get push alerts for khatam, practice, and prayer times — works in the background.
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleAllow();
                  }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 touch-manipulation"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                  Allow notifications
                </button>
                <Link
                  href="/salah-alarms"
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Salah settings
                </Link>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  Not now
                </button>
              </div>
              {message && (
                <p className={`mt-2 text-[11px] ${message.includes('enabled') ? 'text-emerald-700' : 'text-red-600'}`}>
                  {message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showPushUi && !showBanner && !optedIn && (
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void handleAllow();
          }}
          title="Enable push notifications"
          className="fixed bottom-24 right-5 z-[120] flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-md hover:bg-emerald-50 disabled:opacity-60 touch-manipulation"
          aria-label="Enable push notifications"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bell className="h-5 w-5" />}
        </button>
      )}

      {message && !showBanner && (
        <div
          className={`fixed bottom-40 left-1/2 z-[121] max-w-[90vw] -translate-x-1/2 rounded-full px-4 py-2 text-center text-xs font-medium shadow-lg ${
            message.includes('enabled') ? 'bg-emerald-700 text-white' : 'bg-slate-900 text-white'
          }`}
        >
          {message}
        </div>
      )}
    </>
  );
}
