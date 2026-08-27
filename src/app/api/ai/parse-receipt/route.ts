import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleRouteError, readJsonBody } from '@/lib/apiHelpers';
import { parseReceiptRequestSchema } from '@/lib/validations';
import { parseReceiptWithDeepSeek } from '@/lib/deepseek';

export async function POST(req: NextRequest) {
  try {
    // 1. Verifikasi autentikasi sesi JWT pengguna
    await requireAuth(req);

    // 2. Validasi payload teks dan data pembantu
    const rawBody = await readJsonBody(req);
    const validatedData = parseReceiptRequestSchema.parse(rawBody);

    // 3. Ekstraksi data via DeepSeek engine (server-side isolated)
    const result = await parseReceiptWithDeepSeek({
      text: validatedData.text,
      categories: validatedData.categories,
      wallets: validatedData.wallets,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleRouteError(error, 'Gagal menganalisis struk belanja');
  }
}
