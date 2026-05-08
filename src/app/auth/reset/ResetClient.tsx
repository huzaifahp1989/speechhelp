'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Step = 'loading' | 'ready' | 'done' | 'error';

function getHashParams() {
  if (typeof window === 'undefined') return new URLSearchParams();
  const raw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(raw);
}

export default function ResetClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<Step>('loading');
  const [errorText, setErrorText] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const rawRedirect = params.get('redirect') || '/tracker';
  const redirectTo = rawRedirect.startsWith('/') ? rawRedirect : '/tracker';

  const canSubmit = useMemo(() => {
    if (!password || password.length < 8) return false;
    return password === confirm;
  }, [confirm, password]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setStep('error');
      setErrorText('Supabase is not configured.');
      return;
    }

    const run = async () => {
      const error = params.get('error_description') || params.get('error');
      if (error) {
        setStep('error');
        setErrorText(error);
        return;
      }

      const hashParams = getHashParams();
      const accessToken = hashParams.get('access_token') || params.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || params.get('refresh_token');
      const hashCode = hashParams.get('code');
      const code = params.get('code') || hashCode;

      if (accessToken && refreshToken) {
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionErr) {
          setStep('error');
          setErrorText(sessionErr.message);
          return;
        }
        setStep('ready');
        return;
      }

      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) {
          setStep('error');
          setErrorText(exErr.message);
          return;
        }
        setStep('ready');
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setStep('ready');
        return;
      }

      setStep('error');
      setErrorText('Your reset link looks incomplete. Please request a new password reset email.');
    };

    run();
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!canSubmit) return;

    const supabase = getSupabaseClient();
    if (!supabase) {
      setStep('error');
      setErrorText('Supabase is not configured.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStep('done');
      setMessage('Password updated. Redirecting…');
      router.replace(redirectTo);
      router.refresh();
    } catch (e: any) {
      setStep('error');
      setErrorText(e?.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>

        {step === 'loading' && <p className="mt-2 text-slate-600">Preparing secure reset…</p>}

        {step === 'error' && (
          <>
            <p className="mt-2 text-red-700">{errorText}</p>
            <div className="mt-6 flex items-center gap-3">
              <Link href="/auth" className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold">
                Back to sign in
              </Link>
            </div>
          </>
        )}

        {step === 'ready' && (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-slate-700">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            {message && (
              <div className="rounded-md p-4 bg-green-50 text-green-700">
                <div className="text-sm font-medium">{message}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}

        {step === 'done' && <p className="mt-2 text-slate-600">{message || 'Done.'}</p>}
      </div>
    </div>
  );
}
