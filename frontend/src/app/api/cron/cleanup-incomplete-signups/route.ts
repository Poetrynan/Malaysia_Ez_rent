import { NextResponse, type NextRequest } from 'next/server';
import { cleanupIncompleteOAuthSignupsAction } from '@/app/actions/cleanupIncompleteSignups';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await cleanupIncompleteOAuthSignupsAction();
  const status = result.success ? 200 : 500;
  return NextResponse.json(result, { status });
}
