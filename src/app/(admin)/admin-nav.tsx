"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Activity,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Użytkownicy", icon: Users },
  { href: "/admin/invite", label: "Zaproszenia", icon: Mail },
  { href: "/admin/agents", label: "Agenci", icon: Bot },
  { href: "/admin/prompt", label: "System Prompt", icon: FileText },
  { href: "/admin/usage", label: "Użycie", icon: BarChart3 },
  { href: "/admin/events", label: "Aktywność", icon: Activity },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/admin/errors", label: "Error Log", icon: AlertTriangle },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-text-primary font-bold text-lg">Admin Panel</h2>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-2 border-t border-border">
        <Link
          href="/app/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-colors text-sm"
        >
          <ArrowLeft size={18} />
          Wróć do aplikacji
        </Link>
      </div>
    </aside>
  );
}
