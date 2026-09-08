import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleRouteError, readJsonBody, BusinessError } from '@/lib/apiHelpers';
import { parseReceiptRequestSchema } from '@/lib/validations';
import { parseReceiptWithDeepSeek } from '@/lib/deepseek';
import { query } from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimit';
import { ParsedReceiptResult } from '@/lib/types';

/**
 * Ambil pemetaan merchant -> kategori hasil pembelajaran bila cukup yakin:
 * minimal 2x konfirmasi benar dan rasio benar >= 60%.
 */
async function getLearnedCategory(userId: string, merchant: string): Promise<string | null> {
  const rows = await query<{ category_id: string; correct_count: number; override_count: number }>(
    `SELECT category_id, correct_count, override_count
     FROM merchant_category_map
     WHERE user_id = $1 AND LOWER(merchant_name) = LOWER($2) AND category_id IS NOT NULL`,
    [userId, merchant.trim()]
  );
  const row = rows[0];
  if (!row) return null;
  const total = row.correct_count + row.override_count;
  if (row.correct_count < 2 || total === 0 || row.correct_count / total < 0.6) return null;
  // Pastikan kategori masih ada dan milik user ini.
  const owned = await query('SELECT id FROM categories WHERE id = $1 AND user_id = $2', [
    row.category_id,
    userId,
  ]);
  return owned.length > 0 ? row.category_id : null;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verifikasi autentikasi sesi JWT pengguna
    const session = await requireAuth(req);

    // Biaya AI per panggilan: batasi 30x per jam per user.
    const rl = checkRateLimit(`ai-parse:${session.userId}`, 30, 60 * 60 * 1000);
    if (!rl.ok) {
      throw new BusinessError(`Batas analisis struk tercapai. Coba lagi dalam ${rl.retryAfterSec} detik.`, 429);
    }
    // 2. Validasi payload teks dan data pembantu
    const rawBody = await readJsonBody(req);
    const validatedData = parseReceiptRequestSchema.parse(rawBody);

    // 3. Ekstraksi data via DeepSeek engine (server-side isolated)
    const result = await parseReceiptWithDeepSeek({
      text: validatedData.text,
      categories: validatedData.categories,
      wallets: validatedData.wallets,
    });

    // 4. AI receipt learning: pemetaan merchant yang sudah yakin menimpa usulan AI.
    if (result.merchant) {
      const learnedCategoryId = await getLearnedCategory(session.userId, result.merchant);
      if (learnedCategoryId) {
        (result as ParsedReceiptResult).suggested_category_id = learnedCategoryId;
        (result as ParsedReceiptResult).confidence = 'high';
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleRouteError(error, 'Gagal menganalisis struk belanja');
  }
}
