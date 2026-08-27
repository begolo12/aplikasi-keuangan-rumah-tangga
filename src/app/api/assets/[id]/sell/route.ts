import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { sellAssetSchema, uuidIdParam } from '@/lib/validations';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';
import { Asset } from '@/lib/types';
import { calculateAssetDepreciation } from '../../route';
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

      // 3. Kunci dompet penerima & tambah saldo
      const walletRes = await client.query(
        'SELECT id, name, balance FROM wallets WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [validated.wallet_id, session.userId]
      );

      if (walletRes.rows.length === 0) {
        throw new BusinessError('Dompet penerima dana tidak ditemukan.', 404);
      }

      await client.query(
        'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [sellingPrice, validated.wallet_id, session.userId]
      );

      // 4. Catat transaksi pemasukan kas dari penjualan aset
      const trxDesc = validated.notes
        ? `Hasil Penjualan Aset: ${asset.name} (${validated.notes})`
        : `Hasil Penjualan Aset: ${asset.name} (Laba/Rugi Buku: ${gainLoss >= 0 ? '+' : ''}${formatRupiah(gainLoss)})`;

      const insTrx = await client.query(
        `INSERT INTO transactions (
          user_id, type, amount, category_id, wallet_id, asset_id, description, date
        ) VALUES ($1, 'income', $2, NULL, $3, $4, $5, $6)
        RETURNING *`,
        [
          session.userId,
          sellingPrice,
          validated.wallet_id,
          assetId,
          trxDesc,
          validated.sold_date,
        ]
      );

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
        transaction: insTrx.rows[0],
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
