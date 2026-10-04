import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash, createHmac, timingSafeEqual } from 'crypto';

export const ADMIN_GATE_COOKIE_NAME = 'admin_gate_v1';
export const ADMIN_GATE_HEADER_NAME = 'x-admin-gate-password';

// NOTE: set ADMIN_GATE_PASSWORD in .env.local to a STRONG password before deploying.
// This dev fallback is ONLY for local development — do NOT rely on it in production.
export const FALLBACK_DEV_PASSWORD = 'SpeechhelpHifz@2026!Admin';
export const ADMIN_GATE_TTL_SECONDS = 8 * 60 * 60; // 8 hours

export function getAdminGatePassword(): string {
  const v = process.env.ADMIN_GATE_PASSWORD;
  if (typeof v === 'string' && v.length >= 8) return v;
  if (v && v.length > 0) return v;
  return FALLBACK_DEV_PASSWORD;
}

function getGateSecret(): string {
  const v = process.env.ADMIN_GATE_SECRET || process.env.NEXTAUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'speechhelp-admin-gate-insecure-local-secret-please-change';
  return String(v);
}

export function signAdminGateCookie(issuedAtSeconds: number): string {
  const secret = getGateSecret();
  const payload = `${issuedAtSeconds}`;
  const sig = createHmac('sha256', secret).update(payload).digest().toString('base64url');
  return `${payload}.${sig}`;
}

export function verifyAdminGateCookie(raw: string | null | undefined): boolean {
  if (!raw || typeof raw !== 'string' || raw.indexOf('.') < 0) return false;
  const [issued, sig] = raw.split('.');
  if (!issued || !sig) return false;
  const t = Number(issued);
  if (!Number.isFinite(t) || t <= 0) return false;
  const now = Math.floor(Date.now() / 1000);
  if (t < now - ADMIN_GATE_TTL_SECONDS) return false;
  if (t > now + 60) return false; // reject far-future tokens
  const secret = getGateSecret();
  const expected = createHmac('sha256', secret).update(issued).digest().toString('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function hashForLogs(x: string): string {
  return createHash('sha1').update(String(x || '')).digest().toString('hex').slice(0, 10);
}

/**
 * Server-side Route Handler helper: ensure the caller has passed the admin gate.
 * Accepts either:
 *   (a) a valid HMAC-signed HttpOnly cookie admin_gate_v1 (set after POST /api/admin-gate/verify)
 *   (b) a header x-admin-gate-password matching the configured env password (API-integration convenience)
 * Returns null on success, or a 403 JSON NextResponse on failure (caller should return early).
 */
export async function ensureAdminGateForRoute(
  req: NextRequest | Request,
  opts?: { verbose?: boolean }
): Promise<NextResponse | null> {
  // 1) Cookie check: via next/headers cookies() store (preferred)
  let ck: string | undefined;
  try {
    const store = await cookies();
    if (store && typeof store.get === 'function') ck = store.get(ADMIN_GATE_COOKIE_NAME)?.value;
  } catch {}

  // Fallback: try NextRequest.cookies getter (already parsed from header)
  if (!ck) {
    try {
      const asNext = req as NextRequest;
      if (asNext?.cookies && typeof asNext.cookies.get === 'function') {
        ck = asNext.cookies.get(ADMIN_GATE_COOKIE_NAME)?.value;
      }
    } catch {}
  }

  // Last fallback: parse cookies manually from request header "Cookie"
  if (!ck) {
    try {
      const cookieHeader = (req as Request).headers?.get?.('cookie') || '';
      if (cookieHeader) {
        const parts = cookieHeader.split(';').map((p) => p.trim());
        for (const part of parts) {
          if (part.startsWith(ADMIN_GATE_COOKIE_NAME + '=')) {
            ck = decodeURIComponent(part.slice(ADMIN_GATE_COOKIE_NAME.length + 1));
            break;
          }
        }
      }
    } catch {}
  }

  if (verifyAdminGateCookie(ck || '')) return null;

  // 2) Header fallback (for scripts/CI)
  let headerVal: string | null = null;
  try {
    headerVal = (req as Request).headers?.get?.(ADMIN_GATE_HEADER_NAME);
    if (!headerVal) {
      const hdrs = (req as any).headers as Record<string, string> | undefined;
      if (hdrs) {
        headerVal = hdrs[ADMIN_GATE_HEADER_NAME] || hdrs[String(ADMIN_GATE_HEADER_NAME).toLowerCase()] || null;
      }
    }
  } catch {}
  const expected = getAdminGatePassword();
  if (headerVal && typeof headerVal === 'string' && headerVal === expected) {
    return null;
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        opts?.verbose === false
          ? 'Admin gate required'
          : 'Admin access requires the staff password gate. Sign in from /admin/quran-recordings and refresh, or set x-admin-gate-password header.',
    },
    { status: 403 }
  );
}
