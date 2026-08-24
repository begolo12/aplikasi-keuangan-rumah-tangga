import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { BusinessError } from './apiHelpers';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production.');
  }
  return new TextEncoder().encode(secret || 'dev_jwt_secret_fallback_key');
}

const COOKIE_NAME = 'kas_session_token';
const EXPIRY_DAYS = 30;

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  familyName: string;
}

/**
 * Sign a JWT token for the user session.
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(getJwtSecret());
}

/**
 * Verify a JWT session token.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      familyName: payload.familyName as string,
    };
  } catch {
    return null;
  }
}

/**
 * Get current authenticated user session from NextRequest or cookies().
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
  return verifySessionToken(token);
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
