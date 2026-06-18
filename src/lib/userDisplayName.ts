import type { User as SupabaseUser } from '@supabase/supabase-js';

function readMetaValue(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== 'object') return '';
  const value = (metadata as Record<string, unknown>)[key];
  if (typeof value !== 'string') return '';
  return value.trim();
}

function getEmailLocalPart(email: string | null | undefined) {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim();
  if (!trimmed) return '';
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return trimmed;
  return trimmed.slice(0, atIndex).trim();
}

export function getDisplayNameFromUser(user: Pick<SupabaseUser, 'email' | 'user_metadata'> | null | undefined) {
  if (!user) return '';

  const keys = ['full_name', 'name', 'display_name', 'preferred_username', 'username'];
  for (const key of keys) {
    const value = readMetaValue(user.user_metadata, key);
    if (value) return value;
  }

  const givenName = readMetaValue(user.user_metadata, 'given_name');
  const familyName = readMetaValue(user.user_metadata, 'family_name');
  const combined = `${givenName} ${familyName}`.trim();
  if (combined) return combined;

  return getEmailLocalPart(user.email);
}

export function getSafeLeaderboardName(rawName: string | null | undefined, fallbackId: string) {
  const normalized = typeof rawName === 'string' ? rawName.trim() : '';
  if (normalized) return normalized;

  const prefix = (fallbackId || '').slice(0, 6);
  return prefix ? `User ${prefix}` : 'User';
}
