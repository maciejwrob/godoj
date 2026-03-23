import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, isAdmin: false };

  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  return { supabase, user, isAdmin: data?.role === "admin" };
}
