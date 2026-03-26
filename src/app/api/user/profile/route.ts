import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Also get display_name
    const { data: userData } = await supabase.from("users").select("display_name").eq("id", user.id).single();

    return NextResponse.json({ ...profile, display_name: userData?.display_name ?? "User" });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
