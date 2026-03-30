import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgeGroup, calculateAge } from "@/lib/kids";
import { createHash } from "crypto";

function hashPin(pin: string): string {
  return createHash("sha256").update(`godoj-pin-${pin}`).digest("hex");
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("child_profiles")
    .select("*")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const children = (data ?? []).map((child) => ({
    ...child,
    age: calculateAge(child.date_of_birth),
    age_group: getAgeGroup(child.date_of_birth),
  }));

  return NextResponse.json(children);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, date_of_birth, theme, target_language, pin } = body;

  // Validate required fields
  if (!name?.trim() || !date_of_birth || !theme || !target_language || !pin) {
    return NextResponse.json({ error: "Brakuje wymaganych pól" }, { status: 400 });
  }

  // Validate PIN
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN musi mieć 4 cyfry" }, { status: 400 });
  }

  // Validate theme
  if (!["castle", "jungle", "space"].includes(theme)) {
    return NextResponse.json({ error: "Nieprawidłowy motyw" }, { status: 400 });
  }

  // Validate age (3-13 years)
  const age = calculateAge(date_of_birth);
  if (age < 3 || age > 13) {
    return NextResponse.json(
      { error: "Wiek dziecka musi być między 3 a 13 lat" },
      { status: 400 }
    );
  }

  // Check max 5 children
  const { count } = await supabase
    .from("child_profiles")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", user.id);

  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: "Osiągnięto limit 5 kont dziecięcych" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("child_profiles")
    .insert({
      parent_id: user.id,
      name: name.trim(),
      date_of_birth,
      theme,
      target_language,
      pin_code: hashPin(pin),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ...data,
    age: calculateAge(data.date_of_birth),
    age_group: getAgeGroup(data.date_of_birth),
  });
}
