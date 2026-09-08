import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { uuidIdParam, goalContributionSchema } from '@/lib/validations';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';
import { walletAccessCondition } from '@/lib/household';

/**
 * Alokasikan dana ke sebuah target tabungan.
 * Mencatat SATU transaksi transfer nyata (kas -> dompet tujuan goal) dan
 * menautkannya ke riwayat kontribusi, sehingga progress tidak bisa meleset dari kas. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);

    const validated = goalContributionSchema.parse(await readJsonBody(req));

    const result = await withTransaction(async (client) => {
      const goalRows = await client.query(
        'SELECT id, name, wallet_id FROM savings_goals WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [id, session.userId]
      );
      if (goalRows.rows.length === 0) {
        throw new BusinessError('Target tabungan tidak ditemukan.', 404);
      }
      const destWalletId: string | null = goalRows.rows[0].wallet_id;
      if (!destWalletId) {
        throw new BusinessError('Atur dompet penampung target ini terlebih dahulu di form Ubah.');
      }

      // Dompet sumber + tujuan dikunci urut UUID untuk menghindari deadlock transfer silang.
      // Operasional: dompet milik sendiri atau dompet bersama household boleh dipakai.
      const lockIds = [validated.wallet_id, destWalletId].sort();
      const wallets = await client.query(
        `SELECT id, balance FROM wallets WHERE id = ANY($1::uuid[])
         AND ${walletAccessCondition(2)}
         ORDER BY id FOR UPDATE`,
        [lockIds, session.userId]
      );
      if (wallets.rows.length < 2 || !wallets.rows.find((w: { id: string }) => w.id === validated.wallet_id)) {
        throw new BusinessError('Dompet sumber dana tidak ditemukan.', 404);
      }
      if (validated.wallet_id === destWalletId) {
        throw new BusinessError('Dompet sumber harus berbeda dari dompet penampung target.');
      }

      // 1. Transfer kas nyata (tanpa biaya admin)
      const trxRes = await client.query(
        `INSERT INTO transactions (user_id, type, amount, admin_fee, wallet_id, to_wallet_id, description, date)
         VALUES ($1, 'transfer', $2, 0, $3, $4, $5, $6)
         RETURNING id`,
        [session.userId, validated.amount, validated.wallet_id, destWalletId, `Alokasi Target: ${goalRows.rows[0].name}`, validated.date]
      );
      const trxId: string = trxRes.rows[0].id;

      const sourceUpdate = await client.query(
        `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2
         AND ${walletAccessCondition(3)}`,
        [validated.amount, validated.wallet_id, session.userId]
      );
      const destinationUpdate = await client.query(
        `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2
         AND ${walletAccessCondition(3)}`,
        [validated.amount, destWalletId, session.userId]
      );

      if (sourceUpdate.rowCount !== 1 || destinationUpdate.rowCount !== 1) throw new BusinessError('Saldo dompet tidak dapat diperbarui.', 409);

      // 2. Tautkan ke progres goal; UNIQUE(transaction_id) mencegah dobel hitung
      await client.query(
        `INSERT INTO goal_contributions (goal_id, user_id, transaction_id, amount, date)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, session.userId, trxId, validated.amount, validated.date]
      );

      const savedRes = await client.query(
        `SELECT CASE WHEN EXISTS (SELECT 1 FROM wallets WHERE id = $2 AND type = 'envelope' AND ${walletAccessCondition(3)}) THEN (SELECT balance::float FROM wallets WHERE id = $2) ELSE LEAST(COALESCE(SUM(amount), 0)::float, COALESCE((SELECT balance::float FROM wallets WHERE id = $2), 0)) END AS saved FROM goal_contributions WHERE goal_id = $1 AND user_id = $3`,
        [id, destWalletId, session.userId]
      );

      return { transactionId: trxId, savedAmount: savedRes.rows[0].saved };
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'goals:contribute');
  }
}
