import { getOneSignalAppId, getOneSignalRestApiKey } from '@/lib/oneSignalConfig';

export type PushPayload = {
  heading: string;
  content: string;
  url?: string;
  /** ISO 8601 — schedule for later (background reminders) */
  sendAfter?: string;
  /** Target OneSignal external user ids (Supabase user ids) */
  externalUserIds?: string[];
  /** Broadcast to segment when no external ids */
  segment?: 'Subscribed Users' | 'All';
  data?: Record<string, string>;
};

export type PushResult = {
  id?: string;
  recipients?: number;
  errors?: unknown;
  raw: unknown;
};

export async function sendOneSignalPush(payload: PushPayload): Promise<PushResult> {
  const appId = getOneSignalAppId();
  const apiKey = getOneSignalRestApiKey();
  if (!appId || !apiKey) {
    throw new Error('OneSignal is not configured. Set NEXT_PUBLIC_ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY.');
  }

  const body: Record<string, unknown> = {
    app_id: appId,
    headings: { en: payload.heading },
    contents: { en: payload.content },
    chrome_web_icon: '/globe.svg',
    firefox_icon: '/globe.svg',
    data: payload.data ?? {},
  };

  if (payload.url) {
    body.url = payload.url;
  }

  if (payload.sendAfter) {
    body.send_after = payload.sendAfter;
  }

  if (payload.externalUserIds?.length) {
    body.include_aliases = { external_id: payload.externalUserIds };
    body.target_channel = 'push';
  } else {
    body.included_segments = [payload.segment || 'Subscribed Users'];
  }

  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (raw as { errors?: string[] })?.errors?.[0] ||
      (raw as { error?: string })?.error ||
      `OneSignal error ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  return {
    id: (raw as { id?: string }).id,
    recipients: (raw as { recipients?: number }).recipients,
    errors: (raw as { errors?: unknown }).errors,
    raw,
  };
}

export async function cancelOneSignalNotification(notificationId: string): Promise<void> {
  const appId = getOneSignalAppId();
  const apiKey = getOneSignalRestApiKey();
  if (!appId || !apiKey || !notificationId) return;

  await fetch(
    `https://onesignal.com/api/v1/notifications/${encodeURIComponent(notificationId)}?app_id=${encodeURIComponent(appId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Key ${apiKey}` },
    }
  );
}
