import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';
import { uuidIdParam, transactionSchema } from '@/lib/validations';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);

    await withTransaction(async (client) => {
      // 1. Kunci baris transaksi milik user ini.
      const trxRows = await client.query(
        'SELECT * FROM transactions WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [id, session.userId]
      );

      if (trxRows.rows.length === 0) {
        throw new BusinessError('Transaksi tidak ditemukan.', 404);
      }

      const trx = trxRows.rows[0];
      const amount = parseFloat(trx.amount);
      const adminFee = parseFloat(trx.admin_fee || 0);

      // 2. Balik saldo dompet; semua akses wallet difilter user_id.
      if (trx.type === 'expense') {
        await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [amount, trx.wallet_id, session.userId]
        );
      } else if (trx.type === 'income') {
        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [amount, trx.wallet_id, session.userId]
        );
      } else if (trx.type === 'transfer') {
        await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [amount + adminFee, trx.wallet_id, session.userId]
        );
        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [amount, trx.to_wallet_id, session.userId]
        );
      }

      // 3. Hapus catatan transaksi.
      await client.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, session.userId]);
    });

    return NextResponse.json({ success: true, message: 'Transaksi berhasil dihapus.' });
  } catch (error) {
    return handleRouteError(error, 'transactions:delete');
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);

    const rawBody = (await readJsonBody(req)) as Record<string, unknown> | null;

    // Anti-replay revisi basi (utk replay antrean offline lintas perangkat/tab):
    // bila client mengirim expected_updated_at dan baris ternyata lebih baru -> konflik.
    const expectedUpdatedAt =
      typeof rawBody?.expected_updated_at === 'string' && rawBody.expected_updated_at
        ? rawBody.expected_updated_at
        : null;

    const validated = transactionSchema.parse(rawBody);

    const updatedTrx = await withTransaction(async (client) => {
      // 1. Kunci baris transaksi lama milik user ini.
      const trxRows = await client.query(
        'SELECT * FROM transactions WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [id, session.userId]
      );

      if (trxRows.rows.length === 0) {
        throw new BusinessError('Transaksi tidak ditemukan.', 404);
      }

      const oldTrx = trxRows.rows[0];

      if (
        expectedUpdatedAt &&
        new Date(oldTrx.updated_at as string | Date).getTime() >
          new Date(expectedUpdatedAt).getTime()
      ) {
        throw new BusinessError(
          'Transaksi telah berubah di tempat lain. Muat ulang halaman sebelum menyimpan.',
          409
        );
      }

      const oldAmount = parseFloat(oldTrx.amount);
      const oldAdminFee = parseFloat(oldTrx.admin_fee || 0);

      // Kategori baru wajib milik user ini dan cocok tipenya jika bukan transfer
      if (validated.category_id) {
        const owned = await client.query('SELECT type FROM categories WHERE id = $1 AND user_id = $2', [
          validated.category_id,
          session.userId,
        ]);
        if (owned.rows.length === 0) {
          throw new BusinessError('Kategori tidak ditemukan pada akun Anda.');
        }
        const expectedType = validated.type === 'income' ? 'income' : 'expense';
        if (validated.type !== 'transfer' && owned.rows[0].type !== expectedType) {
          throw new BusinessError('Tipe kategori tidak cocok dengan tipe transaksi.');
        }
      }

      // Kunci semua dompet yang terlibat (lama + baru) dengan urutan UUID kanonik untuk hindari deadlock
      const lockIds = Array.from(
        new Set([
          oldTrx.wallet_id,
          ...(oldTrx.to_wallet_id ? [oldTrx.to_wallet_id] : []),
          validated.wallet_id,
          ...(validated.to_wallet_id ? [validated.to_wallet_id] : []),
        ])
      ).sort();

      const _locked = await client.query(
        'SELECT id, name, balance FROM wallets WHERE id = ANY($1::uuid[]) AND user_id = $2 ORDER BY id FOR UPDATE',
        [lockIds, session.userId]
      );
      void _locked;

      // 2. Balik efek saldo transaksi lama
      if (oldTrx.type === 'expense') {
        await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [oldAmount, oldTrx.wallet_id, session.userId]
        );
      } else if (oldTrx.type === 'income') {
        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [oldAmount, oldTrx.wallet_id, session.userId]
        );
      } else if (oldTrx.type === 'transfer') {
        await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [oldAmount + oldAdminFee, oldTrx.wallet_id, session.userId]
        );
        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [oldAmount, oldTrx.to_wallet_id, session.userId]
        );
      }

      // Refresh saldo terkini dompet setelah pembalikan
      const refreshedWallets = await client.query(
        'SELECT id, name, balance FROM wallets WHERE id = ANY($1::uuid[]) AND user_id = $2',
        [lockIds, session.userId]
      );

      const sourceWallet = refreshedWallets.rows.find((r: { id: string }) => r.id === validated.wallet_id);
      const destWallet = validated.to_wallet_id
        ? refreshedWallets.rows.find((r: { id: string }) => r.id === validated.to_wallet_id)
        : null;

      if (!sourceWallet) {
        throw new BusinessError('Dompet asal tidak ditemukan.', 404);
      }
      if (validated.type === 'transfer' && !destWallet) {
        throw new BusinessError('Dompet tujuan tidak ditemukan.', 404);
      }

      const totalDebit =
        validated.type === 'transfer' ? validated.amount + (validated.admin_fee || 0) : validated.amount;

      // 3. Terapkan efek saldo transaksi baru (saldo diizinkan minus)
      if (validated.type === 'expense') {
        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [validated.amount, validated.wallet_id, session.userId]
        );
      } else if (validated.type === 'income') {
        await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [validated.amount, validated.wallet_id, session.userId]
        );
      } else if (destWallet) {
        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [totalDebit, validated.wallet_id, session.userId]
        );
        await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [validated.amount, validated.to_wallet_id, session.userId]
        );
      }

      // 4. Update data transaksi
      const res = await client.query(
        `UPDATE transactions SET
          type = $1,
          amount = $2,
          admin_fee = $3,
          category_id = $4,
          wallet_id = $5,
          to_wallet_id = $6,
          description = $7,
          date = $8,
          updated_at = NOW(),
          edited_at = NOW()
        WHERE id = $9 AND user_id = $10
        RETURNING *`,
        [
          validated.type,
          validated.amount,
          validated.admin_fee || 0,
          validated.category_id || null,
          validated.wallet_id,
          validated.to_wallet_id || null,
          validated.description || null,
          validated.date,
          id,
          session.userId,
        ]
      );

      return res.rows[0];
    });

    return NextResponse.json({ success: true, data: updatedTrx });
  } catch (error) {
    return handleRouteError(error, 'transactions:update');
  }
}
