"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useConversation } from "@11labs/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useKids } from "@/lib/kids-context";
import { THEME_CONFIG } from "@/lib/kids";

type LessonState = "loading" | "ready" | "connecting" | "active" | "ending" | "result" | "error";

export default function KidsLessonPage() {
  const router = useRouter();
  const { child, theme } = useKids();
  const cfg = THEME_CONFIG[theme];

  const [lessonState, setLessonState] = useState<LessonState>("loading");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(10);
  const [agentName, setAgentName] = useState("Kumpel");
  const [agentEmoji, setAgentEmoji] = useState("😊");
  const [signedUrl, setSignedUrl] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [stars, setStars] = useState(0);
  const [praise, setPraise] = useState("");
  const [error, setError] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const transcriptRef = useRef<{ source: "user" | "ai"; message: string }[]>([]);
  const lessonActiveRef = useRef(false);

  const conversation = useConversation({
    onConnect: () => {
      setLessonState("active");
      lessonActiveRef.current = true;
      startTimeRef.current = Date.now();
      setTimeLeft(duration * 60);
      if (systemPrompt) {
        try { conversation.sendContextualUpdate(systemPrompt); } catch {}
      }
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onDisconnect: () => {
      lessonActiveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (lessonState === "active") handleEndLesson();
    },
    onMessage: ({ message, source }) => {
      if (message?.trim()) {
        transcriptRef.current = [...transcriptRef.current, { source, message: message.trim() }];
      }
    },
    onError: (msg: string) => {
      console.error("Kids conversation error:", msg);
      setError("Utracono połączenie. Spróbuj ponownie.");
      setLessonState("error");
    },
  });

  useEffect(() => {
    loadLesson();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLesson() {
    setLessonState("loading");
    try {
      const res = await fetch("/api/kids/lessons/start", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Błąd serwera");
      }
      const data = await res.json();
      setLessonId(data.lesson_id);
      setTopic(data.topic);
      setDuration(data.duration);
      setAgentName(data.agent_name);
      setAgentEmoji(data.agent_emoji ?? "😊");
      setSignedUrl(data.signed_url);
      setSystemPrompt(data.system_prompt_override ?? "");
      setLessonState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania lekcji");
      setLessonState("error");
    }
  }

  async function startConversation() {
    setLessonState("connecting");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ signedUrl });
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Zezwól na dostęp do mikrofonu!"
          : "Nie udało się połączyć.";
      setError(msg);
      setLessonState("error");
    }
  }

  const handleEndLesson = useCallback(async () => {
    if (lessonState === "ending" || lessonState === "result") return;
    setLessonState("ending");
    lessonActiveRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    try { await conversation.endSession(); } catch {}

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const transcriptText = transcriptRef.current
      .map((t) => `${t.source === "ai" ? "Agent" : "User"}: ${t.message}`)
      .join("\n");

    try {
      const res = await fetch("/api/kids/lessons/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          transcript: transcriptText,
          duration_seconds: durationSeconds,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setStars(data.stars ?? 1);
        setPraise(data.praise ?? "Brawo!");
        setLessonState("result");
        // Auto-redirect after 4 seconds
        setTimeout(() => router.push("/kids/dashboard"), 4000);
      } else {
        router.push("/kids/dashboard");
      }
    } catch {
      router.push("/kids/dashboard");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonState, lessonId, router]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const isSpeaking = conversation.isSpeaking;

  // ---- RENDER ----

  if (lessonState === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8" style={{ color: cfg.textColor }}>
        <div className="space-y-5 text-center">
          <div className="text-6xl">😕</div>
          <h1 className="text-xl font-bold" style={{ color: cfg.textColor }}>Ups, coś poszło nie tak</h1>
          <p className="text-sm" style={{ color: cfg.textSecondary }}>{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/kids/dashboard")}
              className="rounded-2xl border-2 px-5 py-3 text-sm font-bold"
              style={{ borderColor: cfg.primary, color: cfg.primary }}
            >
              Wróć
            </button>
            <button
              onClick={loadLesson}
              className="rounded-2xl px-5 py-3 text-sm font-bold text-white"
              style={{ background: cfg.heroBg }}
            >
              Spróbuj znowu
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (lessonState === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center" style={{ color: cfg.textColor }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: cfg.primary }} />
        <p className="mt-3 text-base font-medium" style={{ color: cfg.textSecondary }}>
          Przygotowuję lekcję...
        </p>
      </main>
    );
  }

  if (lessonState === "ready") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8" style={{ color: cfg.textColor }}>
        <div className="w-full max-w-sm space-y-6 text-center">
          <div
            className="mx-auto flex h-28 w-28 items-center justify-center rounded-full text-6xl shadow-xl"
            style={{ background: cfg.heroBg }}
          >
            {agentEmoji}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: cfg.textColor }}>{agentName}</h1>
            <p className="mt-1 text-sm" style={{ color: cfg.textSecondary }}>
              Temat: <strong style={{ color: cfg.primary }}>{topic}</strong>
            </p>
            <p className="mt-0.5 text-xs" style={{ color: cfg.textSecondary }}>
              Czas: {duration} minut
            </p>
          </div>
          <button
            onClick={startConversation}
            className="w-full rounded-3xl py-5 text-2xl font-extrabold text-white shadow-xl transition-transform hover:scale-105 active:scale-95"
            style={{ background: cfg.heroBg, minHeight: 72 }}
          >
            ZACZYNAMY! 🎉
          </button>
          <button
            onClick={() => router.push("/kids/dashboard")}
            className="text-sm font-medium"
            style={{ color: cfg.textSecondary }}
          >
            ← Wróć do mapy
          </button>
        </div>
      </main>
    );
  }

  if (lessonState === "connecting") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center" style={{ color: cfg.textColor }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: cfg.primary }} />
        <p className="mt-3 text-base font-medium" style={{ color: cfg.textSecondary }}>
          Łączę z {agentName}...
        </p>
      </main>
    );
  }

  if (lessonState === "ending") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center" style={{ color: cfg.textColor }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: cfg.primary }} />
        <p className="mt-3 text-base font-medium" style={{ color: cfg.textSecondary }}>
          Liczę gwiazdki...
        </p>
      </main>
    );
  }

  if (lessonState === "result") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4" style={{ color: cfg.textColor }}>
        <div className="w-full max-w-xs space-y-5 text-center">
          <div className="text-8xl animate-bounce">🎊</div>
          <h1 className="text-3xl font-extrabold" style={{ color: cfg.primary }}>{praise}</h1>
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: stars }).map((_, i) => (
              <span key={i} className="text-5xl" style={{ animationDelay: `${i * 0.2}s` }}>⭐</span>
            ))}
          </div>
          <p className="text-sm" style={{ color: cfg.textSecondary }}>
            Wracam do mapy...
          </p>
        </div>
      </main>
    );
  }

  // ACTIVE LESSON
  const progressPct = duration > 0 ? Math.min(100, Math.round(((duration * 60 - timeLeft) / (duration * 60)) * 100)) : 0;

  return (
    <main className="flex h-screen flex-col" style={{ color: cfg.textColor }}>
      {/* Top bar: topic + timer */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          backgroundColor: cfg.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          borderBottom: `1px solid ${cfg.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)"}`,
        }}
      >
        <p className="truncate text-sm font-bold" style={{ color: cfg.primary, maxWidth: "60%" }}>
          {topic}
        </p>
        <div
          className="rounded-full px-3 py-1 text-sm font-mono font-bold"
          style={{
            backgroundColor: timeLeft <= 30 ? "#ef444420" : cfg.primary + "20",
            color: timeLeft <= 30 ? "#ef4444" : cfg.primary,
          }}
        >
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full" style={{ backgroundColor: cfg.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)" }}>
        <div
          className="h-full transition-all duration-1000"
          style={{ width: `${progressPct}%`, backgroundColor: cfg.primary }}
        />
      </div>

      {/* Agent area */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
        {/* Agent avatar with speaking indicator */}
        <div className="relative">
          {isSpeaking && (
            <div
              className="absolute -inset-4 animate-pulse rounded-full opacity-30"
              style={{ backgroundColor: cfg.primary }}
            />
          )}
          <div
            className="relative flex h-32 w-32 items-center justify-center rounded-full text-7xl shadow-2xl"
            style={{ background: cfg.heroBg }}
          >
            {agentEmoji}
          </div>
        </div>

        <p className="text-lg font-bold" style={{ color: cfg.textSecondary }}>
          {isSpeaking ? `${agentName} mówi...` : "Twoja kolej! 🎤"}
        </p>

        {/* Mic visualization — simple pulsing ring when user should speak */}
        {!isSpeaking && (
          <div className="flex items-center gap-2">
            {[0.4, 0.6, 1, 0.6, 0.4].map((h, i) => (
              <div
                key={i}
                className="w-2 rounded-full transition-all"
                style={{
                  height: `${h * 32}px`,
                  backgroundColor: cfg.accent,
                  animation: "wave 1.2s ease-in-out infinite",
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* End button */}
      <div className="flex justify-center pb-8">
        <button
          onClick={handleEndLesson}
          className="rounded-full px-10 py-4 text-base font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: "#ef4444" }}
        >
          Kończę lekcję ✋
        </button>
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </main>
  );
}
