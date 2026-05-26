import { type NextRequest, NextResponse } from 'next/server';

const isMockMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL === '';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets and auth routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/mobile-upload/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // ── MOCK MODE: check localStorage flag via cookie ──
  if (isMockMode) {
    const loggedIn = request.cookies.get('ez_logged_in')?.value;
    if (!loggedIn) {
      // Rely on client-side check; pass through (login page handles it via localStorage)
      return NextResponse.next();
    }
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
