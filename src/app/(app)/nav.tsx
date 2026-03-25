"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoFull, LogoIcon } from "@/components/logo";
import { getLangFlag } from "@/lib/languages";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/lesson", label: "Lekcja", icon: "menu_book" },
  { href: "/vocabulary", label: "Słowniczek", icon: "translate" },
  { href: "/exercises", label: "Ćwiczenia", icon: "fitness_center" },
  { href: "/progress", label: "Postępy", icon: "leaderboard" },
  { href: "/achievements", label: "Odznaki", icon: "military_tech" },
];

const BOTTOM_ITEMS = [
  { href: "/settings", label: "Ustawienia", icon: "settings" },
];

function MaterialIcon({ name, filled, className }: { name: string; filled?: boolean; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined ${className ?? ""}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}

export default function AppNav({
  displayName,
  role,
  level,
  activeLang,
}: {
  displayName: string;
  role: string;
  level?: string;
  activeLang?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-white/5 bg-surface shadow-2xl shadow-black/50 lg:flex">
        {/* Logo */}
        <div className="p-8 pb-10">
          <LogoFull size={40} />
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 px-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? "bg-godoj-blue/10 font-bold text-godoj-blue"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                }`}
              >
                <MaterialIcon name={item.icon} filled={active} className="transition-transform group-hover:scale-110" />
                {item.label}
              </Link>
            );
          })}

          <div className="mt-4 border-t border-white/5 pt-4">
            {BOTTOM_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    active
                      ? "bg-godoj-blue/10 font-bold text-godoj-blue"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                  }`}
                >
                  <MaterialIcon name={item.icon} filled={active} />
                  {item.label}
                </Link>
              );
            })}
            {role === "admin" && (
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-100"
              >
                <MaterialIcon name="admin_panel_settings" />
                Admin
              </Link>
            )}
          </div>
        </nav>

        {/* User card */}
        <div className="p-6">
          <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-surface-container-high p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-white/10">
              <MaterialIcon name="person" className="text-primary" />
            </div>
            <div className="overflow-hidden">
              <p className="truncate font-bold text-white">{displayName}</p>
              <p className="text-[10px] font-bold uppercase text-slate-500">
                {activeLang ? getLangFlag(activeLang) + " " : ""}Poziom {level ?? "A1"}
              </p>
            </div>
            <button onClick={handleLogout} className="ml-auto text-slate-500 hover:text-white" title="Wyloguj się">
              <MaterialIcon name="logout" className="text-lg" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-white/5 bg-surface/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <LogoFull size={32} />
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-slate-400">
          <MaterialIcon name={mobileOpen ? "close" : "menu"} className="text-2xl" />
        </button>
      </header>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-surface/95 pt-16 lg:hidden">
          <nav className="space-y-1 p-4">
            {[...NAV_ITEMS, ...BOTTOM_ITEMS].map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-4 text-base font-medium ${
                    active ? "bg-godoj-blue/10 text-godoj-blue" : "text-slate-400"
                  }`}
                >
                  <MaterialIcon name={item.icon} filled={active} />
                  {item.label}
                </Link>
              );
            })}
            <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-4 text-base font-medium text-red-400">
              <MaterialIcon name="logout" />
              Wyloguj się
            </button>
          </nav>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/5 bg-surface/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] ${
                active ? "text-godoj-blue" : "text-slate-500"
              }`}
            >
              <MaterialIcon name={item.icon} filled={active} className="text-xl" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
