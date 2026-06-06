import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, full_name } = await request.json();
    if (!email) {
      return NextResponse.json({ success: false, error: 'Missing email' }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@ezrent.my';
    const loginUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/login`
      : 'https://malaysia-ez-rent.vercel.app/login';

    if (!resendKey) {
      console.log(`[send-approval-email] DEV MODE — approval email for ${email}`);
      return NextResponse.json({ success: true });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `Malaysia Ez Rent <${fromEmail}>`,
        to: [email],
        subject: '您的中介申请已通过 — Malaysia Ez Rent',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="color:#0D9488;margin-bottom:16px">Malaysia Ez Rent</h2>
            <p>${full_name || ''}，您好！</p>
            <p>恭喜！您的中介申请已通过审核。🎉</p>
            <p>现在可以使用您注册时的邮箱和密码登录中介管理后台：</p>
            <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;margin:16px 0;
              background:#0D9488;color:white;text-decoration:none;border-radius:10px;
              font-weight:600;font-size:15px">
              立即登录
            </a>
            <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0"/>
            <p style="color:#9CA3AF;font-size:12px">如有疑问请回复此邮件。</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[send-approval-email] Resend error:', errBody);
      return NextResponse.json({ success: false, error: 'Email send failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[send-approval-email] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
