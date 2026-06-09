import { type NextRequest, NextResponse } from 'next/server';

const isMockMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL === '';

/** Detect mobile devices via User-Agent */
function isMobileUA(request: NextRequest): boolean {
  const ua = request.headers.get('user-agent') || '';
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

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
    pathname.startsWith('/register/') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/mobile-upload/') ||
    pathname.startsWith('/mobile-upload-property/') ||
    pathname.startsWith('/mobile-upload-qr/') ||
    pathname.startsWith('/m/') ||
    pathname.startsWith('/mt/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }


  // Redirect root → /guest (public landing page for all visitors)
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/guest';
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
  let supabase: Awaited<ReturnType<typeof createServerClient>> | null = null;
  try {
    supabase = createServerClient(supabaseUrl, supabaseKey, {
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

  const role = user.user_metadata?.role;

  // Strict role isolation redirect
  if (role === 'agent') {
    // Mobile agents → redirect to mobile workstation
    if (isMobileUA(request)) {
      if (pathname.startsWith('/admin/')) {
        const mobileUrl = request.nextUrl.clone();
        // Map /admin/xxx to /m/xxx, fallback to /m/dashboard
        const subPath = pathname.replace('/admin/', '');
        const mobileRoutes = ['dashboard', 'properties', 'upload', 'feedback', 'profile'];
        const target = mobileRoutes.find(r => subPath.startsWith(r)) || 'dashboard';
        mobileUrl.pathname = `/m/${target}`;
        return NextResponse.redirect(mobileUrl);
      }
      // Mobile agent on non-admin, non-mobile path → send to /m/dashboard
      if (!pathname.startsWith('/m/')) {
        const mobileUrl = request.nextUrl.clone();
        mobileUrl.pathname = '/m/dashboard';
        return NextResponse.redirect(mobileUrl);
      }
    } else {
      // Desktop agents → stay on /admin/*
      if (!pathname.startsWith('/admin/')) {
        const adminHomeUrl = request.nextUrl.clone();
        adminHomeUrl.pathname = '/admin/dashboard';
        return NextResponse.redirect(adminHomeUrl);
      }
    }
  } else {
    // Tenant (role === 'student' or legacy accounts without role yet)
    if (pathname.startsWith('/admin/')) {
      const tenantHomeUrl = request.nextUrl.clone();
      tenantHomeUrl.pathname = '/listings';
      return NextResponse.redirect(tenantHomeUrl);
    }

    // Mobile tenants → redirect to mobile workstation /mt/*
    if (isMobileUA(request) && !pathname.startsWith('/mt/') && !pathname.startsWith('/profile') && !pathname.startsWith('/m/')) {
      const mobileTenantUrl = request.nextUrl.clone();
      const tenantRouteMap: Record<string, string> = {
        '/listings': '/mt/listings',
        '/chat': '/mt/chat',
        '/my-lease': '/mt/lease',
        '/maintenance': '/mt/lease',
        '/inbox': '/mt/profile',
      };
      const match = Object.keys(tenantRouteMap).find(r => pathname.startsWith(r));
      mobileTenantUrl.pathname = match ? tenantRouteMap[match] : '/mt/listings';
      return NextResponse.redirect(mobileTenantUrl);
    }

    // Unified identity gate: missing identity_type → complete on /profile
    // DB is source of truth (legacy tenants may lack user_metadata.role).
    if (!pathname.startsWith('/profile') && !pathname.startsWith('/mt/profile')) {
      let identityType: string | null | undefined = user.user_metadata?.identity_type;

      if (supabase) {
        try {
          const { data: dbUser } = await supabase
            .from('users')
            .select('identity_type')
            .eq('id', user.id)
            .maybeSingle();
          identityType = dbUser?.identity_type || identityType;
        } catch {}
      }

      if (!identityType) {
        const profileUrl = request.nextUrl.clone();
        profileUrl.pathname = '/profile';
        return NextResponse.redirect(profileUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
