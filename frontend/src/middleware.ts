import { type NextRequest, NextResponse } from 'next/server';

const isMockMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL === '';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block /diagnose in production (live mode)
  if (pathname.startsWith('/diagnose') && !isMockMode) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Always allow static assets and auth routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/calculator') ||
    pathname.startsWith('/register-agent') ||
    pathname.startsWith('/mobile-upload/') ||
    pathname.startsWith('/mobile-upload-property/') ||
    pathname.startsWith('/mobile-upload-qr/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Redirect root: guests → /guest, logged-in → /listings (client handles admin redirect)
  if (pathname === '/') {
    if (isMockMode) {
      const url = request.nextUrl.clone();
      url.pathname = '/guest';
      return NextResponse.redirect(url);
    }
    // Live mode: check auth to decide destination
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const { createServerClient } = await import('@supabase/ssr');
    const url = request.nextUrl.clone();
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} },
      });
      const { data: { user } } = await supabase.auth.getUser();
      url.pathname = user ? '/listings' : '/guest';
    } catch {
      url.pathname = '/guest';
    }
    return NextResponse.redirect(url);
  }

  // Allow /guest without auth (public browsing)
  if (pathname.startsWith('/guest')) {
    return NextResponse.next();
  }

  // ── MOCK MODE: pass through (client-side auth handles it) ──
  if (isMockMode) {
    return NextResponse.next();
  }

  // ── LIVE MODE: Supabase SSR auth check ──
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  const { createServerClient } = await import('@supabase/ssr');

  // Build response with cookie forwarding
  const response = NextResponse.next({ request: { headers: request.headers } });

  let user = null;
  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {}

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
