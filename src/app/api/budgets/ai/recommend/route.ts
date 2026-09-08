import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimit';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';
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
    `SELECT COALESCE(SUM(amount), 0)::NUMERIC as total
     FROM transactions
     WHERE user_id = $1 AND type = 'income'
       AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3`,
    [userId, year, month]
  );
  const totalIncome = Number(incomeResult[0]?.total ?? 0);

  // Get spending by category
  const spentByCategory = await query<{ category_id: string; category_name: string; total: number }>(
    `SELECT c.id as category_id, c.name as category_name, COALESCE(SUM(t.amount), 0)::NUMERIC as total
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
 * Generate a budget template based on spending analysis
 */
async function generateRecommendationTemplate(
  userId: string,
  analysis: {
    total_spent_by_category: Record<string, number>;
    total_income: number;
    average_monthly_expenses: number;
    top_categories: Array<{ category_id: string; category_name: string; amount: number; percentage: number }>;
  }
): Promise<BudgetTemplate> {
  const { top_categories, total_income, average_monthly_expenses } = analysis;

  // Strategy 1: Data-driven - use actual spending percentages
  if (top_categories.length > 0 && total_income > 0 && average_monthly_expenses > 0) {
    const allocations = top_categories.slice(0, 5).map((cat) => ({
      category_id: cat.category_id,
      percentage: Math.round(cat.percentage),
    }));

    const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);

    return {
      id: '',
      user_id: userId,
      name: 'Saran Anggaran AI',
      description: `Berdasarkan pola pengeluaran Anda bulan ini (${average_monthly_expenses.toFixed(0)} dari ${total_income.toFixed(0)})`,
      rule_type: 'custom',
      is_default: false,
      allocations,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Strategy 2: Default to 50-30-20 with suggested allocations
  const defaultAllocations = [
    { category_id: '', percentage: 50 }, // Needs - placeholder
    { category_id: '', percentage: 30 }, // Wants - placeholder
    { category_id: '', percentage: 20 }, // Savings - placeholder
  ];

  return {
    id: '',
    user_id: userId,
    name: 'Aturan 50/30/20',
    description: 'Distribusi standar: 50% kebutuhan, 30% keinginan, 20% tabungan',
    rule_type: '50_30_20',
    is_default: true,
    allocations: defaultAllocations,
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

    // Generate recommendation template
    const recommendation = await generateRecommendationTemplate(session.userId, analysis);

    // Save recommendation as temporary template (not persisted permanently)
    // This allows user to easily adopt it later
    const inserted = await query(
      `INSERT INTO budgets_templates (user_id, name, description, rule_type, allocations, is_default)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       ON CONFLICT DO NOTHING
       RETURNING *`,
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
        template: inserted[0] ?? recommendation,
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
    const validatedData = analyzeBudgetRequestSchema.parse(rawBody);

    // For POST, accept explicit parameters in body
    const result = await GET(req);
    const responseJson = await result.json();

    return NextResponse.json(responseJson);
  } catch (error) {
    return handleRouteError(error, 'budgets-ai:recommend-post');
  }
}
