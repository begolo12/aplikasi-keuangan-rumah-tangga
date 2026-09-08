import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleRouteError } from '@/lib/apiHelpers';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const publicKey = process.env.VAPID_PUBLIC_KEY || null;
    if (!publicKey || publicKey.includes('your_')) {
      return NextResponse.json({ success: false, error: 'Web Push belum dikonfigurasi di server.' }, { status: 503 });
    }
    return NextResponse.json({ success: true, data: { publicKey } });
  } catch (error) {
    return handleRouteError(error, 'push:public-key');
  }
}
