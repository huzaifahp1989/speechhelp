export function getOneSignalAppId(): string {
  return (process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID || '').trim();
}

export function getOneSignalRestApiKey(): string {
  return (process.env.ONESIGNAL_REST_API_KEY || '').trim();
}

export function isOneSignalConfiguredClient(): boolean {
  return Boolean(getOneSignalAppId());
}

export function isOneSignalConfiguredServer(): boolean {
  return Boolean(getOneSignalAppId() && getOneSignalRestApiKey());
}
