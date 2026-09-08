import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Health check endpoint untuk orchestrator (Docker/Kubernetes/Vercel).
 * Memverifikasi konektivitas aplikasi dan database serverless.
 * Detail latensi dan uptime hanya disertakan bila pemanggil punya sesi valid;
 * caller anonim hanya mendapat status, database, dan timestamp (mengurangi
 * permukaan information disclosure).
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const result = await query<{ ping: number }>('SELECT 1 AS ping');
    const latencyMs = Date.now() - startTime;

    if (!result || result.length === 0 || result[0].ping !== 1) {
      return NextResponse.json(
        {
          status: 'degraded',
          database: 'unexpected_result',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    const session = await getAuthSession(req);

    return NextResponse.json(
      {
        status: 'healthy',
        database: 'connected',
        ...(session ? { latencyMs, uptimeSeconds: Math.floor(process.uptime()) } : {}),
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[api:health]', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: 'Database tidak dapat dihubungi.',
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
