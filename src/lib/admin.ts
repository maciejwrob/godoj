import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { supabase: createAdminClient(), user: null, isAdmin: false };

  // Use admin client to check role (bypasses RLS)
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  // Return admin client for all admin operations (bypasses RLS)
  return { supabase: adminClient, user, isAdmin: data?.role === "admin" };
}
