import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const KIDS_MODE_ENABLED = process.env.NEXT_PUBLIC_KIDS_MODE_ENABLED === "true";

export async function proxy(request: NextRequest) {
  if (!KIDS_MODE_ENABLED) {
    const path = request.nextUrl.pathname;
    if (path.startsWith("/kids") || path.startsWith("/kids-dashboard")) {
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
