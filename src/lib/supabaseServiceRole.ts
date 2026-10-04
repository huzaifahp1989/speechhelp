import { createClient } from '@supabase/supabase-js';

let cached: ReturnType<typeof createClient> | null = null;

/**
 * Supabase server client with SERVICE ROLE key — for BACKEND USE ONLY in Route Handlers / Server Actions.
 * Bypasses Row Level Security (can read/write any table/storage), so every caller MUST perform explicit
 * authorization checks (e.g. verify user is the owner of the uploaded folder, or is site admin).
 * NEVER expose this client to browser code.
 */
export function getSupabaseServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
  if (!supabaseUrl || !serviceKey) return null;
  if (cached) return cached;
  cached = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}
