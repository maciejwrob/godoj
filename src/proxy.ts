import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const KIDS_MODE_ENABLED = process.env.NEXT_PUBLIC_KIDS_MODE_ENABLED === "true";

// Old routes that moved from /(app)/* to /app/*. Permanent redirects (308)
// so browsers and search engines cache the new location.
const OLD_ROUTE_REDIRECTS: Record<string, string> = {
  "/dashboard": "/app/dashboard",
  "/lesson": "/app/lesson",
  "/vocabulary": "/app/vocabulary",
  "/exercises": "/app/exercises",
  "/progress": "/app/progress",
  "/achievements": "/app/achievements",
  "/settings": "/app/settings",
  "/feedback": "/app/feedback",
  "/onboarding": "/app/onboarding",
};

// Prefix-based redirects for routes with sub-paths (e.g. /lesson/123 → /app/lesson/123)
const OLD_ROUTE_PREFIX_REDIRECTS: string[] = [
  "/lesson/",
  "/settings/",
];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // --- Redirect old routes to /app/* ---
  // Exact matches
  if (OLD_ROUTE_REDIRECTS[path]) {
    const url = request.nextUrl.clone();
    url.pathname = OLD_ROUTE_REDIRECTS[path];
    return NextResponse.redirect(url, 308);
  }
  // Prefix matches (sub-paths like /lesson/xyz → /app/lesson/xyz)
  for (const prefix of OLD_ROUTE_PREFIX_REDIRECTS) {
    if (path.startsWith(prefix)) {
      const url = request.nextUrl.clone();
      url.pathname = `/app${path}`;
      return NextResponse.redirect(url, 308);
    }
  }
  // Redirect old /app/pricing bookmarks to new location
  if (path === "/app/pricing") {
    const url = request.nextUrl.clone();
    url.pathname = "/app/settings/plans";
    return NextResponse.redirect(url, 308);
  }

  // --- Kids mode gate ---
  if (!KIDS_MODE_ENABLED) {
    if (path.startsWith("/kids") || path.startsWith("/app/kids-dashboard")) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
