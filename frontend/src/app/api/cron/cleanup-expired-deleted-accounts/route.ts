import { NextResponse, type NextRequest } from 'next/server';
import { cleanupExpiredDeletedAccountsAction } from '@/app/actions/deleteAccount';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await cleanupExpiredDeletedAccountsAction();
  const status = result.success ? 200 : 500;
  return NextResponse.json(result, { status });
}
