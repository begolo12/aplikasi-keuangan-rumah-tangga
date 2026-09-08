import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';
import { endpoints } from '@/lib/apiFetch';

/**
 * Cron job untuk mengingatkan langganan yang akan jatuh tempo:
 * - H-7: 7 hari sebelum charge date
 * - H-1: 1 hari sebelum charge date
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    
    // Verify admin/secret header (similar to bills cron)
    const authHeader = req.headers.get('x-cron-secret');
    if (!authHeader || authHeader !== process.env.CRONS_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date();
    
    // Get all active subscriptions with reminders enabled
    const subs = await query<Record<string, unknown>>(
      `SELECT 
        s.id, s.provider_name, s.amount, s.cycle, s.next_charge_date,
        s.reminder_enabled, c.name as category_name, w.name as wallet_name
      FROM subscriptions s
      LEFT JOIN categories c ON s.category_id = c.id AND c.user_id = s.user_id
      LEFT JOIN wallets w ON s.wallet_id = w.id AND w.user_id = s.user_id
      WHERE s.is_active = TRUE 
        AND s.reminder_enabled = TRUE
      ORDER BY s.next_charge_date ASC`
    );

    interface SubLike {
      reminder_enabled: boolean;
    }

    const results: Array<{ userId: string; reminderMessages: Array<{ title: string; daysUntilDue: number }> }> = [];
    let processedCount = 0;

    const subList = subs.rows as unknown as SubLike[];
    
    // Group by user_id and calculate reminders
    for (const sub of subList) {
      const subObj = sub as Record<string, unknown>;
      
      // Skip if reminder not enabled
      if ((subObj.reminder_enabled as boolean) !== true) continue;

      const chargeDate = new Date(subObj.next_charge_date as string);
      const diffTime = chargeDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Only send reminder if within H-7 or H-1 window
      if (diffDays > 7 || diffDays < 0) continue;

      const key = `${subObj.user_id}`;
      if (!results.find(r => r.userId === key)) {
        results.push({ userId: subObj.user_id as string, reminderMessages: [] });
      }

      const result = results.find(r => r.userId === key)!;
      result.reminderMessages.push({
        title: subObj.provider_name as string,
        daysUntilDue: diffDays,
      });
      
      processedCount++;
    }

    // Process each user's reminders via service worker
    for (const result of results) {
      try {
        // Send message to all devices for this user
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: result.userId,
            title: 'Pengingat Langganan Berlangganan',
            body: result.reminderMessages.map(m => 
              `- ${m.title}: ${m.daysUntilDue === 0 ? 'Hari ini' : m.daysUntilDue === 1 ? 'Besok' : `Dalam ${m.daysUntilDue} hari`}`
            ).join('\n'),
            data: { type: 'subscription_reminder' },
          }),
        });
      } catch (err) {
        console.error(`Failed to send push notification for user ${result.userId}`, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Subscription reminders processed: ${processedCount} subscriptions scheduled`,
      processed_count: processedCount,
    });
  } catch (error) {
    return handleRouteError(error, 'subscriptions:cron');
  }
}

// Allow GET for health check
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    success: true, 
    message: 'Subscription reminder cron endpoint is ready',
    schedule: 'Run daily at midnight to check H-7 and H-1 reminders',
  });
}
