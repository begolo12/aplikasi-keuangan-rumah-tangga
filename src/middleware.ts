import { NextRequest, NextResponse } from 'next/server';

/**
 * CSRF defense-in-depth terpusat (SEC-08): tolak request mutasi lintas-origin.
 * Origin sama-domain (atau tanpa Origin = fetch same-domain) diterima.
 * Cookie httpOnly + SameSite tetap lapisan utama; ini lapisan kedua.
 */
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // fetch same-domain / non-browser client

  const host = req.headers.get('host') ?? 'localhost';
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');

  try {
    const url = new URL(origin);
    return url.hostname === host.split(':')[0] && url.protocol === `${proto}:`;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  if (MUTATION_METHODS.has(req.method) && !isSameOrigin(req)) {
    return NextResponse.json(
      { success: false, error: 'Permintaan lintas-origin ditolak.' },
      { status: 403 }
    );
  }
  return NextResponse.next();
}

export const config = {
  // Hanya jalankan pada route API; halaman tidak perlu.
  matcher: '/api/:path*',
};
