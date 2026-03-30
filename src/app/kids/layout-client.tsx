"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KidsContext } from "@/lib/kids-context";
import { THEME_CONFIG, clearActiveChild } from "@/lib/kids";
import type { ChildProfile, AgeGroup, KidsTheme } from "@/types/kids";

interface Props {
  child: ChildProfile;
  ageGroup: AgeGroup;
  children: React.ReactNode;
}

export default function KidsLayoutClient({ child, ageGroup, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = child.theme as KidsTheme;
  const cfg = THEME_CONFIG[theme];

  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [localAttempts, setLocalAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(false);

  function switchBackToParent() {
    setShowPinModal(true);
  }

  async function handlePinSubmit() {
    if (cooldown || pin.length !== 4) return;
    setPinLoading(true);
    setPinError("");
    try {
      const res = await fetch("/api/kids/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: child.id, pin }),
      });
      const data = await res.json();

      if (res.status === 429) {
        setCooldown(true);
        setPinError("Za dużo prób. Poczekaj 60 sekund.");
        setTimeout(() => {
          setCooldown(false);
          setLocalAttempts(0);
          setPinError("");
        }, data.cooldownMs ?? 60_000);
        setPin("");
        return;
      }

      if (data.valid) {
        clearActiveChild();
        router.push("/dashboard");
      } else {
        const next = localAttempts + 1;
        setLocalAttempts(next);
        if (next >= 5) {
          setCooldown(true);
          setPinError("Za dużo prób. Poczekaj 60 sekund.");
          setTimeout(() => {
            setCooldown(false);
            setLocalAttempts(0);
            setPinError("");
          }, 60_000);
        } else {
          setPinError(`Niepoprawny PIN. Pozostało prób: ${5 - next}`);
        }
        setPin("");
      }
    } catch {
      setPinError("Błąd połączenia.");
    } finally {
      setPinLoading(false);
    }
  }

  const NAV = [
    { href: "/kids/dashboard", label: "Mapa", emoji: "🗺" },
    { href: "/kids/games", label: "Gry", emoji: "🎮" },
    { href: "/kids/rewards", label: "Nagrody", emoji: "🏆" },
  ];

  return (
    <KidsContext.Provider value={{ child, ageGroup, theme, switchBackToParent }}>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: cfg.bg,
          color: cfg.textColor,
          // Space theme: subtle stars via background
          backgroundImage:
            theme === "space"
              ? "radial-gradient(ellipse at 20% 30%, #1a1a4e 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, #0f0f2e 0%, transparent 60%)"
              : undefined,
        }}
      >
        {/* Main content with bottom nav padding */}
        <div className="pb-20">
          {children}
        </div>

        {/* Parent return button — lock icon, top-right */}
        <button
          onClick={switchBackToParent}
          className="fixed right-4 top-4 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: cfg.primary }}
          aria-label="Powrót do konta rodzica"
        >
          <span className="text-xl">🔒</span>
        </button>

        {/* Bottom navigation */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t px-2 py-2"
          style={{
            backgroundColor: cfg.isDark ? "rgba(15,15,46,0.95)" : "rgba(255,255,255,0.95)",
            borderColor: cfg.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
            backdropFilter: "blur(12px)",
          }}
        >
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 rounded-xl px-5 py-2 text-xs font-medium transition-colors"
                style={{
                  color: active ? cfg.primary : cfg.textSecondary,
                  fontWeight: active ? 700 : 500,
                }}
              >
                <span className="text-2xl">{item.emoji}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* PIN modal */}
        {showPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="mb-1 text-center text-lg font-bold text-gray-800">Czy to rodzic?</h2>
              <p className="mb-4 text-center text-sm text-gray-500">
                Wpisz 4-cyfrowy PIN żeby wrócić na konto dorosłego
              </p>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                placeholder="••••"
                autoFocus
                className="mb-3 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-center text-2xl font-bold tracking-widest text-gray-800 outline-none focus:border-blue-400"
                style={{ letterSpacing: "0.4em" }}
              />
              {pinError && (
                <p className="mb-3 text-center text-sm text-red-500">{pinError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPinModal(false);
                    setPin("");
                    setPinError("");
                  }}
                  className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Anuluj
                </button>
                <button
                  onClick={handlePinSubmit}
                  disabled={pin.length !== 4 || pinLoading || cooldown}
                  className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition-colors disabled:opacity-40"
                  style={{ backgroundColor: cfg.primary }}
                >
                  {pinLoading ? "..." : "Potwierdź"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </KidsContext.Provider>
  );
}
