'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { getDisplayNameFromUser } from '@/lib/userDisplayName';

export default function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorText, setErrorText] = useState<string>('');
  const rawRedirect = params.get('redirect') || '/tracker';
  const redirectTo = rawRedirect.startsWith('/') ? rawRedirect : '/tracker';

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setStatus('error');
      setErrorText('Supabase is not configured.');
      return;
    }

    const code = params.get('code');
    const error = params.get('error_description') || params.get('error');

    if (error) {
      setStatus('error');
      setErrorText(error);
      return;
    }

    const run = async () => {
      const hashParams =
        typeof window === 'undefined'
          ? new URLSearchParams()
          : new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);

      const accessToken = hashParams.get('access_token') || params.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || params.get('refresh_token');
      const hashCode = hashParams.get('code');
      const finalCode = code || hashCode;

      if (accessToken && refreshToken) {
        const { data, error: sessionErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionErr) {
          setStatus('error');
          setErrorText(sessionErr.message);
          return;
        }

        const u = data.user;
        const display = getDisplayNameFromUser(u);
        if (u && display) {
          await supabase.from('public_profiles').upsert(
            { user_id: u.id, display_name: display },
            { onConflict: 'user_id' }
          );
        }

        setStatus('success');
        router.replace(redirectTo);
        router.refresh();
        return;
      }

      if (finalCode) {
        const { data, error: exErr } = await supabase.auth.exchangeCodeForSession(finalCode);
        if (exErr) {
          setStatus('error');
          setErrorText(exErr.message);
          return;
        }

        const u = data.user;
        const display = getDisplayNameFromUser(u);
        if (u && display) {
          await supabase.from('public_profiles').upsert(
            { user_id: u.id, display_name: display },
            { onConflict: 'user_id' }
          );
        }

        setStatus('success');
        router.replace(redirectTo);
        router.refresh();
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        setStatus('success');
        router.replace(redirectTo);
        router.refresh();
        return;
      }

      setStatus('error');
      setErrorText('Your confirmation link looks incomplete. If you already confirmed your email, you can still sign in.');
    };

    run();
  }, [params, router]);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-900">Confirming your email</h1>

        {status === 'loading' && (
          <p className="mt-2 text-slate-600">Finishing sign up…</p>
        )}

        {status === 'success' && (
          <p className="mt-2 text-slate-600">Confirmed. Redirecting…</p>
        )}

        {status === 'error' && (
          <>
            <p className="mt-2 text-red-700">{errorText}</p>
            <div className="mt-6 flex items-center gap-3">
              <Link href="/auth?redirect=/tracker" className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold">
                Back to sign in
              </Link>
              <Link href="/auth?mode=signup" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                Try sign up again
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
