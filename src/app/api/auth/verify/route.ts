import { NextResponse } from "next/server";

/**
 * Proxy route for magic link verification.
 * Accepts a `link` query param (the raw Supabase auth URL)
 * and redirects to it. This lets us show a clean godoj.co URL
 * in magic link emails instead of the raw Supabase domain.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const link = searchParams.get("link");

  if (!link) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Only allow redirects to our Supabase project
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !link.startsWith(supabaseUrl)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.redirect(link);
}
