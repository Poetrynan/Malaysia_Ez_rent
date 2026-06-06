import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Invalid email' }, { status: 400 });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

    // Store code in DB
    const supabase = createClient(supabaseUrl, serviceKey);
    const { error: dbErr } = await supabase.from('email_verifications').insert({
      email: email.toLowerCase().trim(),
      code,
      expires_at: expiresAt,
    });
    if (dbErr) {
      console.error('[send-verification] DB error:', dbErr);
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }

    // Send email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@ezrent.my';

    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: `Malaysia Ez Rent <${fromEmail}>`,
          to: [email],
          subject: `验证码 ${code} — Malaysia Ez Rent`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
              <h2 style="color:#0D9488;margin-bottom:8px">Malaysia Ez Rent</h2>
              <p>您好！您的邮箱验证码是：</p>
              <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0D9488;
                          background:#F0FDFA;border-radius:12px;padding:20px;text-align:center;
                          margin:16px 0;border:2px dashed #99F6E4">
                ${code}
              </div>
              <p style="color:#6B7280;font-size:14px">验证码 5 分钟内有效，请勿分享给他人。</p>
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0"/>
              <p style="color:#9CA3AF;font-size:12px">如果这不是您本人的操作，请忽略此邮件。</p>
            </div>
          `,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.error('[send-verification] Resend error:', errBody);
        return NextResponse.json({ success: false, error: 'Email send failed' }, { status: 500 });
      }
    } else {
      // No Resend key — log code for development
      console.log(`[send-verification] DEV MODE — code for ${email}: ${code}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[send-verification] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
