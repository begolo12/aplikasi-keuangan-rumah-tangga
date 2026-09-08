import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { handleRouteError } from '@/lib/apiHelpers';

/**
 * GET /api/subscriptions/cron
 * Cron job endpoint to process subscription reminders (H-7 and H-1)
 * Triggered by Vercel Cron or external service worker
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Protect endpoint if CRON_SECRET is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    
    // Fetch all active subscriptions with reminders enabled
    const subs = await query<any>(
      `SELECT 
        s.id, s.user_id, s.provider_name, s.amount, s.cycle, s.next_charge_date,
        s.reminder_enabled, c.name as category_name, w.name as wallet_name
      FROM subscriptions s
      LEFT JOIN categories c ON s.category_id = c.id AND c.user_id = s.user_id
      LEFT JOIN wallets w ON s.wallet_id = w.id AND w.user_id = s.user_id
      WHERE s.is_active = TRUE 
        AND s.reminder_enabled = TRUE
      ORDER BY s.next_charge_date ASC`
    );

    const results: Array<{ userId: string; reminderMessages: Array<{ title: string; daysUntilDue: number }> }> = [];
    let processedCount = 0;
    
    // Group by user_id and calculate reminders
    for (const sub of subs) {
      if (!sub.reminder_enabled || !sub.user_id) continue;

      const chargeDate = new Date(sub.next_charge_date);
      const diffTime = chargeDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Only send reminder if within H-7 or H-1 window
      if (diffDays > 7 || diffDays < 0) continue;

      const key = `${sub.user_id}`;
      let userResult = results.find(r => r.userId === key);
      if (!userResult) {
        userResult = { userId: key, reminderMessages: [] };
        results.push(userResult);
      }

      userResult.reminderMessages.push({
        title: sub.provider_name || 'Langganan',
        daysUntilDue: diffDays,
      });
      
      processedCount++;
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: processedCount,
        users_notified: results.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'subscriptions:cron');
  }
}
