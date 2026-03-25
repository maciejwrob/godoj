import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppNav from "./nav";
import { LanguageProvider } from "@/lib/language-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: userData }, { data: profiles }] = await Promise.all([
    supabase
      .from("users")
      .select("display_name, role, onboarding_complete")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_profiles")
      .select("target_language, current_level, language_variant")
      .eq("user_id", user.id)
      .order("created_at"),
  ]);

  const firstProfile = profiles?.[0];
  const defaultLang = firstProfile?.target_language ?? "no";

  return (
    <LanguageProvider defaultLanguage={defaultLang}>
      <div className="min-h-screen">
        {userData?.onboarding_complete && (
          <AppNav
            displayName={userData?.display_name ?? "Uzytkownik"}
            role={userData?.role ?? "adult"}
            level={firstProfile?.current_level ?? "A1"}
            activeLang={defaultLang}
          />
        )}
        <main className={userData?.onboarding_complete ? "pb-20 pt-16 lg:ml-64 lg:pb-0 lg:pt-0" : ""}>
          {children}
        </main>
      </div>
    </LanguageProvider>
  );
}
