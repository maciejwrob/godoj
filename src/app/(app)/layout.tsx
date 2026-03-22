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

  const { data: userData } = await supabase
    .from("users")
    .select("display_name, role, onboarding_complete")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen">
      {userData?.onboarding_complete && (
        <AppNav
          displayName={userData?.display_name ?? "Użytkownik"}
          role={userData?.role ?? "adult"}
        />
      )}
      {children}
    </div>
  );
}
