'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Loader2,
  AlertTriangle,
  LogOut,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';

type GateStatus = 'checking' | 'locked' | 'unlocked';

export function AdminGateClient({ children, title = 'Speechhelp — Admin Portal' }: { children: React.ReactNode; title?: string }) {
  const [status, setStatus] = useState<GateStatus>('checking');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const pwInputRef = useRef<HTMLInputElement>(null);

  // 1) Initial: check if cookie already passed (ask GET /api/admin-gate/verify)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin-gate/verify', { method: 'GET', cache: 'no-store' });
        const data = (await res.json()) as any;
        if (!cancelled) {
          if (data?.ok) {
            setStatus('unlocked');
          } else {
            setStatus('locked');
            setTimeout(() => pwInputRef.current?.focus(), 50);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setStatus('locked');
          setErrorMsg('Network error checking admin access.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitPassword(ev: React.FormEvent) {
    ev.preventDefault();
    setErrorMsg(null);
    if (!password.trim()) {
      setErrorMsg('Please enter the admin password.');
      pwInputRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin-gate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) {
        setErrorMsg(data?.error || 'Incorrect password.');
        setUsingFallback(Boolean(data?.usingFallback));
        setStatus('locked');
        pwInputRef.current?.select();
        return;
      }
      setUsingFallback(Boolean(data?.usingFallback));
      setErrorMsg(null);
      setStatus('unlocked');
      // Auto refresh the admin page now that cookie is set (so SSR data loads fresh).
      setTimeout(() => {
        window.location.reload();
      }, 450);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not verify password.');
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    try {
      await fetch('/api/admin-gate/verify', { method: 'DELETE' });
    } catch {}
    setPassword('');
    setStatus('locked');
    window.location.reload();
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-50 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white shadow-xl border border-indigo-100 px-8 py-10 max-w-sm w-full text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <div className="font-bold text-slate-800">Checking admin access…</div>
          <div className="text-sm text-slate-500 mt-1">Please wait.</div>
        </div>
      </div>
    );
  }

  if (status === 'locked') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#16204a] to-violet-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none" aria-hidden>
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-fuchsia-500/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        </div>
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/10 backdrop-blur ring-2 ring-white/20 shadow-inner mb-4">
                <Lock className="h-8 w-8 text-white" strokeWidth={2.3} />
              </div>
              <h1 className="text-2xl font-extrabold text-white drop-shadow-sm tracking-tight">
                {title}
              </h1>
              <p className="text-white/80 text-sm mt-2">
                Protected by admin gate. Enter the staff password to continue.
              </p>
            </div>

            <form
              onSubmit={submitPassword}
              className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 shadow-2xl ring-1 ring-white/10 p-6 space-y-5"
            >
              <div className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-white/85">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" strokeWidth={2.2} />
                <div>
                  <div className="font-bold text-white mb-0.5">Staff access only</div>
                  <div>
                    This area contains student data and recording reviews. If you are an instructor or admin
                    and lost your password, please contact the Speechhelp owner.
                  </div>
                  {usingFallback && (
                    <div className="mt-2 rounded-lg bg-amber-500/15 border border-amber-400/30 px-3 py-2 text-amber-100 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <b>Notice:</b> site is using the bundled dev-local fallback password.
                        For production, add <code className="text-[11px] bg-white/10 px-1.5 py-0.5 rounded">ADMIN_GATE_PASSWORD</code>
                        + <code className="text-[11px] bg-white/10 px-1.5 py-0.5 rounded">ADMIN_GATE_SECRET</code> to <code className="text-[11px] bg-white/10 px-1.5 py-0.5 rounded">.env.local</code>.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-100 px-3 py-2.5 text-sm font-medium">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-300" />
                  <div className="flex-1">{errorMsg}</div>
                </div>
              )}

              <div>
                <label htmlFor="admin_gate_password" className="sr-only">
                  Admin password
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60">
                    <Lock className="h-4.5 w-4.5" strokeWidth={2.2} />
                  </span>
                  <input
                    id="admin_gate_password"
                    ref={pwInputRef}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter staff password"
                    className="w-full h-12 rounded-xl bg-white/10 border border-white/20 pl-11 pr-12 text-white placeholder:text-white/45 font-semibold focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-lg text-white/70 hover:bg-white/10"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <div className="text-[11px] text-white/60 font-medium leading-snug">
                  Access is logged. A valid 8-hour signed cookie is issued on success.
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-12 px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-[#0d4f4f] text-white font-black tracking-wide shadow-lg shadow-emerald-900/40 ring-1 ring-white/30 hover:brightness-110 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" strokeWidth={2.3} />}
                  {submitting ? 'Verifying…' : 'Unlock Admin'}
                </button>
              </div>
            </form>

            <div className="mt-4 text-center">
              <a
                href="/"
                className="text-xs text-white/75 hover:text-white underline underline-offset-2"
              >
                ← Back to home
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unlocked: render children, but show a subtle sticky top banner with sign-out
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-indigo-900 via-[#16204a] to-violet-900 border-b border-white/10 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/25 ring-1 ring-emerald-300/50">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            </span>
            <div className="text-xs sm:text-sm text-white font-semibold truncate">
              Admin unlocked · valid for up to 8h · keep your browser session confidential
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold ring-1 ring-white/20"
          >
            <LogOut className="h-4 w-4" />
            Lock admin
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

export default AdminGateClient;
