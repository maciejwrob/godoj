// Server-side i18n helpers
import { resolveLocale } from "./i18n-data";
import type { Locale } from "./i18n-data";

export type { Locale };
export { resolveLocale as resolveLocaleServer };

export async function getServerLocale(supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server")["createClient"]>>, userId: string): Promise<Locale> {
  try {
    const { data } = await supabase.from("users").select("native_language").eq("id", userId).single();
    return resolveLocale(data?.native_language);
  } catch {
    return "en";
  }
}
