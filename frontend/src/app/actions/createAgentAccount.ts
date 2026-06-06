'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export interface CreateAgentAccountInput {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  whatsapp?: string | null;
  wechat_id?: string | null;
  agency_name: string;
  ren_number: string;
  ren_tag_base64: string;
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, '');
  let normalized = digits;
  if (normalized.startsWith('60')) normalized = normalized.substring(2);
  if (normalized.startsWith('0')) normalized = normalized.substring(1);
  if (!/^1[0-9]{8,9}$/.test(normalized)) return null;
  return '60' + normalized;
}

function normalizeRen(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase().replace(/[-\s]/g, '');
  if (!/^REN[0-9]{4,7}$/.test(cleaned)) return null;
  return cleaned;
}

async function sendAgentWelcomeEmail(email: string, fullName: string) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@ezrent.my';
  const loginUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/login`
    : 'https://malaysia-ez-rent.vercel.app/login';

  if (!resendKey) {
    console.log(`[createAgentAccount] DEV MODE — welcome email for ${email}`);
    return;
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: `Malaysia Ez Rent <${fromEmail}>`,
      to: [email],
      subject: '您的中介账号已开通 — Malaysia Ez Rent',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="color:#0D9488;margin-bottom:16px">Malaysia Ez Rent</h2>
          <p>${fullName}，您好！</p>
          <p>平台管理员已为您开通中介管理后台账号。</p>
          <p>请使用创建时登记的邮箱和密码登录：</p>
          <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;margin:16px 0;
            background:#0D9488;color:white;text-decoration:none;border-radius:10px;
            font-weight:600;font-size:15px">
            立即登录
          </a>
          <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0"/>
          <p style="color:#9CA3AF;font-size:12px">如有疑问请联系平台管理员。</p>
        </div>
      `,
    }),
  });
}

/**
 * Super-admin provisioning: creates auth user + admin_users + agent_profiles (approved).
 * Equivalent to manual setup in Supabase dashboard.
 */
export async function createAgentAccountAction(
  input: CreateAgentAccountInput,
): Promise<{ success: boolean; error?: string; userId?: string }> {
  let createdUserId: string | null = null;

  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return { success: false, error: 'Service role key not configured' };
    }

    const cookieStore = await cookies();
    const { createClient: createServerClient } = await import('@/utils/supabase/server');
    const sessionClient = createServerClient(cookieStore);
    const { data: { user: caller } } = await sessionClient.auth.getUser();
    if (!caller) return { success: false, error: 'Not authenticated' };

    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

    const { data: callerAdmin } = await adminClient
      .from('admin_users')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();

    if (callerAdmin?.role !== 'super_admin') {
      return { success: false, error: 'Only super administrators can create agent accounts' };
    }

    const email = input.email.toLowerCase().trim();
    const fullName = input.full_name.trim();
    const agencyName = input.agency_name.trim();
    const phone = normalizePhone(input.phone);
    const whatsapp = input.whatsapp?.trim() ? normalizePhone(input.whatsapp) : null;
    const renNumber = normalizeRen(input.ren_number);

    if (!email.includes('@')) return { success: false, error: 'Invalid email' };
    if (!fullName) return { success: false, error: 'Full name is required' };
    if (input.password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };
    if (!phone) return { success: false, error: 'Invalid Malaysian phone number' };
    if (input.whatsapp?.trim() && !whatsapp) return { success: false, error: 'Invalid WhatsApp number' };
    if (!agencyName) return { success: false, error: 'Agency name is required' };
    if (!renNumber) return { success: false, error: 'Invalid REN number (e.g. REN12345)' };
    if (!input.ren_tag_base64?.startsWith('data:image/')) {
      return { success: false, error: 'REN tag image is required' };
    }

    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        role: 'agent',
        full_name: fullName,
        agency_name: agencyName,
        ren_number: renNumber,
      },
    });

    if (authErr || !authData.user) {
      return { success: false, error: authErr?.message || 'Failed to create auth user' };
    }

    createdUserId = authData.user.id;

    const base64Payload = input.ren_tag_base64.split(',')[1];
    if (!base64Payload) {
      throw new Error('Invalid REN tag image data');
    }
    const imageBuffer = Buffer.from(base64Payload, 'base64');
    const storagePath = `ren-tags/ren-tag-${createdUserId}-${Date.now()}.jpg`;
    const { error: uploadErr } = await adminClient.storage
      .from('unit-media')
      .upload(storagePath, imageBuffer, { contentType: 'image/jpeg', upsert: true });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = adminClient.storage.from('unit-media').getPublicUrl(storagePath);
    const renTagUrl = urlData.publicUrl;

    const { error: adminErr } = await adminClient.from('admin_users').insert({
      id: createdUserId,
      email,
      display_name: fullName,
      phone,
      whatsapp,
      wechat_id: input.wechat_id?.trim() || null,
      role: 'editor',
      agency_name: agencyName,
      job_title: 'Real Estate Negotiator',
      ren_number: renNumber,
      ren_tag_url: renTagUrl,
    });

    if (adminErr) throw adminErr;

    const { error: profileErr } = await adminClient.from('agent_profiles').insert({
      auth_user_id: createdUserId,
      email,
      full_name: fullName,
      phone,
      whatsapp,
      agency_name: agencyName,
      ren_number: renNumber,
      ren_tag_image_url: renTagUrl,
      verification_status: 'approved',
    });

    if (profileErr) throw profileErr;

    try {
      await sendAgentWelcomeEmail(email, fullName);
    } catch (emailErr) {
      console.error('[createAgentAccount] Welcome email failed:', emailErr);
    }

    return { success: true, userId: createdUserId };
  } catch (e: unknown) {
    if (createdUserId) {
      try {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
        await adminClient.auth.admin.deleteUser(createdUserId);
      } catch (rollbackErr) {
        console.error('[createAgentAccount] Rollback failed:', rollbackErr);
      }
    }

    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[createAgentAccount] Error:', e);
    return { success: false, error: message };
  }
}
