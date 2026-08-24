import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { withTransaction } from '@/lib/db';
import { registerSchema } from '@/lib/validations';
import { createSessionToken, setSessionCookie } from '@/lib/auth';
import { seedUserData } from '@/lib/seed';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';

export async function POST(req: NextRequest) {
  try {
    const validated = registerSchema.parse(await readJsonBody(req));
    const email = validated.email.toLowerCase();

    // Cek email, insert user, dan seed default berjalan dalam SATU transaksi:
    // gagal seed = gagal registrasi, tidak ada user setengah jadi.
    const newUser = await withTransaction(async (client) => {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        throw new BusinessError('Email sudah terdaftar. Silakan gunakan email lain atau login.');
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(validated.password, salt);

      const defaultKasName = validated.family_name?.trim() || `Kas ${validated.name.trim()}`;

      const users = await client.query<{ id: string; name: string; email: string; family_name: string }>(
        `INSERT INTO users (name, email, password_hash, family_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, family_name`,
        [validated.name, email, passwordHash, defaultKasName]
      );

      const created = users.rows[0];
      await seedUserData(client, created.id, created.family_name);
      return created;
    });

    const token = await createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      familyName: newUser.family_name,
    });

    const res = NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        family_name: newUser.family_name,
      },
    });

    setSessionCookie(res, token);
    return res;
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      return handleRouteError(
        new BusinessError('Email sudah terdaftar. Silakan gunakan email lain atau login.'),
        'register'
      );
    }
    return handleRouteError(error, 'register');
  }
}
