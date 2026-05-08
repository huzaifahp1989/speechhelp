'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { getDisplayNameFromUser } from '@/lib/userDisplayName';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialIsSignUp = searchParams.get('mode') === 'signup';
  const rawRedirect = searchParams.get('redirect') || '/';
  const redirectTo = rawRedirect.startsWith('/') ? rawRedirect : '/';

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
  const [isForgot, setIsForgot] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [showResend, setShowResend] = useState(false);

  const getEmailRedirectTo = () => {
    if (typeof window === 'undefined') return undefined;
    return `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`;
  };

  const getPasswordResetRedirectTo = () => {
    if (typeof window === 'undefined') return undefined;
    return `${window.location.origin}/auth/reset?redirect=${encodeURIComponent(redirectTo)}`;
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    setLoading(true);
    setMessage(null);
    setShowResend(false);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setMessage({
          type: 'error',
          text: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and a public key: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        });
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getEmailRedirectTo(),
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setShowResend(false);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setMessage({
          type: 'error',
          text: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and a public key: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        });
        return;
      }

      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getPasswordResetRedirectTo(),
        });
        if (error) throw error;
        setMessage({
          type: 'success',
          text: 'Password reset email sent. Open the link, then set your new password.',
        });
        return;
      }

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getEmailRedirectTo(),
            data: {
              display_name: displayName.trim() || undefined,
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          const u = data.user;
          const display = getDisplayNameFromUser(u);
          if (u && display) {
            await supabase.from('public_profiles').upsert(
              { user_id: u.id, display_name: display },
              { onConflict: 'user_id' }
            );
          }
          router.push(redirectTo);
          router.refresh();
          return;
        }

        setMessage({
          type: 'success',
          text: 'Confirmation email sent. Check your inbox (and junk/spam). Click the confirmation link, then sign in. If the link opens but looks broken, you can still sign in from /auth.',
        });
        setShowResend(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        const { data } = await supabase.auth.getUser();
        const u = data.user;
        if (u) {
          const display = getDisplayNameFromUser(u);
          if (display) {
            await supabase.from('public_profiles').upsert(
              { user_id: u.id, display_name: display },
              { onConflict: 'user_id' }
            );
          }
        }

        router.push(redirectTo);
        router.refresh();
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setMessage({
          type: 'error',
          text: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and a public key: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        });
        return;
      }
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: getEmailRedirectTo() },
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Confirmation email resent. Check your inbox (and spam).' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          {isForgot ? 'Reset your password' : isSignUp ? 'Create your account' : 'Sign in to your account'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Or{' '}
          <button
            onClick={() => {
              setIsForgot(false);
              setIsSignUp(!isSignUp);
              setMessage(null);
              setShowResend(false);
            }}
            className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
          >
            {isSignUp ? 'sign in instead' : 'create a new account'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {!isForgot && (
            <div className="space-y-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => signInWithProvider('google')}
                className="w-full flex justify-center py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none disabled:opacity-50"
              >
                Continue with Google
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => signInWithProvider('github')}
                className="w-full flex justify-center py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none disabled:opacity-50"
              >
                Continue with GitHub
              </button>
              <div className="flex items-center gap-3">
                <div className="h-px bg-slate-200 flex-1" />
                <div className="text-xs text-slate-500">or</div>
                <div className="h-px bg-slate-200 flex-1" />
              </div>
            </div>
          )}
          <form className="space-y-6" onSubmit={handleAuth}>
            {isSignUp && (
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-slate-700">
                  Display name
                </label>
                <div className="mt-1">
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {!isForgot && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            {message && (
              <div className={`rounded-md p-4 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                <div className="flex">
                  <div className="text-sm font-medium">{message.text}</div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Processing...' : isForgot ? 'Send reset email' : isSignUp ? 'Sign up' : 'Sign in'}
              </button>
            </div>

            {!isSignUp && !isForgot && (
              <div className="text-sm text-center">
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:text-blue-500"
                  onClick={() => {
                    setIsForgot(true);
                    setMessage(null);
                    setShowResend(false);
                  }}
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {isForgot && (
              <div className="text-sm text-center">
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:text-blue-500"
                  onClick={() => {
                    setIsForgot(false);
                    setMessage(null);
                    setShowResend(false);
                  }}
                >
                  Back to sign in
                </button>
              </div>
            )}

            {isSignUp && showResend && (
              <div>
                <button
                  type="button"
                  disabled={loading || !email}
                  onClick={handleResend}
                  className="w-full flex justify-center py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none disabled:opacity-50"
                >
                  Resend confirmation email
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
