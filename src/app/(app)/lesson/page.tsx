"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useConversation } from "@11labs/react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Loader2,
  MessageCircle,
  Volume2,
  LifeBuoy,
  Play,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Hint = { phrase: string; translation: string };
type TranscriptEntry = { source: "user" | "ai"; message: string };

type LessonState =
  | "loading"
  | "ready"
  | "connecting"
  | "active"
  | "ending"
  | "error";

export default function LessonPage() {
  const router = useRouter();
  const [lessonState, setLessonState] = useState<LessonState>("loading");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("A1");
  const [displayName, setDisplayName] = useState("");
  const [duration, setDuration] = useState(15);
  const [signedUrl, setSignedUrl] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [error, setError] = useState("");

  // Lesson state
  const [timeLeft, setTimeLeft] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentCaption, setCurrentCaption] = useState("");
  const [captionSource, setCaptionSource] = useState<"user" | "ai" | null>(
    null
  );
  const [sosActive, setSosActive] = useState(false);

  // Hints
  const [hints, setHints] = useState<Hint[]>([]);
  const [hintsLoading, setHintsLoading] = useState(false);
  const [hintsVisible, setHintsVisible] = useState(false);

  // Refs
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lessonTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const startTimeRef = useRef<number>(0);
  const hintCooldownRef = useRef(false);

  // Determine silence threshold based on level
  const silenceThreshold =
    level === "A1" || level === "A2" ? 8000 : 6000;

  // Profile data for API calls
  const profileRef = useRef({ language: "", agentId: "" });

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      console.log("ElevenLabs connected, conversationId:", conversationId);
      setLessonState("active");
      startTimeRef.current = Date.now();
      setTimeLeft(duration * 60);
      lessonTimerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (lessonTimerRef.current) clearInterval(lessonTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onDisconnect: () => {
      if (lessonState === "active") {
        handleEndLesson();
      }
    },
    onMessage: ({ message, source }) => {
      // Update captions
      setCurrentCaption(message);
      setCaptionSource(source);

      // Add to transcript
      const entry: TranscriptEntry = { source, message };
      transcriptRef.current = [...transcriptRef.current, entry];
      setTranscript([...transcriptRef.current]);

      // Reset silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // Hide hints when user speaks
      if (source === "user") {
        setHintsVisible(false);
        hintCooldownRef.current = false;
      }

      // Start silence timer after agent speaks
      if (source === "ai" && lessonState === "active") {
        silenceTimerRef.current = setTimeout(() => {
          if (!hintCooldownRef.current) {
            triggerHint();
          }
        }, silenceThreshold);
      }
    },
    onModeChange: (prop: { mode: string }) => {
      console.log("Mode changed:", prop.mode);
    },
    onStatusChange: (prop: { status: string }) => {
      console.log("Status changed:", prop.status);
    },
    onError: (message: string, context?: unknown) => {
      console.error("Conversation error:", message, context);
      if (lessonState !== "ending") {
        setError("Utracono połączenie z tutorem. " + message);
        setLessonState("error");
      }
    },
  });

  // Load lesson data
  useEffect(() => {
    loadLessonData();
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (lessonTimerRef.current) clearInterval(lessonTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLessonData = async () => {
    try {
      // Get user profile to know language and agent
      const profileRes = await fetch("/api/user/profile");
      if (!profileRes.ok) throw new Error("Failed to load profile");
      const profileData = await profileRes.json();

      profileRef.current = {
        language: profileData.target_language,
        agentId: profileData.selected_agent_id ?? "default",
      };

      await prepareLesson(profileData.target_language, profileData.selected_agent_id);
    } catch {
      setError("Nie udało się załadować danych. Spróbuj ponownie.");
      setLessonState("error");
    }
  };

  const prepareLesson = async (language: string, agentId?: string) => {
    setLessonState("loading");
    setError("");

    try {
      const res = await fetch("/api/lessons/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          agent_id: agentId ?? "default",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Błąd serwera");
      }

      const data = await res.json();
      setLessonId(data.lesson_id);
      setTopic(data.topic);
      setSignedUrl(data.signed_url);
      setSystemPrompt(data.system_prompt_override);
      setDuration(data.duration);
      setDisplayName(data.display_name);
      setLevel(data.level);
      setLessonState("ready");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nie udało się przygotować lekcji"
      );
      setLessonState("error");
    }
  };

  const startConversation = async () => {
    setLessonState("connecting");
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      console.log("Starting session with signedUrl:", signedUrl?.substring(0, 80));
      const conversationId = await conversation.startSession({
        signedUrl,
      });
      console.log("Conversation started:", conversationId);
    } catch (err) {
      console.error("Start session error:", err);
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Musisz zezwolić na dostęp do mikrofonu. Kliknij ikonę kłódki w pasku adresu i włącz mikrofon."
          : "Nie udało się połączyć. Sprawdź mikrofon i spróbuj ponownie.";
      setError(message);
      setLessonState("error");
    }
  };

  const handleEndLesson = useCallback(async () => {
    if (lessonState === "ending") return;
    setLessonState("ending");

    // Clean up timers
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (lessonTimerRef.current) clearInterval(lessonTimerRef.current);

    try {
      await conversation.endSession();
    } catch {
      // Session may already be ended
    }

    const durationSeconds = Math.round(
      (Date.now() - startTimeRef.current) / 1000
    );

    // Build transcript text
    const transcriptText = transcriptRef.current
      .map((t) => `${t.source === "ai" ? "Tutor" : "Uczeń"}: ${t.message}`)
      .join("\n");

    try {
      const res = await fetch("/api/lessons/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          transcript: transcriptText,
          duration_seconds: durationSeconds,
        }),
      });

      if (res.ok) {
        router.push(`/lesson/${lessonId}/summary`);
      } else {
        router.push("/dashboard");
      }
    } catch {
      router.push("/dashboard");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonState, lessonId, router]);

  const triggerHint = async () => {
    if (hintsLoading || hintCooldownRef.current) return;
    hintCooldownRef.current = true;
    setHintsLoading(true);

    // Get last few exchanges for context
    const recentTranscript = transcriptRef.current
      .slice(-6)
      .map((t) => `${t.source === "ai" ? "Tutor" : "Uczeń"}: ${t.message}`)
      .join("\n");

    try {
      const res = await fetch("/api/lessons/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          conversation_context: recentTranscript,
          target_language: profileRef.current.language,
          native_language: "pl",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setHints(data.hints);
        setHintsVisible(true);

        // Auto-hide after 15 seconds
        setTimeout(() => setHintsVisible(false), 15000);
      }
    } catch {
      // Silently fail — hints are non-critical
    } finally {
      setHintsLoading(false);
    }
  };

  const handleSOS = () => {
    conversation.sendContextualUpdate(
      "Użytkownik prosi o pomoc. Zwolnij, uprość język i powtórz ostatnią myśl prostszymi słowami."
    );
    setSosActive(true);
    setTimeout(() => setSosActive(false), 5000);
  };

  const playHintTTS = async (text: string) => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language: profileRef.current.language,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
      }
    } catch {
      // TTS is non-critical
    }
  };

  const refreshTopic = () => {
    prepareLesson(profileRef.current.language, profileRef.current.agentId);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // -- RENDER --

  // Error state
  if (lessonState === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <MicOff className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold">Coś poszło nie tak</h1>
          <p className="text-text-secondary">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary"
            >
              Dashboard
            </button>
            <button
              onClick={loadLessonData}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Loading state
  if (lessonState === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-text-secondary">Przygotowuję lekcję...</p>
      </main>
    );
  }

  // Pre-lesson: ready to start
  if (lessonState === "ready") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div>
            <MessageCircle className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-4 text-2xl font-bold">Gotowy do rozmowy?</h1>
          </div>

          <div className="rounded-xl border border-border bg-bg-card p-6 text-left">
            <div className="mb-4">
              <div className="text-sm text-text-secondary">Temat dnia</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-lg font-medium">{topic}</span>
                <button
                  onClick={refreshTopic}
                  className="rounded-lg p-2 text-text-secondary hover:text-primary"
                  title="Zmień temat"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-text-secondary">
              <div>Poziom: {level}</div>
              <div>Czas: {duration} min</div>
            </div>
          </div>

          <button
            onClick={startConversation}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-medium text-white transition-colors hover:bg-primary-dark"
          >
            <Mic className="h-5 w-5" />
            Rozpocznij rozmowę
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć do Dashboard
          </button>
        </div>
      </main>
    );
  }

  // Connecting
  if (lessonState === "connecting") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-text-secondary">Łączę z tutorem...</p>
      </main>
    );
  }

  // Ending
  if (lessonState === "ending") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-text-secondary">Analizuję lekcję...</p>
      </main>
    );
  }

  // Active lesson
  const isSpeaking = conversation.isSpeaking;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-bg-dark px-4">
      {/* Timer */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <div
          className={`rounded-full px-5 py-2 text-lg font-mono font-bold ${
            timeLeft <= 60
              ? "bg-red-500/20 text-red-400"
              : timeLeft <= 180
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-bg-card text-text-secondary"
          }`}
        >
          {formatTime(timeLeft)}
        </div>
        {timeLeft === 0 && (
          <div className="mt-2 text-center text-xs text-text-secondary">
            Czas minął — zakończ kiedy chcesz
          </div>
        )}
      </div>

      {/* Voice visualization */}
      <div className="flex flex-col items-center gap-8">
        {/* Pulsing circle */}
        <div className="relative">
          {/* Outer ring - agent speaking */}
          <div
            className={`flex h-40 w-40 items-center justify-center rounded-full transition-all duration-300 ${
              isSpeaking
                ? "animate-pulse bg-primary/20 ring-4 ring-primary/40"
                : conversation.status === "connected"
                  ? "bg-bg-card ring-2 ring-border"
                  : "bg-bg-card"
            }`}
          >
            {/* Inner indicator */}
            <div
              className={`flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 ${
                isSpeaking
                  ? "bg-primary/30"
                  : "bg-bg-card-hover"
              }`}
            >
              {isSpeaking ? (
                <Volume2 className="h-10 w-10 text-primary animate-pulse" />
              ) : (
                <Mic className="h-10 w-10 text-text-secondary" />
              )}
            </div>
          </div>
        </div>

        {/* Caption */}
        <div className="min-h-[80px] max-w-md text-center">
          {currentCaption && (
            <div
              className={`rounded-xl px-6 py-3 text-sm ${
                captionSource === "ai"
                  ? "bg-bg-card text-text-primary"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <span className="text-xs text-text-secondary">
                {captionSource === "ai" ? "Tutor" : "Ty"}
              </span>
              <p className="mt-1">{currentCaption}</p>
            </div>
          )}
        </div>
      </div>

      {/* Hint loading indicator */}
      {hintsLoading && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-bg-card px-4 py-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Szukam podpowiedzi...
          </div>
        </div>
      )}

      {/* Hint panel */}
      {hintsVisible && hints.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 mx-auto max-w-md animate-slide-in-up">
          <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-xl">
            <div className="mb-3 text-xs font-medium text-text-secondary">
              Podpowiedzi
            </div>
            <div className="space-y-2">
              {hints.map((hint, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-bg-card-hover p-3"
                >
                  <div>
                    <div className="font-medium text-text-primary">
                      {hint.phrase}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {hint.translation}
                    </div>
                  </div>
                  <button
                    onClick={() => playHintTTS(hint.phrase)}
                    className="rounded-lg p-2 text-text-secondary hover:text-primary"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-between px-8">
        {/* SOS button */}
        <button
          onClick={handleSOS}
          className={`flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold transition-all ${
            sosActive
              ? "bg-orange-500 text-white ring-4 ring-orange-500/30"
              : "bg-bg-card text-orange-400 hover:bg-orange-500/20"
          }`}
          title="Pomoc — uprość język"
        >
          <LifeBuoy className="h-6 w-6" />
        </button>

        {/* End lesson button */}
        <button
          onClick={handleEndLesson}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-400 transition-colors hover:bg-red-500/30"
          title="Zakończ lekcję"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </main>
  );
}
