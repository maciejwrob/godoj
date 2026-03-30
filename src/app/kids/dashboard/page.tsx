"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useKids } from "@/lib/kids-context";
import { THEME_CONFIG } from "@/lib/kids";
import { WORLD_LANGUAGES } from "@/config/world-languages";

function getFlag(langCode: string): string {
  return WORLD_LANGUAGES.find((l) => l.code === langCode)?.flag ?? "🌍";
}

// Stars rendered in a row
function Stars({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <span>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ opacity: i < count ? 1 : 0.25 }}>⭐</span>
      ))}
    </span>
  );
}

// Adventure map — shows 10 stops per world, winding path
type ThemeCfg = (typeof THEME_CONFIG)[keyof typeof THEME_CONFIG];

function AdventureMap({
  completedLessons,
  cfg,
}: {
  completedLessons: number;
  cfg: ThemeCfg;
}) {
  const STOPS_PER_WORLD = 10;
  const currentWorld = Math.floor(completedLessons / STOPS_PER_WORLD);
  const progressInWorld = completedLessons % STOPS_PER_WORLD;

  const stops = Array.from({ length: STOPS_PER_WORLD }, (_, i) => ({
    n: currentWorld * STOPS_PER_WORLD + i + 1,
    completed: i < progressInWorld,
    current: i === progressInWorld,
    locked: i > progressInWorld,
  }));

  // Winding path: odd rows go right, even rows go left → show 2 rows of 5
  const row1 = stops.slice(0, 5); // left to right
  const row2 = stops.slice(5, 10).reverse(); // right to left

  function StopNode({ stop, size = 52 }: { stop: typeof stops[0]; size?: number }) {
    const isActive = stop.current;
    const bg = stop.completed
      ? cfg.primary
      : stop.current
      ? cfg.accent
      : cfg.isDark
      ? "rgba(255,255,255,0.1)"
      : "rgba(0,0,0,0.08)";
    const color = stop.completed || stop.current ? "#fff" : cfg.isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)";

    return (
      <div className="flex flex-col items-center gap-1">
        <div
          className="flex items-center justify-center rounded-full font-extrabold shadow-md"
          style={{
            width: size,
            height: size,
            backgroundColor: bg,
            color,
            fontSize: size * 0.28,
            border: isActive ? `3px solid ${cfg.primary}` : "none",
            animation: isActive ? "pulse 1.5s ease-in-out infinite" : undefined,
            boxShadow: isActive ? `0 0 0 6px ${cfg.primary}40` : undefined,
          }}
        >
          {stop.completed ? "⭐" : stop.locked ? "🔒" : stop.current ? "▶" : `${stop.n}`}
        </div>
        {stop.current && (
          <span className="text-[10px] font-bold" style={{ color: cfg.accent }}>
            TU!
          </span>
        )}
      </div>
    );
  }

  const rowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 8px",
  };

  const connectorStyle = {
    flex: 1,
    height: 3,
    backgroundColor: cfg.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
    borderRadius: 2,
    margin: "0 2px",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-bold" style={{ color: cfg.textSecondary }}>
          Świat {currentWorld + 1} · Stop {progressInWorld}/{STOPS_PER_WORLD}
        </p>
        <p className="text-xs" style={{ color: cfg.textSecondary }}>
          Łącznie: {completedLessons} lekcji
        </p>
      </div>

      {/* Row 1: left → right */}
      <div style={rowStyle}>
        {row1.map((stop, i) => (
          <>
            <StopNode key={stop.n} stop={stop} />
            {i < row1.length - 1 && <div style={connectorStyle} />}
          </>
        ))}
      </div>

      {/* Curve connector between rows */}
      <div className="flex justify-end pr-2">
        <div style={{ ...connectorStyle, flex: "none", width: 24, height: 24, borderRadius: "0 0 12px 0", borderBottom: `3px solid ${cfg.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`, borderRight: `3px solid ${cfg.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`, backgroundColor: "transparent" }} />
      </div>

      {/* Row 2: right → left */}
      <div style={rowStyle}>
        {row2.map((stop, i) => (
          <>
            <StopNode key={stop.n} stop={stop} />
            {i < row2.length - 1 && <div style={connectorStyle} />}
          </>
        ))}
      </div>
    </div>
  );
}

function SpaceStars() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: i % 5 === 0 ? 2 : 1,
            height: i % 5 === 0 ? 2 : 1,
            top: `${(i * 7.3) % 100}%`,
            left: `${(i * 13.7) % 100}%`,
            opacity: 0.2 + (i % 4) * 0.1,
          }}
        />
      ))}
    </div>
  );
}

interface Stats {
  stars_total: number;
  current_streak: number;
  completed_lessons: number;
  onboarding_completed: boolean;
}

export default function KidsDashboardPage() {
  const router = useRouter();
  const { child, ageGroup, theme } = useKids();
  const cfg = THEME_CONFIG[theme];
  const flag = getFlag(child.target_language);
  const avatar = child.avatar_id && child.avatar_id !== "default_1" ? child.avatar_id : child.name.charAt(0).toUpperCase();

  const [stats, setStats] = useState<Stats>({
    stars_total: child.stars_total,
    current_streak: child.current_streak,
    completed_lessons: 0,
    onboarding_completed: child.onboarding_completed,
  });

  useEffect(() => {
    // Redirect to onboarding if not completed
    if (!child.onboarding_completed) {
      router.push("/kids/onboarding");
      return;
    }
    // Fetch fresh stats
    fetch("/api/kids/stats")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setStats({
            stars_total: data.stars_total,
            current_streak: data.current_streak,
            completed_lessons: data.completed_lessons,
            onboarding_completed: data.onboarding_completed,
          });
        }
      })
      .catch(() => {});
  }, [child.onboarding_completed, router]);

  if (!child.onboarding_completed) return null; // redirecting

  const themeTitle = {
    castle: "Witaj w Magicznym Zamku",
    jungle: "Witaj w Dżungli Przygód",
    space: "Witaj na Kosmicznej Misji",
  }[theme];

  const cardBg = cfg.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const cardBorder = `1px solid ${cfg.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)"}`;

  return (
    <main className="relative min-h-screen px-4 pb-8 pt-5" style={{ color: cfg.textColor }}>
      {theme === "space" && <SpaceStars />}

      <div className="relative z-10 mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold text-white shadow-lg"
              style={{ background: cfg.heroBg }}
            >
              {avatar}
            </div>
            <div>
              <h1 className="text-xl font-extrabold" style={{ color: cfg.textColor }}>
                Cześć, {child.name}!
              </h1>
              <p className="text-xs" style={{ color: cfg.textSecondary }}>
                {ageGroup} lat · {flag}
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold"
            style={{ backgroundColor: cfg.accent + "33", color: cfg.accent }}
          >
            ⭐ {stats.stars_total}
          </div>
        </div>

        {/* Hero card */}
        <div
          className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl"
          style={{ background: cfg.heroBg }}
        >
          <div className="relative z-10">
            <p className="mb-1 text-sm font-medium opacity-80">{themeTitle}</p>
            <h2 className="mb-3 text-2xl font-extrabold">Gotowy na przygodę?</h2>
            <Link
              href="/kids/lesson"
              className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-base font-extrabold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: "rgba(255,255,255,0.25)", border: "2px solid rgba(255,255,255,0.5)" }}
            >
              ZACZYNAMY! ✨
            </Link>
          </div>
          <div className="pointer-events-none absolute -right-3 -top-3 text-8xl opacity-20" aria-hidden>
            {cfg.heroEmoji}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { emoji: "🔥", value: stats.current_streak, label: "Seria" },
            { emoji: "⭐", value: stats.stars_total, label: "Gwiazdki" },
            { emoji: "📚", value: stats.completed_lessons, label: "Lekcje" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 rounded-2xl p-3 text-center"
              style={{ backgroundColor: cardBg, border: cardBorder }}
            >
              <span className="text-2xl">{stat.emoji}</span>
              <span className="text-base font-extrabold" style={{ color: cfg.textColor }}>
                {stat.value}
              </span>
              <span className="text-[11px]" style={{ color: cfg.textSecondary }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Adventure map */}
        <div
          className="rounded-3xl p-4"
          style={{ backgroundColor: cardBg, border: cardBorder }}
        >
          <p className="mb-3 text-sm font-extrabold" style={{ color: cfg.primary }}>
            🗺 Mapa przygody
          </p>
          <AdventureMap completedLessons={stats.completed_lessons} cfg={cfg} />
          <div className="mt-3 text-center">
            <Link
              href="/kids/lesson"
              className="inline-block rounded-2xl px-6 py-3 text-sm font-extrabold text-white shadow-md transition-transform hover:scale-105 active:scale-95"
              style={{ background: cfg.heroBg }}
            >
              ▶ Rusz dalej!
            </Link>
          </div>
        </div>

        {/* Quick access row */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/kids/games"
            className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center"
            style={{ backgroundColor: cardBg, border: cardBorder }}
          >
            <span className="text-3xl">🎮</span>
            <span className="text-xs font-bold" style={{ color: cfg.textSecondary }}>Mini-gry</span>
            <span className="text-[10px] rounded-full px-2 py-0.5" style={{ backgroundColor: cfg.primary + "20", color: cfg.primary }}>Wkrótce</span>
          </Link>
          <Link
            href="/kids/rewards"
            className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center"
            style={{ backgroundColor: cardBg, border: cardBorder }}
          >
            <span className="text-3xl">🏆</span>
            <span className="text-xs font-bold" style={{ color: cfg.textSecondary }}>Nagrody</span>
            <span className="text-[10px] rounded-full px-2 py-0.5" style={{ backgroundColor: cfg.primary + "20", color: cfg.primary }}>Wkrótce</span>
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 6px transparent; }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </main>
  );
}
