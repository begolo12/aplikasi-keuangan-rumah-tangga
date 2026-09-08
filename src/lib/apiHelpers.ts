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

const MAX_BODY_BYTES = 2_500_000;

/**
 * Body JSON yang gagal parse menjadi BusinessError, bukan SyntaxError misterius.
 * Content-length dicek cepat; bila header tak ada (chunked), stream dibaca dengan
 * akumulator dan batas keras MAX_BODY_BYTES.
 */
export async function readJsonBody(req: NextRequest): Promise<unknown> {
  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      throw new BusinessError('Ukuran request terlalu besar.', 413);
    }

    if (req.body) {
      const reader = req.body.getReader();
      const decoder = new TextDecoder();
      let total = 0;
      let text = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BODY_BYTES) {
          await reader.cancel();
          throw new BusinessError('Ukuran request terlalu besar.', 413);
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
      if (text.length === 0) return undefined;
      return JSON.parse(text);
    }

    return await req.json();
  } catch (error) {
    if (error instanceof BusinessError) throw error;
    throw new BusinessError('Format body request tidak valid (harus JSON).');
  }
}

/**
 * Verifikasi same-origin untuk mutation endpoint sebagai CSRF defense-in-depth.
 * Memeriksa Origin header sesuai RFC 6454 dan CORS spec.
 * Return true bila request aman (origin match atau tidak ada origin = xhr sama-domain),
 * false jika origin mismatch atau header absen pada cross-origin fetch.
 */
export function verifySameOrigin(req: NextRequest): boolean {
  const requestedOrigin = req.headers.get('origin');
  if (!requestedOrigin) return true; // XMLHttpRequest tanpa origin = same-domain

  const hostHeader = req.headers.get('host') ?? 'localhost';

  try {
    const url = new URL(requestedOrigin);
    return url.hostname === hostHeader.split(':')[0] && url.protocol === window.location.protocol;
  } catch {
    return false;
  }
}
