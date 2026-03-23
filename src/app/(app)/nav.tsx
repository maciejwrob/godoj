"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageCircle,
  BookOpen,
  Dumbbell,
  BarChart3,
  Trophy,
  Settings,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lesson", label: "Lekcja", icon: MessageCircle },
  { href: "/vocabulary", label: "Słowniczek", icon: BookOpen },
  { href: "/exercises", label: "Ćwiczenia", icon: Dumbbell },
  { href: "/progress", label: "Postępy", icon: BarChart3 },
  { href: "/achievements", label: "Odznaki", icon: Trophy },
  { href: "/settings", label: "Ustawienia", icon: Settings },
];

const MOBILE_MAIN = NAV_ITEMS.slice(0, 5);
const MOBILE_MORE = NAV_ITEMS.slice(5);

export default function AppNav({
  displayName,
  role,
}: {
  displayName: string;
  role: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="border-b border-border bg-bg-card/50">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <MessageCircle className="h-5 w-5 text-primary" />
            Godoj
          </Link>

          <div className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-text-secondary sm:block">
            {displayName}
            {role === "admin" && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">admin</span>
            )}
          </span>
          <button onClick={handleLogout} className="rounded-lg p-2 text-text-secondary hover:text-text-primary" title="Wyloguj się">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex items-center justify-around border-t border-border px-2 py-1 sm:hidden">
        {MOBILE_MAIN.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs ${
                active ? "text-primary" : "text-text-secondary"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        {/* More menu */}
        <div className="relative">
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs ${
              MOBILE_MORE.some((i) => i.href === pathname) ? "text-primary" : "text-text-secondary"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            Więcej
          </button>
          {moreOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-40 rounded-xl border border-border bg-bg-card p-2 shadow-xl">
              {MOBILE_MORE.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
