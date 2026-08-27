import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Error bisnis yang pesannya aman ditampilkan ke client.
 * Semua lemparan error yang menghadap user wajib memakai class ini.
 */
export class BusinessError extends Error {
  status: number;

  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'BusinessError';
    this.status = status;
  }
}

/**
 * Pemetaan error terpusat untuk semua route handler.
 * - ZodError      -> 400 dengan pesan validasi pertama
 * - BusinessError -> status sesuai definisi, pesan aman
 * - Lainnya       -> 500 generik di production, detail hanya di development
 */
export function handleRouteError(error: unknown, context: string): NextResponse {
  if (error instanceof ZodError) {
    const message = error.errors[0]?.message ?? 'Data tidak valid.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  if (error instanceof BusinessError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }

  // Handle Postgres known error codes gracefully with clear user messages
  const pgError = error as { code?: string; constraint?: string; message?: string };
  if (pgError && typeof pgError.code === 'string') {
    if (pgError.code === '23514') {
      return NextResponse.json(
        { success: false, error: 'Nilai data tidak memenuhi batasan validasi sistem.' },
        { status: 400 }
      );
    }
    if (pgError.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Data yang sama sudah tercatat di sistem (duplikat).' },
        { status: 409 }
      );
    }
    if (pgError.code === '23503') {
      return NextResponse.json(
        { success: false, error: 'Data referensi (dompet atau kategori) tidak ditemukan.' },
        { status: 404 }
      );
    }
    if (pgError.code === '22P02') {
      return NextResponse.json(
        { success: false, error: 'Format data input (ID atau angka) tidak valid.' },
        { status: 400 }
      );
    }
  }

  console.error(`[api:${context}]`, error);
  const isProduction = process.env.NODE_ENV === 'production';
  const fallback = 'Terjadi kesalahan pada server.';
  const message = isProduction ? fallback : ((error as Error)?.message || fallback);
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

/**
 * Body JSON yang gagal parse menjadi BusinessError, bukan SyntaxError misterius.
 */
export async function readJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new BusinessError('Format body request tidak valid (harus JSON).');
  }
}
