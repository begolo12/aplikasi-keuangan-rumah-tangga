import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';
import { BudgetTemplate } from '@/lib/types';
import { z } from 'zod';

const applyTemplateSchema = z.object({
  template_id: z.string().uuid('Template ID tidak valid'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

/**
 * POST /api/budgets/templates/apply - Apply a budget template to create actual budgets
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = applyTemplateSchema.parse(body);
    const { template_id, month, year } = validated;

    // Fetch the template
    const templateResult = await query<BudgetTemplate>(
      `SELECT id, name, rule_type, allocations, is_default
       FROM budgets_templates
       WHERE id = $1 AND user_id = $2`,
      [template_id, session.userId]
    );

    if (templateResult.length === 0) {
      throw new BusinessError('Template tidak ditemukan');
    }

    const template = templateResult[0];
    const allocations = template.allocations as Array<{ category_id: string; percentage: number }>;

    if (!allocations || allocations.length === 0) {
      throw new BusinessError('Template tidak memiliki alokasi kategori');
    }

    // Calculate monthly limit based on total income and percentages
    // For zero-based and custom templates, calculate from categories
    // For 50-30-20, we use a default assumption (can be refined later)
    const averageMonthlyIncome = await query<{ avg_income: number }>(
      `SELECT COALESCE(AVG(amount), 0)::NUMERIC as avg_income
       FROM transactions
       WHERE user_id = $1 AND type = 'income'
         AND EXTRACT(YEAR FROM date) = $3 AND EXTRACT(MONTH FROM date) = $4`,
      [session.userId, year, month]
    );

    const baseAmount = Number(averageMonthlyIncome[0]?.avg_income || 0);
    
    // If no historical data, use default amounts
    const defaultTotal = 5000000; // Default monthly income of 5M IDR

    const budgetsToCreate: Array<{ category_id: string; monthly_limit: number; month: number; year: number }> = [];

    for (const alloc of allocations) {
      let targetAmount: number;

      if (baseAmount > 0) {
        // Calculate based on actual or average income
        targetAmount = Math.round((baseAmount * alloc.percentage) / 100);
      } else {
        // Use default allocation amount
        targetAmount = Math.round((defaultTotal * alloc.percentage) / 100);
      }

      budgetsToCreate.push({
        category_id: alloc.category_id,
        monthly_limit: targetAmount,
        month,
        year,
      });
    }

    // Create budgets using transaction
    const createdBudgets = await withTransaction(async (client) => {
      const results = [];

      for (const budget of budgetsToCreate) {
        const inserted = await client.query(
          `INSERT INTO budgets (user_id, category_id, monthly_limit, month, year, rollover_enabled)
           VALUES ($1, $2, $3, $4, $5, FALSE)
           ON CONFLICT (user_id, category_id, month, year)
           DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit
           RETURNING *`,
          [session.userId, budget.category_id, budget.monthly_limit, budget.month, budget.year]
        );

        if (inserted.rows[0]) {
          results.push(inserted.rows[0]);
        }
      }

      return results;
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil menerapkan template "${template.name}" dengan ${createdBudgets.length} anggaran`,
      data: {
        template_name: template.name,
        budgets_created: createdBudgets.length,
        budgets: createdBudgets,
      },
    });
  } catch (error) {
    return handleRouteError(error, 'budgets-templates:apply');
  }
}
