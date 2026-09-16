import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimit';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';
import { TRANSACTION_INCOME_SQL, TRANSACTION_AMOUNT_WITH_FEE_SQL } from '@/lib/reportSql';
import { BudgetTemplate } from '@/lib/types';
import { z } from 'zod';

const analyzeBudgetRequestSchema = z.object({
  historical_month: z.number().int().min(1).max(12).optional(),
  historical_year: z.number().int().min(2020).max(2100).optional(),
});

/**
 * Analyze user's spending patterns to generate budget recommendations
 */
async function analyzeSpendingPatterns(userId: string, year: number, month: number): Promise<{
  total_spent_by_category: Record<string, number>;
  total_income: number;
  average_monthly_expenses: number;
  top_categories: Array<{ category_id: string; category_name: string; amount: number; percentage: number }>;
}> {
  // Get total income for the period
  const incomeResult = await query<{ total: number }>(
    `SELECT ${TRANSACTION_INCOME_SQL}::NUMERIC as total
     FROM transactions t
     WHERE t.user_id = $1 AND t.type = 'income'
       AND EXTRACT(YEAR FROM t.date) = $2 AND EXTRACT(MONTH FROM t.date) = $3`,
    [userId, year, month]
  );
  const totalIncome = Number(incomeResult[0]?.total ?? 0);

  // Get spending by category
  const spentByCategory = await query<{ category_id: string; category_name: string; total: number }>(
    `SELECT c.id as category_id, c.name as category_name, ${TRANSACTION_AMOUNT_WITH_FEE_SQL}::NUMERIC as total
     FROM categories c
     LEFT JOIN transactions t ON t.category_id = c.id AND t.user_id = $1 AND t.type = 'expense'
       AND EXTRACT(YEAR FROM t.date) = $2 AND EXTRACT(MONTH FROM t.date) = $3
     WHERE c.user_id = $1 AND c.type = 'expense'
     GROUP BY c.id, c.name
     ORDER BY total DESC NULLS LAST
     LIMIT 10`,
    [userId, year, month]
  );

  const totalSpentByCategory: Record<string, number> = {};
  const totalExpenses = spentByCategory.reduce((sum, row) => sum + Number(row.total), 0);

  if (totalExpenses === 0 && totalIncome === 0) {
    // No data, return default 50-30-20 template
    return {
      total_spent_by_category: {},
      total_income: 0,
      average_monthly_expenses: 0,
      top_categories: [],
    };
  }

  const topCategories = spentByCategory.map((row) => ({
    category_id: row.category_id,
    category_name: row.category_name,
    amount: Number(row.total),
    percentage: totalExpenses > 0 ? (Number(row.total) / totalExpenses) * 100 : 0,
  }));

  spentByCategory.forEach((row) => {
    totalSpentByCategory[row.category_id] = Number(row.total);
  });

  return {
    total_spent_by_category: totalSpentByCategory,
    total_income: totalIncome,
    average_monthly_expenses: totalExpenses,
    top_categories: topCategories,
  };
}

/**
 * Susun template anggaran dari riwayat belanja nyata pengguna.
 * Mengembalikan `null` bila riwayat belum cukup — dulu fungsi ini mengarang
 * template 50/30/20 berisi `category_id: ''`, yang bukan UUID valid dan membuat
 * template tidak bisa dipakai.
 */
async function generateRecommendationTemplate(
  userId: string,
  analysis: {
    total_spent_by_category: Record<string, number>;
    total_income: number;
    average_monthly_expenses: number;
    top_categories: Array<{ category_id: string; category_name: string; amount: number; percentage: number }>;
  }
): Promise<BudgetTemplate | null> {
  const { top_categories, total_income, average_monthly_expenses } = analysis;

  if (top_categories.length === 0 || total_income <= 0 || average_monthly_expenses <= 0) {
    return null;
  }

  // Persentase diambil dari porsi belanja nyata tiap kategori, bukan dari aturan baku.
  const allocations = top_categories.slice(0, 5).map((cat) => ({
    category_id: cat.category_id,
    percentage: Math.round(cat.percentage),
  }));

  return {
    id: '',
    user_id: userId,
    name: 'Saran dari Riwayat Belanja',
    description: `Dari rata-rata pengeluaran ${average_monthly_expenses.toFixed(0)} terhadap pemasukan ${total_income.toFixed(0)} pada periode ini.`,
    rule_type: 'custom',
    is_default: false,
    allocations,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const parsed = analyzeBudgetRequestSchema.parse({
      historical_month: parseInt(sp.get('month') || '') || undefined,
      historical_year: parseInt(sp.get('year') || '') || undefined,
    });

    const now = new Date();
    const year = parsed.historical_year ?? now.getFullYear();
    const month = parsed.historical_month ?? now.getMonth() + 1;

    // Rate limiting: 10x per hour per user
    const rl = checkRateLimit(`budgets-ai:${session.userId}`, 10, 60 * 60 * 1000);
    if (!rl.ok) {
      throw new BusinessError(
        `Batas saran anggaran tercapai. Coba lagi dalam ${rl.retryAfterSec} detik.`,
        429
      );
    }

    // Analyze spending patterns
    const analysis = await analyzeSpendingPatterns(session.userId, year, month);

    // Generate recommendation template (null bila riwayat belum cukup)
    const recommendation = await generateRecommendationTemplate(session.userId, analysis);

    if (!recommendation) {
      return NextResponse.json({
        success: true,
        data: {
          template: null,
          analysis: {
            total_income: analysis.total_income,
            average_monthly_expenses: analysis.average_monthly_expenses,
            recommended_allocation_count: 0,
          },
          reason: 'Belum ada pemasukan dan pengeluaran yang cukup pada periode ini untuk menyusun saran anggaran.',
        },
      });
    }

    // Simpan sebagai template agar bisa dipilih. Satu baris per nama, sehingga
    // klik berulang memperbarui baris yang sama alih-alih menumpuk duplikat.
    const saved = await query(
      `WITH updated AS (
         UPDATE budgets_templates
         SET description = $3, rule_type = $4, allocations = $5, updated_at = NOW()
         WHERE user_id = $1 AND name = $2
         RETURNING *
       ), inserted AS (
         INSERT INTO budgets_templates (user_id, name, description, rule_type, allocations, is_default)
         SELECT $1, $2, $3, $4, $5, FALSE
         WHERE NOT EXISTS (SELECT 1 FROM updated)
         RETURNING *
       )
       SELECT * FROM updated UNION ALL SELECT * FROM inserted`,
      [
        session.userId,
        recommendation.name,
        recommendation.description,
        recommendation.rule_type,
        JSON.stringify(recommendation.allocations),
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        template: saved[0] ?? recommendation,
        analysis: {
          total_income: analysis.total_income,
          average_monthly_expenses: analysis.average_monthly_expenses,
          recommended_allocation_count: recommendation.allocations.length,
        },
      },
    });
  } catch (error) {
    return handleRouteError(error, 'budgets-ai:recommend');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const rawBody = await req.json();
    analyzeBudgetRequestSchema.parse(rawBody);

    // For POST, accept explicit parameters in body
    const result = await GET(req);
    const responseJson = await result.json();

    return NextResponse.json(responseJson);
  } catch (error) {
    return handleRouteError(error, 'budgets-ai:recommend-post');
  }
}
