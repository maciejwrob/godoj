import { createClient } from "@supabase/supabase-js";

// Admin client that bypasses RLS — use only in server-side code
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
