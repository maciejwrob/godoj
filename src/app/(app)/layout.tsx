import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppNav from "./nav";

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

  const [{ data: userData }, { data: profile }] = await Promise.all([
    supabase
      .from("users")
      .select("display_name, role, onboarding_complete")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_profiles")
      .select("current_level")
      .eq("user_id", user.id)
      .limit(1)
      .single(),
  ]);

  return (
    <div className="min-h-screen">
      {userData?.onboarding_complete && (
        <AppNav
          displayName={userData?.display_name ?? "Użytkownik"}
          role={userData?.role ?? "adult"}
          level={profile?.current_level ?? "A1"}
        />
      )}
      {/* Main content area: offset for sidebar on desktop, bottom nav on mobile */}
      <main className={userData?.onboarding_complete ? "pb-20 pt-16 lg:ml-64 lg:pb-0 lg:pt-0" : ""}>
        {children}
      </main>
    </div>
  );
}
