import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/';

  // Build the success redirect first so the refreshed auth cookies can be
  // attached directly to it. This guarantees the Set-Cookie headers survive
  // the redirect (a manually returned redirect would otherwise drop cookies
  // written only to the next/headers store).
  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  let authOk = false;

  if (code) {
    // PKCE / OAuth (Google) flow
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authOk = !error;
  } else if (tokenHash && type) {
    // Email magic-link / OTP flow (works across devices, no PKCE verifier needed)
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    authOk = !error;
  }

  if (authOk) {
    return response;
  }

  // Auth failed — redirect to login with error hint
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
