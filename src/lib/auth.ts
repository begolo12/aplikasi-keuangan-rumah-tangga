import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { BusinessError } from './apiHelpers';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET environment variable is required in production.');
  }
  return new TextEncoder().encode(secret);
}

const COOKIE_NAME = 'kas_session_token';
const EXPIRY_DAYS = 30;

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  familyName: string;
  tokenVersion?: number;
}

/**
 * Sign a JWT token for the user session. Claim tv = tokenVersion (0 bila tak diset).
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload, tv: payload.tokenVersion ?? 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(getJwtSecret());
}

/**
 * Verify a JWT session token. Murni tanpa DB: klaim tv dianggap 0 bila tak ada,
 * sehingga token lama (sebelum kolom token_version) tetap valid.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      familyName: payload.familyName as string,
      tokenVersion: typeof payload.tv === 'number' ? payload.tv : 0,
    };
  } catch {
    return null;
  }
}

interface TokenVersionCacheEntry {
  version: number;
  expiresAt: number;
}

const tokenVersionCache = new Map<string, TokenVersionCacheEntry>();

export function invalidateTokenVersionCache(userId: string): void {
  tokenVersionCache.delete(userId);
}

/**
 * Get current authenticated user session from NextRequest or cookies().
 * Setelah verifikasi token, cache in-memory jangka pendek (30s) atau query DB
 * membandingkan token_version DB dengan klaim tv payload.
 */
export async function getAuthSession(req?: NextRequest): Promise<SessionPayload | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  }

  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const now = Date.now();
  const cached = tokenVersionCache.get(payload.userId);
  let dbVersion: number;

  if (cached && cached.expiresAt > now) {
    dbVersion = cached.version;
  } else {
    const { query } = await import('./db');
    const rows = await query<{ token_version: number }>(
      'SELECT token_version FROM users WHERE id = $1',
      [payload.userId]
    );
    if (rows.length === 0) return null;
    dbVersion = rows[0].token_version;
    tokenVersionCache.set(payload.userId, { version: dbVersion, expiresAt: now + 30_000 });
  }

  if (dbVersion !== (payload.tokenVersion ?? 0)) return null;
  return payload;
}

/**
 * Enforce that request has valid session, otherwise throws BusinessError.
 */
export async function requireAuth(req?: NextRequest): Promise<SessionPayload> {
  const session = await getAuthSession(req);
  if (!session) {
    throw new BusinessError('Sesi login telah berakhir. Silakan login kembali.', 401);
  }
  return session;
}

/**
 * Attach the session cookie to an outgoing NextResponse.
 */
export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: EXPIRY_DAYS * 24 * 60 * 60, // 30 days in seconds
  });
}

/**
 * Clear the session cookie on logout.
 */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
