'use client';

import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { getOneSignalAppId, isOneSignalConfiguredClient } from '@/lib/oneSignalConfig';

let initPromise: Promise<boolean> | null = null;
let nativeMode: boolean | null = null;

function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
}

async function ensureOneSignal(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!isOneSignalConfiguredClient()) return false;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const appId = getOneSignalAppId();
    if (!appId) return false;

    if (isNativeApp()) {
      nativeMode = true;
      const OneSignal = (await import('@onesignal/capacitor-plugin')).default;
      await OneSignal.initialize(appId);
      return true;
    }

    nativeMode = false;
    const OneSignal = (await import('react-onesignal')).default;
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: '/OneSignalSDKWorker.js',
      serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
      serviceWorkerParam: { scope: '/' },
    } as unknown as Parameters<typeof OneSignal.init>[0]);

    return true;
  })().catch((err) => {
    console.warn('OneSignal init failed', err);
    initPromise = null;
    nativeMode = null;
    return false;
  });

  return initPromise;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function isPushOptedIn(): Promise<boolean> {
  const ok = await ensureOneSignal();
  if (!ok) return false;

  try {
    if (nativeMode) {
      const OneSignal = (await import('@onesignal/capacitor-plugin')).default;
      if (await OneSignal.User.pushSubscription.getOptedInAsync()) return true;
      if (await OneSignal.Notifications.hasPermission()) return true;
      return false;
    }

    const OneSignal = (await import('react-onesignal')).default;
    if (OneSignal.User.PushSubscription.optedIn) return true;
    if (OneSignal.Notifications.permission) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Must be called from a user click/tap.
 * Prompts for permission, opts into OneSignal push, and waits for subscription.
 */
export async function requestPushPermission(): Promise<{ ok: boolean; message: string }> {
  if (typeof window === 'undefined') {
    return { ok: false, message: 'Notifications only work in the browser or app.' };
  }

  if (!isOneSignalConfiguredClient()) {
    return {
      ok: false,
      message: 'OneSignal App ID is missing on this deploy. Add NEXT_PUBLIC_ONESIGNAL_APP_ID and redeploy.',
    };
  }

  const ready = await ensureOneSignal();
  if (!ready) {
    return {
      ok: false,
      message: 'Could not start OneSignal. Check App ID / site URL in the OneSignal dashboard.',
    };
  }

  try {
    if (nativeMode) {
      const OneSignal = (await import('@onesignal/capacitor-plugin')).default;
      const granted = await OneSignal.Notifications.requestPermission(true);
      try {
        await OneSignal.User.pushSubscription.optIn();
      } catch {
        /* may already be opted in */
      }

      for (let i = 0; i < 10; i++) {
        if (await isPushOptedIn()) {
          return { ok: true, message: 'Notifications enabled on this device.' };
        }
        await delay(300);
      }

      if (granted || (await OneSignal.Notifications.hasPermission())) {
        return {
          ok: false,
          message:
            'Permission granted, but OneSignal has no device token yet. Add google-services.json (FCM) and rebuild the Android app.',
        };
      }

      return {
        ok: false,
        message: 'Notification permission was not granted. Enable it in Android settings, then try again.',
      };
    }

    // Web path
    if (!('Notification' in window)) {
      return { ok: false, message: 'This browser does not support notifications.' };
    }

    if (Notification.permission === 'denied') {
      return {
        ok: false,
        message: 'Notifications are blocked. Enable them in your browser site settings, then try again.',
      };
    }

    const OneSignal = (await import('react-onesignal')).default;

    if (!OneSignal.Notifications.isPushSupported()) {
      return { ok: false, message: 'Push is not supported in this browser.' };
    }

    try {
      await OneSignal.Slidedown.promptPush();
    } catch {
      await OneSignal.Notifications.requestPermission();
    }

    try {
      await OneSignal.User.PushSubscription.optIn();
    } catch {
      /* may already be opted in */
    }

    for (let i = 0; i < 8; i++) {
      if (await isPushOptedIn()) {
        return { ok: true, message: 'Notifications enabled.' };
      }
      await delay(250);
    }

    if (Notification.permission === 'granted') {
      try {
        await OneSignal.User.PushSubscription.optIn();
      } catch {
        /* ignore */
      }
      await delay(400);
      if (await isPushOptedIn()) {
        return { ok: true, message: 'Notifications enabled.' };
      }
      return {
        ok: false,
        message:
          'Browser allowed notifications, but OneSignal did not subscribe yet. Soft-refresh and tap Allow again.',
      };
    }

    if (Notification.permission === 'default') {
      return { ok: false, message: 'Notification prompt was dismissed. Tap Allow again.' };
    }

    return { ok: false, message: 'Permission not granted.' };
  } catch (e) {
    return { ok: false, message: (e as Error).message || 'Could not enable notifications.' };
  }
}

export async function setOneSignalExternalUser(userId: string | null) {
  const ok = await ensureOneSignal();
  if (!ok) return;
  try {
    if (nativeMode) {
      const OneSignal = (await import('@onesignal/capacitor-plugin')).default;
      if (userId) await OneSignal.login(userId);
      else await OneSignal.logout();
      return;
    }

    const OneSignal = (await import('react-onesignal')).default;
    if (userId) await OneSignal.login(userId);
    else await OneSignal.logout();
  } catch {
    /* ignore */
  }
}

/** Initializes OneSignal once and links the signed-in Supabase user as external_id. */
export default function OneSignalProvider() {
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!isOneSignalConfiguredClient()) return;

    void (async () => {
      const ok = await ensureOneSignal();
      setReady(ok);
      if (!ok) return;

      const supabase = getSupabaseClient();
      if (!supabase) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) await setOneSignalExternalUser(session.user.id);

      supabase.auth.onAuthStateChange((_e, s) => {
        void setOneSignalExternalUser(s?.user?.id ?? null);
      });
    })();
  }, []);

  useEffect(() => {
    if (ready) (window as unknown as { __ONESIGNAL_READY__?: boolean }).__ONESIGNAL_READY__ = true;
  }, [ready]);

  return null;
}
