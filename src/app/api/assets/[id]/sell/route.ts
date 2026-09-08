import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { sellAssetSchema, uuidIdParam } from '@/lib/validations';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';
import { Asset } from '@/lib/types';
import { calculateAssetDepreciation } from '../../route';
import { walletAccessCondition } from '@/lib/household';
import { formatRupiah } from '@/lib/formatters';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    const assetId = uuidIdParam.parse(id);
    const validated = sellAssetSchema.parse(await readJsonBody(req));

    const result = await withTransaction(async (client) => {
      // 1. Ambil & kunci data aset
      const assetRows = await client.query<Asset>(
        'SELECT * FROM assets WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [assetId, session.userId]
      );

      if (assetRows.rows.length === 0) {
        throw new BusinessError('Data aset tidak ditemukan.', 404);
      }

      const asset = assetRows.rows[0];
      if (asset.is_sold) {
        throw new BusinessError('Aset ini sudah pernah tercatat terjual.', 400);
      }

      // 2. Hitung nilai buku sisa depresiasi saat tanggal jual
      const calc = calculateAssetDepreciation({
        purchase_date: asset.purchase_date,
        purchase_price: Number(asset.purchase_price),
        depreciation_method: asset.depreciation_method,
        useful_life_years: Number(asset.useful_life_years),
        salvage_value: Number(asset.salvage_value),
      });

      const bookValueAtSale = calc.book_value;
      const sellingPrice = validated.selling_price;
      const gainLoss = sellingPrice - bookValueAtSale; // Plus (+) Untung, Minus (-) Rugi dari nilai buku
      const gainLossFromPurchase = sellingPrice - Number(asset.purchase_price);

      // 3. Kunci dompet penerima & tambah saldo (operasional: milik sendiri atau bersama).
      const walletRes = await client.query(
        `SELECT id, name, balance FROM wallets WHERE id = $1
         AND ${walletAccessCondition(2)}
         FOR UPDATE`,
        [validated.wallet_id, session.userId]
      );

      if (walletRes.rows.length === 0) {
        throw new BusinessError('Dompet penerima dana tidak ditemukan.', 404);
      }

      await client.query(
        `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2
         AND ${walletAccessCondition(3)}`,
        [sellingPrice, validated.wallet_id, session.userId]
      );
      // 3b. Pelunasan hutang dari hasil jual (opsional): potong kas hasil jual,
      // catat expense + debt_payments dalam transaksi atomik yang sama.
      let payoff: { debt_id: string; amount: number; remaining: number } | null = null;
      if (validated.debt_id) {
        const debtRows = await client.query(
          'SELECT id, type, person_name, total_amount::float AS total_amount, paid_amount::float AS paid_amount FROM debts WHERE id = $1 AND user_id = $2 FOR UPDATE',
          [validated.debt_id, session.userId]
        );
        if (debtRows.rows.length === 0) {
          throw new BusinessError('Hutang untuk pelunasan tidak ditemukan.', 404);
        }
        const target = debtRows.rows[0];
        if (target.type !== 'payable') {
          throw new BusinessError('Hanya hutang (kewajiban) yang bisa dilunasi dari hasil jual.', 400);
        }
        const remaining = target.total_amount - target.paid_amount;
        if (remaining <= 0) {
          throw new BusinessError('Hutang ini sudah lunas.', 400);
        }
        const applied = Math.min(validated.debt_payment_amount ?? remaining, remaining);
        if (applied <= 0) {
          throw new BusinessError('Nominal pelunasan harus lebih dari 0.', 400);
        }
        await client.query(
          `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2
           AND ${walletAccessCondition(3)}`,
          [applied, validated.wallet_id, session.userId]
        );
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, category_id, wallet_id, description, date)
           VALUES ($1, 'expense', $2, NULL, $3, $4, $5)`,
          [session.userId, applied, validated.wallet_id, `Pelunasan hutang ${target.person_name} dari hasil jual ${asset.name}`, validated.sold_date]
        );
        await client.query(
          `INSERT INTO debt_payments (debt_id, user_id, wallet_id, amount, payment_date, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [validated.debt_id, session.userId, validated.wallet_id, applied, validated.sold_date, `Pelunasan dari hasil jual aset: ${asset.name}`]
        );
        const newPaid = target.paid_amount + applied;
        await client.query(
          'UPDATE debts SET paid_amount = $1, status = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4',
          [newPaid, newPaid >= target.total_amount ? 'paid' : 'partial', validated.debt_id, session.userId]
        );
        payoff = { debt_id: validated.debt_id, amount: applied, remaining: remaining - applied };
      }


      // 4. Catat laba/rugi penjualan (gain-only): yang masuk laporan hanya selisih
      // vs nilai buku, bukan seluruh harga jual. Kas dompet tetap terima penuh (langkah 3).
      let saleTrx = null;
      if (gainLoss > 0) {
        const gainDesc = validated.notes
          ? `Laba Penjualan Aset: ${asset.name} (${validated.notes})`
          : `Laba Penjualan Aset: ${asset.name} (+${formatRupiah(gainLoss)} vs nilai buku)`;
        const insGain = await client.query(
          `INSERT INTO transactions (
            user_id, type, amount, category_id, wallet_id, asset_id, description, date
          ) VALUES ($1, 'income', $2, NULL, $3, $4, $5, $6)
          RETURNING *`,
          [
            session.userId,
            gainLoss,
            validated.wallet_id,
            assetId,
            gainDesc,
            validated.sold_date,
          ]
        );
        saleTrx = insGain.rows[0];
      } else if (gainLoss < 0) {
        const lossDesc = validated.notes
          ? `Rugi Penjualan Aset: ${asset.name} (${validated.notes})`
          : `Rugi Penjualan Aset: ${asset.name} (${formatRupiah(gainLoss)} vs nilai buku)`;
        const insLoss = await client.query(
          `INSERT INTO transactions (
            user_id, type, amount, category_id, wallet_id, asset_id, description, date
          ) VALUES ($1, 'expense', $2, NULL, $3, $4, $5, $6)
          RETURNING *`,
          [
            session.userId,
            Math.abs(gainLoss),
            validated.wallet_id,
            assetId,
            lossDesc,
            validated.sold_date,
          ]
        );
        saleTrx = insLoss.rows[0];
      }

      // 5. Otomatis nonaktifkan semua jadwal rutin (pajak/servis) terkait aset ini
      await client.query(
        'UPDATE recurring_bills SET is_active = FALSE WHERE asset_id = $1 AND user_id = $2',
        [assetId, session.userId]
      );

      // 6. Update status aset menjadi terjual
      const updatedAssetRes = await client.query<Asset>(
        `UPDATE assets
         SET is_sold = TRUE,
             sold_date = $1,
             selling_price = $2,
             gain_loss = $3,
             updated_at = NOW()
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [validated.sold_date, sellingPrice, gainLoss, assetId, session.userId]
      );

      return {
        asset: updatedAssetRes.rows[0],
        book_value_at_sale: bookValueAtSale,
        selling_price: sellingPrice,
        gain_loss: gainLoss,
        gain_loss_from_purchase: gainLossFromPurchase,
        is_gain: gainLoss >= 0,
        transaction: saleTrx,
        payoff,
      };
    });

    return NextResponse.json({
      success: true,
      message: result.is_gain
        ? `Aset berhasil dijual dengan keuntungan ${formatRupiah(result.gain_loss)} di atas nilai buku.`
        : `Aset berhasil dijual dengan selisih ${formatRupiah(result.gain_loss)} dari nilai buku.`,
      data: result,
    });
  } catch (error) {
    return handleRouteError(error, 'assets:sell');
  }
}
