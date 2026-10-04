import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  ADMIN_GATE_COOKIE_NAME,
  ADMIN_GATE_HEADER_NAME,
  ADMIN_GATE_TTL_SECONDS,
  FALLBACK_DEV_PASSWORD,
  getAdminGatePassword,
  hashForLogs,
  signAdminGateCookie,
  verifyAdminGateCookie,
} from '@/lib/adminGate';

// Prevent any downstream caching of admin gate responses
export const dynamic = 'force-dynamic';

// GET /api/admin-gate/verify — anonymous check (returns ok if cookie passes)
export async function GET() {
  const ck = (await cookies()).get(ADMIN_GATE_COOKIE_NAME)?.value;
  if (verifyAdminGateCookie(ck)) {
    return NextResponse.json({ ok: true, ttlSeconds: ADMIN_GATE_TTL_SECONDS });
  }
  return NextResponse.json({ ok: false });
}

// POST /api/admin-gate/verify — submit password, receive httpOnly signed cookie if correct
export async function POST(request: Request) {
  try {
    const ckStore = await cookies();
    const body = (await request.json()) as { password?: string } | null;
    const password = body?.password ?? '';
    if (typeof password !== 'string') {
      return NextResponse.json({ ok: false, error: 'Missing password' }, { status: 400 });
    }

    const expected = getAdminGatePassword();
    const isFallbackInUse = expected === FALLBACK_DEV_PASSWORD;

    // Timing-safe-ish: avoid comparing with === for very early fast-fail. Normalize both.
    const a = Buffer.from(String(password || ''));
    const b = Buffer.from(String(expected));
    if (a.length !== b.length || a.toString() !== b.toString()) {
      // Brief delay to blunt rapid guesses (single-threaded block ~200ms)
      const blockUntil = Date.now() + 200;
      while (Date.now() < blockUntil) { /* noop */ }
      return NextResponse.json(
        { ok: false, error: 'Incorrect password.', usingFallback: isFallbackInUse, h: hashForLogs(password) },
        { status: 401 }
      );
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const token = signAdminGateCookie(issuedAt);
    ckStore.set({
      name: ADMIN_GATE_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: String(process.env.NODE_ENV) === 'production',
      path: '/',
      maxAge: ADMIN_GATE_TTL_SECONDS,
    });
    return NextResponse.json({
      ok: true,
      ttlSeconds: ADMIN_GATE_TTL_SECONDS,
      usingFallback: isFallbackInUse,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

// DELETE /api/admin-gate/verify — clear gate cookie (sign out)
export async function DELETE() {
  (await cookies()).delete({ name: ADMIN_GATE_COOKIE_NAME, path: '/' });
  return NextResponse.json({ ok: true });
}
