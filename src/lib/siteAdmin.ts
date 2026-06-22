import type { SupabaseClient } from '@supabase/supabase-js';

/** Bootstrap admins — also add to site_admins in Supabase when possible. */
export const SITE_ADMIN_EMAILS = ['huzaify786@gmail.com'] as const;

export function isSiteAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return SITE_ADMIN_EMAILS.some((e) => e.toLowerCase() === normalized);
}

export async function isSiteAdmin(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<boolean> {
  if (isSiteAdminEmail(email)) return true;

  const { data, error } = await supabase
    .from('site_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('site_admins check failed', error);
    return false;
  }
  return Boolean(data);
}
