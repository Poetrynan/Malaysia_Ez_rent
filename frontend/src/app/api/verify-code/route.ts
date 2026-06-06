import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();
    if (!email || !code) {
      return NextResponse.json({ valid: false, error: 'Missing email or code' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Find the most recent unused, unexpired code for this email
    const { data, error } = await supabase
      .from('email_verifications')
      .select('id, code, expires_at, used')
      .eq('email', email.toLowerCase().trim())
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[verify-code] DB error:', error);
      return NextResponse.json({ valid: false, error: 'Database error' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ valid: false, error: 'no_code' });
    }

    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'expired' });
    }

    if (data.code !== code.trim()) {
      return NextResponse.json({ valid: false, error: 'wrong_code' });
    }

    // Mark as used
    await supabase
      .from('email_verifications')
      .update({ used: true })
      .eq('id', data.id);

    return NextResponse.json({ valid: true });
  } catch (err: any) {
    console.error('[verify-code] Error:', err);
    return NextResponse.json({ valid: false, error: err.message }, { status: 500 });
  }
}
