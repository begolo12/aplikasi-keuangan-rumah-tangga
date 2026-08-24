import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { assetSchema } from '@/lib/validations';
import { BusinessError, handleRouteError, readJsonBody } from '@/lib/apiHelpers';
import { Asset } from '@/lib/types';
import { calculateAssetDepreciation } from '../route';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const rows = await query<Asset>(
      `SELECT * FROM assets WHERE id = $1 AND user_id = $2`,
      [id, session.userId]
    );

    if (rows.length === 0) {
      throw new BusinessError('Data aset tidak ditemukan', 404);
    }

    const a = rows[0];
    const calc = calculateAssetDepreciation(a);

    return NextResponse.json({
      success: true,
      data: {
        ...a,
        purchase_price: Number(a.purchase_price),
        current_value: Number(a.current_value),
        salvage_value: Number(a.salvage_value),
        useful_life_years: Number(a.useful_life_years),
        ...calc,
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/assets/[id]');
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await readJsonBody(req);
    const data = assetSchema.parse(body);

    const existing = await query<Asset>(
      `SELECT id FROM assets WHERE id = $1 AND user_id = $2`,
      [id, session.userId]
    );

    if (existing.length === 0) {
      throw new BusinessError('Data aset tidak ditemukan untuk diperbarui', 404);
    }

    const initialCurrentValue = data.current_value !== undefined && data.current_value !== null
      ? data.current_value
      : data.purchase_price;

    const updatedRows = await query<Asset>(
      `UPDATE assets SET
        name = $1,
        category = $2,
        purchase_date = $3,
        purchase_price = $4,
        current_value = $5,
        depreciation_method = $6,
        useful_life_years = $7,
        salvage_value = $8,
        notes = $9,
        updated_at = NOW()
      WHERE id = $10 AND user_id = $11
      RETURNING *`,
      [
        data.name,
        data.category,
        data.purchase_date,
        data.purchase_price,
        initialCurrentValue,
        data.depreciation_method,
        data.useful_life_years,
        data.salvage_value,
        data.notes || null,
        id,
        session.userId,
      ]
    );

    const row = updatedRows[0];
    const calc = calculateAssetDepreciation(row);

    return NextResponse.json({
      success: true,
      data: {
        ...row,
        purchase_price: Number(row.purchase_price),
        current_value: Number(row.current_value),
        salvage_value: Number(row.salvage_value),
        useful_life_years: Number(row.useful_life_years),
        ...calc,
      },
    });
  } catch (error) {
    return handleRouteError(error, 'PUT /api/assets/[id]');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const result = await query(
      `DELETE FROM assets WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, session.userId]
    );

    if (result.length === 0) {
      throw new BusinessError('Data aset tidak ditemukan untuk dihapus', 404);
    }

    return NextResponse.json({
      success: true,
      message: 'Data aset berhasil dihapus',
    });
  } catch (error) {
    return handleRouteError(error, 'DELETE /api/assets/[id]');
  }
}
