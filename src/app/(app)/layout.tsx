import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppNav from "./nav";
import { LanguageProvider } from "@/lib/language-context";
import { LocaleWrapper } from "@/components/locale-wrapper";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: userData }, { data: profiles }] = await Promise.all([
    supabase.from("users").select("display_name, role, onboarding_complete, native_language, ui_language").eq("id", user.id).single(),
    supabase.from("user_profiles").select("id, target_language, language_variant, current_level, selected_agent_id").eq("user_id", user.id).order("created_at"),
  ]);

  const typedProfiles = (profiles ?? []) as { id: string; target_language: string; language_variant: string | null; current_level: string; selected_agent_id: string | null }[];
  const defaultLang = typedProfiles[0]?.target_language ?? "";
  const nativeLang = userData?.ui_language ?? userData?.native_language ?? "en";

  return (
    <LocaleWrapper nativeLanguage={nativeLang}>
      <LanguageProvider serverProfiles={typedProfiles} defaultLanguage={defaultLang}>
        <div className="min-h-screen">
          {userData?.onboarding_complete && (
            <AppNav
              displayName={userData?.display_name ?? "User"}
              role={userData?.role ?? "adult"}
            />
          )}
          <main className={userData?.onboarding_complete ? "pb-20 pt-16 lg:ml-64 lg:pb-0 lg:pt-0" : ""}>
            {children}
          </main>
        </div>
      </LanguageProvider>
    </LocaleWrapper>
  );
}
