import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Mail,
  Bot,
  BarChart3,
  MessageSquare,
  FileText,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Użytkownicy", icon: Users },
  { href: "/admin/invite", label: "Zaproszenia", icon: Mail },
  { href: "/admin/agents", label: "Agenci", icon: Bot },
  { href: "/admin/prompt", label: "System Prompt", icon: FileText },
  { href: "/admin/usage", label: "Użycie", icon: BarChart3 },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/admin/errors", label: "Error Log", icon: AlertTriangle },
];

export default async function AdminLayout({
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-bg-dark flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-text-primary font-bold text-lg">Admin Panel</h2>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-colors text-sm"
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t border-border">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-colors text-sm"
          >
            <ArrowLeft size={18} />
            Wróć do aplikacji
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
