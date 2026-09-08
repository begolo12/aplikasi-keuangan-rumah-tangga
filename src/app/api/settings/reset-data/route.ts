import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { resetDataSchema } from '@/lib/validations';
import { handleRouteError, readJsonBody, BusinessError } from '@/lib/apiHelpers';
import { checkRateLimit } from '@/lib/rateLimit';

/**
 * Reset seluruh data keuangan user mulai dari nol.
 * Dalam satu transaksi: hapus seluruh data aktivitas DAN definisi terkait angka
 * (transaksi, anggaran, hutang, aset, tagihan rutin, target tabungan, pembayaran,
 * kontribusi, pembelajaran AI) serta nol-kan saldo semua dompet.
 * Dipertahankan: akun, dompet, kategori, household, settings.
 * Wajib konfirmasi body { confirmation: "RESET" }.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 5 reset per jam per user id.
    const rl = checkRateLimit(`reset-data:${session.userId}`, 5, 60 * 60 * 1000);
    if (!rl.ok) {
      throw new BusinessError(`Terlalu banyak permintaan reset data. Coba lagi dalam ${rl.retryAfterSec} detik.`, 429);
    }

    resetDataSchema.parse(await readJsonBody(req));

    await withTransaction(async (client) => {
      // Urutan hapus menghindari referensi yatim (anak dulu, baru induk).
      await client.query('DELETE FROM goal_contributions WHERE user_id = $1', [session.userId]);
      await client.query('DELETE FROM savings_goals WHERE user_id = $1', [session.userId]);
      await client.query('DELETE FROM bill_payments WHERE user_id = $1', [session.userId]);
      await client.query('DELETE FROM recurring_bills WHERE user_id = $1', [session.userId]);
      await client.query('DELETE FROM transactions WHERE user_id = $1', [session.userId]);
      await client.query('DELETE FROM budgets WHERE user_id = $1', [session.userId]);
      await client.query('DELETE FROM debts WHERE user_id = $1', [session.userId]);
      await client.query('DELETE FROM assets WHERE user_id = $1', [session.userId]);
      await client.query('DELETE FROM merchant_category_map WHERE user_id = $1', [session.userId]);
      await client.query(
        `UPDATE wallets
         SET balance = 0, reconciled_at = NULL, last_reconciled_balance = NULL, updated_at = NOW()
         WHERE user_id = $1`,
        [session.userId]
      );
    });

    return NextResponse.json({
      success: true,
      data: { reset: true, message: 'Seluruh data keuangan berhasil direset ke nol.' },
    });
  } catch (error) {
    return handleRouteError(error, 'settings:reset-data');
  }
}
