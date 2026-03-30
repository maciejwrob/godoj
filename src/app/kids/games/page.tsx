"use client";

import { useKids } from "@/lib/kids-context";
import { THEME_CONFIG } from "@/lib/kids";

export default function KidsGamesPage() {
  const { child } = useKids();
  const cfg = THEME_CONFIG[child.theme];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div
        className="w-full max-w-sm rounded-3xl p-8 text-center"
        style={{
          backgroundColor: cfg.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        }}
      >
        <p className="mb-3 text-6xl">🎮</p>
        <h1 className="mb-2 text-xl font-extrabold" style={{ color: cfg.textColor }}>
          Mini-gry
        </h1>
        <p className="text-sm" style={{ color: cfg.textSecondary }}>
          Wkrótce pojawią się tu super gry do nauki języków!
        </p>
      </div>
    </main>
  );
}
