import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { loginSchema } from '@/lib/validations';
import { createSessionToken, setSessionCookie } from '@/lib/auth';
import { handleRouteError, readJsonBody, BusinessError } from '@/lib/apiHelpers';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// respons login saat email tidak terdaftar (mitigasi timing oracle).
const DUMMY_PASSWORD_HASH = '$2b$10$wR.9a89qyryD/bHHd1j09uQ/XsA.DGy8UFcrMAUdvfNPNBa1lPYCm';

export async function POST(req: NextRequest) {
  try {
    const validated = loginSchema.parse(await readJsonBody(req));

    // Rate limit: 10 percobaan per 10 menit per kombinasi IP + email.
    const rl = checkRateLimit(`login:${getClientIp(req)}:${validated.email.toLowerCase()}`, 10, 10 * 60 * 1000);
    if (!rl.ok) {
      throw new BusinessError(`Terlalu banyak percobaan login. Coba lagi dalam ${rl.retryAfterSec} detik.`, 429);
    }


    const users = await query<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
      family_name: string;
      token_version: number;
    }>('SELECT id, name, email, password_hash, family_name, token_version FROM users WHERE email = $1', [
      validated.email.toLowerCase(),
    ]);

    // Email tak dikenal tetap dibayar dengan satu bcrypt.compare agar waktu
    // respons identik dengan password salah (anti enumerasi email via timing).
    if (users.length === 0) {
      await bcrypt.compare(validated.password, DUMMY_PASSWORD_HASH);
      return NextResponse.json(
        { success: false, error: 'Email atau kata sandi tidak sesuai.' },
        { status: 401 }
      );
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(validated.password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Email atau kata sandi tidak sesuai.' },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      familyName: user.family_name,
      tokenVersion: user.token_version,
    });

    const res = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        family_name: user.family_name,
      },
    });

    setSessionCookie(res, token);
    return res;
  } catch (error) {
    return handleRouteError(error, 'auth:login');
  }
}
