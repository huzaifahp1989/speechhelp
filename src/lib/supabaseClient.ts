import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig } from '@/lib/supabaseConfig';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient() {
	if (cachedClient) return cachedClient;

	const { url: supabaseUrl, publicKey: supabasePublicKey } = getSupabasePublicConfig();

	if (!supabaseUrl || !supabasePublicKey) {
		return null;
	}

	cachedClient = createBrowserClient(supabaseUrl, supabasePublicKey);
	return cachedClient;
}
