"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useKids } from "@/lib/kids-context";
import { THEME_CONFIG } from "@/lib/kids";
import { getKidsPersona, getFirstWord, KIDS_AVATARS } from "@/config/kids-agents";
import { WORLD_LANGUAGES } from "@/config/world-languages";

function getLangName(code: string): string {
  return WORLD_LANGUAGES.find((l) => l.code === code)?.nameNative ?? code;
}

async function playTTS(text: string, language: string): Promise<void> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await new Promise<void>((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        audio.play().catch(() => resolve());
      });
    }
  } catch {}
}

export default function KidsOnboardingPage() {
  const router = useRouter();
  const { child, theme } = useKids();
  const cfg = THEME_CONFIG[theme];
  const persona = getKidsPersona(child.target_language);
  const firstWord = getFirstWord(child.target_language);
  const langName = getLangName(child.target_language);
  const avatars = KIDS_AVATARS[theme] ?? KIDS_AVATARS.jungle;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleStep1 = useCallback(async () => {
    setTtsPlaying(true);
    await playTTS(persona.greeting, "pl");
    setTtsPlaying(false);
    setStep(2);
  }, [persona.greeting]);

  const handleStep2 = (avatar: string) => {
    setSelectedAvatar(avatar);
    setStep(3);
  };

  const handleStep3 = useCallback(async () => {
    setTtsPlaying(true);
    await playTTS(firstWord, child.target_language);
    setTtsPlaying(false);
    setStep(4);
  }, [firstWord, child.target_language]);

  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/kids/children/complete-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_id: selectedAvatar ?? avatars[0] }),
      });
    } catch {}
    router.push("/kids/dashboard");
  }, [selectedAvatar, avatars, router]);

  const cardStyle = {
    backgroundColor: cfg.isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.8)",
    border: `2px solid ${cfg.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
  };

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4 py-8"
      style={{ color: cfg.textColor }}
    >
      <div className="w-full max-w-sm text-center">

        {/* Step 1: Agent intro */}
        {step === 1 && (
          <div className="space-y-6">
            <div
              className="mx-auto flex h-28 w-28 items-center justify-center rounded-full text-7xl shadow-xl"
              style={{ background: cfg.heroBg }}
            >
              {persona.emoji}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold" style={{ color: cfg.textColor }}>
                Cześć, {child.name}!
              </h1>
              <p className="mt-2 text-base" style={{ color: cfg.textSecondary }}>
                Jestem <strong style={{ color: cfg.primary }}>{persona.name}</strong>
                {" "}— {persona.description}.
              </p>
              <p className="mt-1 text-sm" style={{ color: cfg.textSecondary }}>
                Będziemy razem uczyć się <strong>{langName}</strong>!
              </p>
            </div>
            <button
              onClick={handleStep1}
              disabled={ttsPlaying}
              className="w-full rounded-3xl py-5 text-xl font-extrabold text-white shadow-xl transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
              style={{ background: cfg.heroBg, minHeight: 64 }}
            >
              {ttsPlaying ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Ładowanie...
                </span>
              ) : (
                "Chcę się uczyć! 🎉"
              )}
            </button>
          </div>
        )}

        {/* Step 2: Avatar selection */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-extrabold" style={{ color: cfg.textColor }}>
                Wybierz swój avatar!
              </h2>
              <p className="mt-1 text-sm" style={{ color: cfg.textSecondary }}>
                Tapnij tego, który Ci się podoba
              </p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {avatars.map((av) => (
                <button
                  key={av}
                  onClick={() => handleStep2(av)}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-4xl shadow-md transition-transform hover:scale-110 active:scale-95"
                  style={cardStyle}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: First word */}
        {step === 3 && (
          <div className="space-y-6">
            {selectedAvatar && (
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl text-5xl shadow-lg" style={cardStyle}>
                {selectedAvatar}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-extrabold" style={{ color: cfg.textColor }}>
                Twoje pierwsze słówko!
              </h2>
              <p className="mt-1 text-sm" style={{ color: cfg.textSecondary }}>
                Po {langName} powitanie to:
              </p>
            </div>
            <div
              className="rounded-3xl px-6 py-8"
              style={{ background: cfg.heroBg }}
            >
              <p className="text-5xl font-extrabold text-white">{firstWord}</p>
            </div>
            <button
              onClick={handleStep3}
              disabled={ttsPlaying}
              className="w-full rounded-3xl py-5 text-xl font-extrabold text-white shadow-xl transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
              style={{ background: cfg.heroBg, minHeight: 64 }}
            >
              {ttsPlaying ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Odtwarzam...
                </span>
              ) : (
                `Posłuchaj! 🔊`
              )}
            </button>
          </div>
        )}

        {/* Step 4: Finish */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-7xl">🎊</div>
            <div>
              <h2 className="text-2xl font-extrabold" style={{ color: cfg.textColor }}>
                Gotowy na przygodę?
              </h2>
              <p className="mt-2 text-sm" style={{ color: cfg.textSecondary }}>
                Zdobyłeś pierwszą gwiazdkę! ⭐
              </p>
            </div>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full rounded-3xl py-5 text-xl font-extrabold text-white shadow-xl transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
              style={{ background: cfg.heroBg, minHeight: 64 }}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Wczytywanie...
                </span>
              ) : (
                "Do przygody! 🚀"
              )}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
