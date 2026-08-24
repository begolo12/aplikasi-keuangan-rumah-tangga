import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
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

  return {
    age_months: ageMonths,
    monthly_depreciation: Math.round(monthlyDepreciation),
    annual_depreciation: Math.round(annualDepreciation),
    accumulated_depreciation: Math.round(accumulatedDepreciation),
    book_value: Math.round(bookValue),
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
    });

    const values: (string | number)[] = [session.userId];
    let sql = `
      SELECT 
        id, user_id, name, category, purchase_date,
        purchase_price, current_value, depreciation_method,
        useful_life_years, salvage_value, notes,
        created_at, updated_at
      FROM assets
      WHERE user_id = $1
    `;

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

    const result = await query<Asset>(
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

    const row = result[0];
    const calc = calculateAssetDepreciation(row);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...row,
          purchase_price: Number(row.purchase_price),
          current_value: Number(row.current_value),
          salvage_value: Number(row.salvage_value),
          useful_life_years: Number(row.useful_life_years),
          ...calc,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, 'POST /api/assets');
  }
}
