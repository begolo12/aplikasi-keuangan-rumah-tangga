import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { loginSchema } from '@/lib/validations';
import { createSessionToken, setSessionCookie } from '@/lib/auth';
import { handleRouteError, readJsonBody } from '@/lib/apiHelpers';

export async function POST(req: NextRequest) {
  try {
    const validated = loginSchema.parse(await readJsonBody(req));

    const users = await query<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
      family_name: string;
    }>('SELECT id, name, email, password_hash, family_name FROM users WHERE email = $1', [
      validated.email.toLowerCase(),
    ]);

    if (users.length === 0) {
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
