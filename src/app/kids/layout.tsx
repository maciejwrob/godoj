import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAgeGroup } from "@/lib/kids";
import KidsLayoutClient from "./layout-client";
import type { ChildProfile } from "@/types/kids";

export default async function KidsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const activeChildId = cookieStore.get("godoj_active_child_id")?.value;
  if (!activeChildId) redirect("/settings");

  const { data: child } = await supabase
    .from("child_profiles")
    .select("*")
    .eq("id", activeChildId)
    .eq("parent_id", user.id)
    .single();

  if (!child) redirect("/settings");

  const ageGroup = getAgeGroup(child.date_of_birth);

  return (
    <KidsLayoutClient child={child as ChildProfile} ageGroup={ageGroup}>
      {children}
    </KidsLayoutClient>
  );
}
