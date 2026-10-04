import { createClient } from '@supabase/supabase-js';
import {
  PRODUCTION_SUPABASE_ANON_KEY,
  PRODUCTION_SUPABASE_URL,
} from '@/lib/supabase-public-config';
import {
  PRODUCTION_SUPABASE_SERVICE_ROLE_KEY,
  hasEffectiveServiceRoleKey,
  resolveServiceRoleKey,
} from '@/lib/supabase-server-secrets';

const SHARED_SUPABASE_URL = PRODUCTION_SUPABASE_URL;

const SHARED_SUPABASE_ANON_KEY = PRODUCTION_SUPABASE_ANON_KEY;

function clean(value: string | undefined | null): string {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

const envOverrideUrl = clean(process.env.GLOBAL_NOTICES_SUPABASE_URL);
const envOverrideAnon = clean(process.env.GLOBAL_NOTICES_SUPABASE_ANON_KEY);
const envOverrideService = clean(process.env.GLOBAL_NOTICES_SUPABASE_SERVICE_ROLE_KEY);

export const GLOBAL_NOTICES_SUPABASE_URL =
  envOverrideUrl || SHARED_SUPABASE_URL;

export const GLOBAL_NOTICES_SUPABASE_ANON_KEY =
  envOverrideAnon || SHARED_SUPABASE_ANON_KEY;

const EFFECTIVE_SERVICE_KEY =
  envOverrideService && envOverrideService.length > 40
    ? envOverrideService
    : hasEffectiveServiceRoleKey()
    ? resolveServiceRoleKey()
    : envOverrideService && envOverrideService.length > 0
    ? envOverrideService
    : PRODUCTION_SUPABASE_SERVICE_ROLE_KEY;

export const globalNoticesSupabaseAdmin = createClient(
  GLOBAL_NOTICES_SUPABASE_URL,
  EFFECTIVE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export function describeGlobalNoticesSupabase(): { url: string; usesSharedMaster: boolean; override: boolean } {
  const override =
    Boolean(envOverrideUrl) ||
    Boolean(envOverrideAnon) ||
    Boolean(envOverrideService);
  return {
    url: GLOBAL_NOTICES_SUPABASE_URL,
    usesSharedMaster:
      GLOBAL_NOTICES_SUPABASE_URL === SHARED_SUPABASE_URL,
    override,
  };
}
