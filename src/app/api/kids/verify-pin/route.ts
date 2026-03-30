import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

function hashPin(pin: string): string {
  return createHash("sha256").update(`godoj-pin-${pin}`).digest("hex");
}

// In-memory rate limiting: max 5 attempts per childId per 60 seconds
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(childId: string): { allowed: boolean; cooldownMs: number } {
  const now = Date.now();
  const entry = attempts.get(childId);

  if (!entry || entry.resetAt < now) {
    attempts.set(childId, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, cooldownMs: 0 };
  }

  if (entry.count >= 5) {
    return { allowed: false, cooldownMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, cooldownMs: 0 };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { childId, pin } = body;

  if (!childId || !pin) {
    return NextResponse.json({ error: "Brakuje childId lub pin" }, { status: 400 });
  }

  const { allowed, cooldownMs } = checkRateLimit(childId);
  if (!allowed) {
    return NextResponse.json(
      { valid: false, error: "Za dużo prób. Poczekaj chwilę.", cooldownMs },
      { status: 429 }
    );
  }

  const { data: child } = await supabase
    .from("child_profiles")
    .select("pin_code")
    .eq("id", childId)
    .eq("parent_id", user.id)
    .single();

  if (!child) {
    return NextResponse.json({ error: "Nie znaleziono dziecka" }, { status: 404 });
  }

  const valid = child.pin_code === hashPin(pin);

  // Reset rate limit on success
  if (valid) {
    attempts.delete(childId);
  }

  return NextResponse.json({ valid });
}
