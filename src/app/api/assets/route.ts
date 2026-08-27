import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { assetSchema, assetQuerySchema } from '@/lib/validations';
import { handleRouteError, readJsonBody } from '@/lib/apiHelpers';
import { Asset, DepreciationMethod } from '@/lib/types';

export function calculateAssetDepreciation(asset: {
  purchase_date: string;
  purchase_price: number | string;
  current_value?: number | string | null;
  depreciation_method: DepreciationMethod;
  useful_life_years: number;
  salvage_value: number | string;
}) {
  const purchasePrice = Number(asset.purchase_price) || 0;
  const salvageValue = Number(asset.salvage_value) || 0;
  const usefulYears = Math.max(1, Number(asset.useful_life_years) || 5);
  const method = asset.depreciation_method || 'straight_line';

  const purchaseDate = new Date(asset.purchase_date);
  const now = new Date();
  
  let ageMonths = 0;
  if (!isNaN(purchaseDate.getTime())) {
    ageMonths = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
    if (ageMonths < 0) ageMonths = 0;
  }

  const totalLifeMonths = usefulYears * 12;

  let monthlyDepreciation = 0;
  let annualDepreciation = 0;
  let accumulatedDepreciation = 0;
  let bookValue = purchasePrice;

  if (method === 'none') {
    monthlyDepreciation = 0;
    annualDepreciation = 0;
    accumulatedDepreciation = 0;
    const curr = Number(asset.current_value);
    bookValue = curr > 0 ? curr : purchasePrice;
  } else if (method === 'declining_balance') {
    const rate = Math.min(1, 2 / usefulYears);
    const ageYears = ageMonths / 12;
    const computedBook = purchasePrice * Math.pow(Math.max(0, 1 - rate), ageYears);
    bookValue = Math.max(salvageValue, Math.round(computedBook * 100) / 100);
    accumulatedDepreciation = Math.max(0, purchasePrice - bookValue);
    annualDepreciation = bookValue > salvageValue ? bookValue * rate : 0;
    monthlyDepreciation = annualDepreciation / 12;
  } else {
    // Default straight_line
    const depreciableBase = Math.max(0, purchasePrice - salvageValue);
    monthlyDepreciation = totalLifeMonths > 0 ? depreciableBase / totalLifeMonths : 0;
    annualDepreciation = monthlyDepreciation * 12;
    accumulatedDepreciation = Math.min(depreciableBase, monthlyDepreciation * ageMonths);
    bookValue = Math.max(salvageValue, purchasePrice - accumulatedDepreciation);
  }

  const marketValue = Number(asset.current_value) > 0 ? Number(asset.current_value) : Math.round(bookValue);
  const marketDiffPurchase = marketValue - purchasePrice; // Positif: Apresiasi, Negatif: Depresiasi
  const marketDiffBook = marketValue - Math.round(bookValue);
  const marketDiffPct = purchasePrice > 0 ? Math.round((marketDiffPurchase / purchasePrice) * 100) : 0;

  return {
    age_months: ageMonths,
    monthly_depreciation: Math.round(monthlyDepreciation),
    annual_depreciation: Math.round(annualDepreciation),
    accumulated_depreciation: Math.round(accumulatedDepreciation),
    book_value: Math.round(bookValue),
    market_diff_purchase: marketDiffPurchase,
    market_diff_book: marketDiffBook,
    market_diff_pct: marketDiffPct,
    is_market_gain: marketDiffPurchase >= 0,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);

    const parsedQuery = assetQuerySchema.parse({
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || 'active',
    });

    const values: (string | number | boolean)[] = [session.userId];
    let sql = `
      SELECT 
        id, user_id, name, category, purchase_date,
        purchase_price, current_value, depreciation_method,
        useful_life_years, salvage_value, notes,
        is_sold, sold_date, selling_price, gain_loss,
        created_at, updated_at
      FROM assets
      WHERE user_id = $1
    `;

    if (parsedQuery.status === 'active') {
      sql += ` AND is_sold = FALSE`;
    } else if (parsedQuery.status === 'sold') {
      sql += ` AND is_sold = TRUE`;
    }

    if (parsedQuery.category) {
      values.push(parsedQuery.category);
      sql += ` AND category = $${values.length}`;
    }

    if (parsedQuery.search) {
      values.push(`%${parsedQuery.search}%`);
      sql += ` AND (name ILIKE $${values.length} OR notes ILIKE $${values.length})`;
    }

    sql += ` ORDER BY purchase_date DESC, created_at DESC`;

    const rawAssets = await query<Asset>(sql, values);

    let totalPurchaseValue = 0;
    let totalBookValue = 0;
    let totalAccumulatedDepreciation = 0;
    let totalMonthlyDepreciation = 0;

    const assets = rawAssets.map((a) => {
      const calc = calculateAssetDepreciation(a);
      const purchasePrice = Number(a.purchase_price);
      const currentValue = Number(a.current_value) || purchasePrice;
      const salvageValue = Number(a.salvage_value) || 0;

      totalPurchaseValue += purchasePrice;
      totalBookValue += calc.book_value;
      totalAccumulatedDepreciation += calc.accumulated_depreciation;
      totalMonthlyDepreciation += calc.monthly_depreciation;

      return {
        ...a,
        purchase_price: purchasePrice,
        current_value: currentValue,
        salvage_value: salvageValue,
        useful_life_years: Number(a.useful_life_years),
        ...calc,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        assets,
        summary: {
          total_assets_count: assets.length,
          total_purchase_value: totalPurchaseValue,
          total_book_value: totalBookValue,
          total_accumulated_depreciation: totalAccumulatedDepreciation,
          total_monthly_depreciation: totalMonthlyDepreciation,
        },
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/assets');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await readJsonBody(req);
    const data = assetSchema.parse(body);

    const initialCurrentValue = data.current_value !== undefined && data.current_value !== null
      ? data.current_value
      : data.purchase_price;

    const result = await withTransaction(async (client) => {
      // 1. Insert ke tabel assets
      const insAsset = await client.query<Asset>(
        `INSERT INTO assets (
          user_id, name, category, purchase_date, purchase_price,
          current_value, depreciation_method, useful_life_years,
          salvage_value, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          session.userId,
          data.name,
          data.category,
          data.purchase_date,
          data.purchase_price,
          initialCurrentValue,
          data.depreciation_method,
          data.useful_life_years,
          data.salvage_value,
          data.notes || null,
        ]
      );
      const row = insAsset.rows[0];

      // 2. Jika opsi record_purchase_transaction aktif dan dompet dipilih, potong saldo & catat transaksi
      if (data.record_purchase_transaction && data.wallet_id) {
        // Potong saldo dompet (diizinkan minus)
        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [data.purchase_price, data.wallet_id, session.userId]
        );

        // Catat transaksi pembelian aset
        await client.query(
          `INSERT INTO transactions (
            user_id, type, amount, category_id, wallet_id, asset_id, description, date
          ) VALUES ($1, 'expense', $2, NULL, $3, $4, $5, $6)`,
          [
            session.userId,
            data.purchase_price,
            data.wallet_id,
            row.id,
            `Pembelian Aset: ${data.name}`,
            data.purchase_date,
          ]
        );
      }

      // 3. Jika ada jadwal pajak rutin, masukkan ke recurring_bills
      if (data.schedule_tax_amount && data.schedule_tax_amount > 0) {
        await client.query(
          `INSERT INTO recurring_bills (
            user_id, type, title, amount, due_day, wallet_id, asset_id, auto_record, is_active
          ) VALUES ($1, 'expense', $2, $3, $4, $5, $6, FALSE, TRUE)`,
          [
            session.userId,
            `Pajak Aset: ${data.name}`,
            data.schedule_tax_amount,
            data.schedule_tax_due_day || 15,
            data.wallet_id || null,
            row.id,
          ]
        );
      }

      // 4. Jika ada jadwal servis/maintenance rutin, masukkan ke recurring_bills
      if (data.schedule_maintenance_amount && data.schedule_maintenance_amount > 0) {
        await client.query(
          `INSERT INTO recurring_bills (
            user_id, type, title, amount, due_day, wallet_id, asset_id, auto_record, is_active
          ) VALUES ($1, 'expense', $2, $3, $4, $5, $6, FALSE, TRUE)`,
          [
            session.userId,
            `Servis / Perawatan Rutin: ${data.name}`,
            data.schedule_maintenance_amount,
            data.schedule_maintenance_due_day || 20,
            data.wallet_id || null,
            row.id,
          ]
        );
      }

      return row;
    });

    const calc = calculateAssetDepreciation(result);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...result,
          purchase_price: Number(result.purchase_price),
          current_value: Number(result.current_value),
          salvage_value: Number(result.salvage_value),
          useful_life_years: Number(result.useful_life_years),
          ...calc,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, 'POST /api/assets');
  }
}
