import { getLocalDateString } from '@/lib/formatters';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { debtSchema, debtQuerySchema } from '@/lib/validations';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const searchParams = req.nextUrl.searchParams;
    const rawType = searchParams.get('type') || undefined;
    const rawStatus = searchParams.get('status') || undefined;

    const parsedQuery = debtQuerySchema.safeParse({ type: rawType, status: rawStatus });
    const { type, status } = parsedQuery.success ? parsedQuery.data : {};

    let sql = `
      SELECT 
        id,
        user_id,
        type,
        category,
        person_name,
        total_amount::float AS total_amount,
        paid_amount::float AS paid_amount,
        (total_amount - paid_amount)::float AS remaining_amount,
        principal_amount::float AS principal_amount,
        interest_rate::float AS interest_rate,
        interest_type,
        tenor_months,
        monthly_installment::float AS monthly_installment,
        total_interest::float AS total_interest,
        start_date,
        due_date,
        notes,
        status,
        CASE 
          WHEN due_date IS NOT NULL THEN (due_date - CURRENT_DATE)
          ELSE NULL 
        END AS days_until_due,
        CASE 
          WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE AND status != 'paid' THEN TRUE
          ELSE FALSE 
        END AS is_overdue,
        created_at,
        updated_at
      FROM debts
      WHERE user_id = $1
    `;

    const params: unknown[] = [user.userId];
    let pIdx = 2;

    if (type) {
      sql += ` AND type = $${pIdx}`;
      params.push(type);
      pIdx++;
    }

    if (status) {
      sql += ` AND status = $${pIdx}`;
      params.push(status);
      pIdx++;
    }

    sql += ` ORDER BY status ASC, due_date ASC NULLS LAST, created_at DESC`;

    const rows = await query(sql, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return handleRouteError(error, 'debts:get');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await readJsonBody(req);
    const validated = debtSchema.parse(body);

    const principal = validated.principal_amount || validated.total_amount;
    const totalAmount = validated.total_amount;
    if (principal > totalAmount) throw new BusinessError('Pokok hutang tidak boleh melebihi total nominal.');
    const totalInterest = Math.max(0, totalAmount - principal);

    const startDate = validated.start_date || null;
    let dueDate = validated.due_date || null;
    // paid_amount hanya boleh berasal dari pernyataan eksplisit user. Server tidak mengarang
    // jumlah cicilan yang "seharusnya sudah dibayar": itu klaim uang keluar tanpa mutasi dompet
    // dan tanpa baris transaksi, sehingga tidak bisa direkonsiliasi dengan saldo.
    const paidAmount = validated.initial_paid_amount || 0;

    if (startDate && validated.monthly_installment && validated.monthly_installment > 0) {
      const startObj = new Date(startDate);
      const now = new Date();
      if (!isNaN(startObj.getTime())) {
        // Tentukan jatuh tempo cicilan berikutnya secara otomatis
        const dueDay = startObj.getDate();
        let targetYear = now.getFullYear();
        let targetMonth = now.getMonth();
        if (now.getDate() > dueDay) {
          targetMonth += 1;
          if (targetMonth > 11) {
            targetMonth = 0;
            targetYear += 1;
          }
        }
        const safeDay = Math.min(dueDay, new Date(targetYear, targetMonth + 1, 0).getDate());
        dueDate = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
      }
    }

    const initialStatus = paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

    // Insert hutang, tagihan cicilan, dan aset penyeimbang dalam SATU transaksi atomik.
    const { createdDebt, billScheduled, createdAsset } = await withTransaction(async (client) => {
      const rows = await client.query(
        `
      INSERT INTO debts (
        user_id,
        type,
        category,
        person_name,
        total_amount,
        paid_amount,
        principal_amount,
        interest_rate,
        interest_type,
        tenor_months,
        monthly_installment,
        total_interest,
        start_date,
        due_date,
        notes,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING
        id,
        user_id,
        type,
        category,
        person_name,
        total_amount::float AS total_amount,
        paid_amount::float AS paid_amount,
        (total_amount - paid_amount)::float AS remaining_amount,
        principal_amount::float AS principal_amount,
        interest_rate::float AS interest_rate,
        interest_type,
        tenor_months,
        monthly_installment::float AS monthly_installment,
        total_interest::float AS total_interest,
        start_date,
        due_date,
        notes,
        status,
        created_at,
        updated_at
      `,
        [
          user.userId,
          validated.type,
          validated.category || 'hutang_pribadi',
          validated.person_name,
          totalAmount,
          paidAmount,
          principal,
          validated.interest_rate || 0,
          validated.interest_type || 'flat',
          validated.tenor_months || null,
          validated.monthly_installment || null,
          totalInterest,
          startDate,
          dueDate,
          validated.notes || null,
          initialStatus,
        ]
      );

      const createdDebt = rows.rows[0];

      // Jika opsi create_asset aktif, otomatis daftarkan aset fisik penyeimbang (Rumah/Kendaraan)
      let createdAsset = null;
      if (validated.create_asset) {
        const assetCategory = validated.category === 'kpr_rumah'
          ? 'properti'
          : validated.category === 'kredit_kendaraan'
          ? 'kendaraan'
          : 'properti';
        const deprMethod = assetCategory === 'properti' ? 'none' : 'straight_line';
        const usefulLife = assetCategory === 'properti' ? 1 : 5;
        const assetPrice = validated.asset_price || principal || totalAmount;
        const assetName = validated.asset_name || validated.person_name;
        const purchaseDate = startDate || dueDate || getLocalDateString();

        const insAsset = await client.query(
          `INSERT INTO assets (
            user_id, name, category, purchase_date, purchase_price, current_value, depreciation_method, useful_life_years, salvage_value, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9) RETURNING id, name, category, purchase_price::float AS purchase_price`,
          [
            user.userId,
            assetName,
            assetCategory,
            purchaseDate,
            assetPrice,
            assetPrice,
            deprMethod,
            usefulLife,
            `Aset terhubung dengan pinjaman: ${validated.person_name}`,
          ]
        );
        createdAsset = insAsset.rows[0];
      }

      // Jika hutang (payable) memiliki cicilan bulanan, otomatis jadwalkan ke recurring_bills
      let billScheduled = false;
      if (validated.type === 'payable' && validated.monthly_installment && validated.monthly_installment > 0) {
        try {
          let targetWalletId = validated.wallet_id || null;
          if (targetWalletId) {
            const wallet = await client.query('SELECT 1 FROM wallets WHERE id = $1 AND user_id = $2', [targetWalletId, user.userId]);
            if (wallet.rows.length === 0) targetWalletId = null;
          }
          // Kategori anggaran opsional: cicilan ikut menggerus budget kategori ini.
          let budgetCategoryId = validated.budget_category_id || null;
          if (budgetCategoryId) {
            const cat = await client.query(`SELECT 1 FROM categories WHERE id = $1 AND user_id = $2 AND type = 'expense'`, [budgetCategoryId, user.userId]);
            if (cat.rows.length === 0) budgetCategoryId = null;
          }

          await client.query(
            `INSERT INTO recurring_bills (
            user_id, type, title, amount, due_day, category_id, wallet_id, debt_id, auto_record, is_active
          ) VALUES ($1, 'expense', $2, $3, $4, $5, $6, $7, TRUE, TRUE)`,
            [
              user.userId,
              `Cicilan: ${validated.person_name}`,
              validated.monthly_installment,
              validated.schedule_due_day || (startDate ? new Date(startDate).getDate() : 10),
              budgetCategoryId,
              targetWalletId,
              createdDebt.id,
            ]
          );
          billScheduled = true;
        } catch (e) {
          console.warn('[debts:auto-schedule] gagal membuat jadwal cicilan', e);
          billScheduled = false;
        }
      }

      return { createdDebt, billScheduled, createdAsset };
    });

    return NextResponse.json(
      {
        success: true,
        data: { ...createdDebt, bill_scheduled: billScheduled, created_asset: createdAsset },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, 'debts:post');
  }
}
