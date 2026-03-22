import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">Witaj w Godoj</h1>
        <p className="text-text-secondary">
          Zalogowano jako {user.email}
        </p>
        <p className="text-sm text-text-secondary">
          Panel główny — wkrótce tutaj pojawi się więcej.
        </p>
      </div>
    </main>
  );
}
