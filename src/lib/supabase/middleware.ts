import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/callback", "/register"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isOnboarding = pathname === "/onboarding";
  const isAdmin = pathname.startsWith("/admin");
  const isApiPath = pathname.startsWith("/api/");

  // Not logged in → redirect to /login (unless on public page or API route)
  // API routes handle their own auth and return 401
  if (!user) {
    if (!isPublicPath && !isApiPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Logged in — get user data for routing decisions
  const { data: userData } = await supabase
    .from("users")
    .select("onboarding_complete, role")
    .eq("id", user.id)
    .single();

  const onboardingComplete = userData?.onboarding_complete ?? false;
  const userRole = userData?.role ?? "adult";

  // Admin routes — only for admins
  if (isAdmin && userRole !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Logged in without onboarding → force /onboarding (skip for API routes — they handle auth themselves)
  if (!onboardingComplete && !isOnboarding && !isPublicPath && !isApiPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  // Logged in with onboarding → redirect away from /login, /onboarding, /
  if (onboardingComplete && (isPublicPath || isOnboarding)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
