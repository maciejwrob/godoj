// Server-side i18n helper — no "use client" directive
import type { Locale } from "./i18n";

export function resolveLocaleServer(nativeLang?: string | null): Locale {
  if (!nativeLang) return "en";
  const lower = nativeLang.toLowerCase();
  if (lower === "pl" || lower === "polski") return "pl";
  return "en";
}

export async function getServerLocale(supabase: ReturnType<Awaited<typeof import("@/lib/supabase/server")["createClient"]>>, userId: string): Promise<Locale> {
  const { data } = await supabase.from("users").select("native_language").eq("id", userId).single();
  return resolveLocaleServer(data?.native_language);
}
