import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { registerSchema } from '@/lib/validations';
import { createSessionToken, setSessionCookie } from '@/lib/auth';
import { seedUserData } from '@/lib/seed';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [validated.email.toLowerCase()]);
    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Email sudah terdaftar. Silakan gunakan email lain atau login.' },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validated.password, salt);

    // Insert user
    const users = await query<{ id: string; name: string; email: string; family_name: string }>(
      `INSERT INTO users (name, email, password_hash, family_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, family_name`,
      [validated.name, validated.email.toLowerCase(), passwordHash, validated.family_name || 'Keluarga Bahagia']
    );

    const newUser = users[0];

    // Seed default wallets and categories for this user
    try {
      await seedUserData(newUser.id, newUser.family_name);
    } catch (seedErr) {
      console.warn('Seed warning:', seedErr);
    }

    // Create session token
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
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Register error:', error);
    const clientMessage = process.env.NODE_ENV === 'production' ? 'Terjadi kesalahan pada server saat registrasi' : (error.message || 'Registrasi gagal');
    return NextResponse.json({ success: false, error: clientMessage }, { status: 500 });
  }
}
