import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, full_name } = await request.json();
    if (!email) {
      return NextResponse.json({ success: false, error: 'Missing email' }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@ezrent.my';

    if (!resendKey) {
      console.log(`[send-rejection-email] DEV MODE — rejection email for ${email}`);
      return NextResponse.json({ success: true });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `Malaysia Ez Rent <${fromEmail}>`,
        to: [email],
        subject: '中介申请审核结果 — Malaysia Ez Rent',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="color:#0D9488;margin-bottom:16px">Malaysia Ez Rent</h2>
            <p>${full_name || ''}，您好！</p>
            <p>很抱歉，您的中介申请未通过审核。</p>
            <p>如有疑问，请联系管理员了解详情。</p>
            <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0"/>
            <p style="color:#9CA3AF;font-size:12px">如有疑问请回复此邮件。</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[send-rejection-email] Resend error:', errBody);
      return NextResponse.json({ success: false, error: 'Email send failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[send-rejection-email] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
