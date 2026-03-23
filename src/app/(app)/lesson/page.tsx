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
type TranscriptEntry = { source: "user" | "ai"; message: string; ts: number };

type LessonState =
  | "loading"
  | "ready"
  | "connecting"
  | "active"
  | "ending"
  | "error";

// Filler words that indicate struggling
const FILLER_PATTERNS = /^(e+h*|u+h*m*|h+m+|a+h+|y+|øh*|eh+m+|hm+|mm+)$/i;

function isFiller(text: string): boolean {
  return text
    .trim()
    .split(/\s+/)
    .every((w) => FILLER_PATTERNS.test(w) || w.length <= 2);
}

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
  const [nativeLanguage, setNativeLanguage] = useState("pl");
  const [error, setError] = useState("");

  // Lesson state
  const [timeLeft, setTimeLeft] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentCaption, setCurrentCaption] = useState("");
  const [captionSource, setCaptionSource] = useState<"user" | "ai" | null>(null);
  const [sosActive, setSosActive] = useState(false);

  // Hints — two levels
  const [hintsL1, setHintsL1] = useState<Hint[]>([]);
  const [hintsL2, setHintsL2] = useState<Hint[]>([]);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [hintsLoading, setHintsLoading] = useState(false);

  // Refs
  const hintTimer1Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lessonTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const startTimeRef = useRef<number>(0);

  // Smart hint state refs (avoid stale closures)
  const lastHintTimeRef = useRef(0); // timestamp of last hint shown
  const agentSpeakingRef = useRef(false);
  const userSpeakingRef = useRef(false);
  const userStartedSpeakingRef = useRef(false); // user spoke at least once after agent
  const lastUserMsgRef = useRef(""); // last user transcript text
  const lastAgentMsgRef = useRef(""); // last agent transcript text
  const hintPauseSentRef = useRef(false); // did we tell agent to wait?
  const lessonActiveRef = useRef(false);

  const HINT_COOLDOWN_MS = 20_000; // 20s between hints
  const HINT_GRACE_PERIOD_MS = 10_000; // no hints in first 10s
  const L1_DELAY_MS = 3_000;
  const L2_DELAY_MS = 5_000;

  // Profile data for API calls
  const profileRef = useRef({ language: "", agentId: "" });

  // ---- Helpers ----

  const clearHintTimers = () => {
    if (hintTimer1Ref.current) { clearTimeout(hintTimer1Ref.current); hintTimer1Ref.current = null; }
    if (hintTimer2Ref.current) { clearTimeout(hintTimer2Ref.current); hintTimer2Ref.current = null; }
  };

  const canShowHint = (): boolean => {
    if (!lessonActiveRef.current) return false;
    if (agentSpeakingRef.current) return false;
    // No hints in first 10 seconds
    if (Date.now() - startTimeRef.current < HINT_GRACE_PERIOD_MS) return false;
    // Cooldown
    if (Date.now() - lastHintTimeRef.current < HINT_COOLDOWN_MS) return false;
    return true;
  };

  const hideHints = () => {
    clearHintTimers();
    setHintLevel(0);
    // Tell agent user is ready if we previously paused
    if (hintPauseSentRef.current) {
      try { conversation.sendContextualUpdate("The user is ready to continue. You may speak."); } catch {}
      hintPauseSentRef.current = false;
    }
  };

  const startHintTimers = (reason: string) => {
    if (!canShowHint()) return;
    clearHintTimers();

    console.log(`Hint timers started (${reason})`);

    hintTimer1Ref.current = setTimeout(() => {
      if (!canShowHint()) return;
      console.log("→ L1 hint triggered");
      // Tell agent to wait
      try {
        conversation.sendContextualUpdate(
          "The user is thinking and reading hints on screen. Wait for them to speak. Do not interrupt."
        );
        hintPauseSentRef.current = true;
      } catch {}
      fetchHint(1);
    }, L1_DELAY_MS);

    hintTimer2Ref.current = setTimeout(() => {
      if (!canShowHint() && hintLevel < 1) return;
      console.log("→ L2 hint triggered");
      fetchHint(2);
    }, L2_DELAY_MS);
  };

  const detectStrugglingFromTranscript = (userText: string) => {
    // Filler words only
    if (isFiller(userText)) {
      console.log("Filler detected:", userText);
      startHintTimers("filler words");
      return;
    }

    // Incomplete sentence: short text, no ending punctuation, user stopped talking
    const trimmed = userText.trim();
    if (trimmed.length > 0 && trimmed.length < 30 && !/[.!?]$/.test(trimmed)) {
      // Could be an incomplete thought — we'll start timers when user stops speaking
      // (handled in onModeChange)
    }
  };

  // ---- ElevenLabs conversation ----

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      console.log("ElevenLabs connected:", conversationId);
      setLessonState("active");
      lessonActiveRef.current = true;
      startTimeRef.current = Date.now();

      if (systemPrompt) {
        conversation.sendContextualUpdate(systemPrompt);
      }

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
      lessonActiveRef.current = false;
      if (lessonState === "active") {
        handleEndLesson();
      }
    },
    onMessage: ({ message, source }) => {
      setCurrentCaption(message);
      setCaptionSource(source);

      const entry: TranscriptEntry = { source, message, ts: Date.now() };
      transcriptRef.current = [...transcriptRef.current, entry];
      setTranscript([...transcriptRef.current]);

      if (source === "ai") {
        lastAgentMsgRef.current = message;
      }

      if (source === "user") {
        lastUserMsgRef.current = message;
        userStartedSpeakingRef.current = true;

        // User is actively speaking — hide hints, clear timers
        hideHints();

        // Check for filler words
        detectStrugglingFromTranscript(message);
      }
    },
    onModeChange: (prop: { mode: string }) => {
      console.log("Mode:", prop.mode);

      if (prop.mode === "speaking") {
        // Agent started speaking
        agentSpeakingRef.current = true;
        userSpeakingRef.current = false;
        userStartedSpeakingRef.current = false;
        clearHintTimers();
        setHintLevel(0);
      } else if (prop.mode === "listening") {
        // Agent stopped speaking, now listening for user
        agentSpeakingRef.current = false;

        // We DON'T start hint timers here immediately.
        // We wait for the user to show signs of struggling:
        // - Timer starts if user doesn't speak at all within 3s
        // - Timer starts from filler detection in onMessage
        // - Timer starts from incomplete sentence detection

        // Start a "no response" timer — user hasn't started speaking at all
        if (canShowHint()) {
          clearHintTimers();
          hintTimer1Ref.current = setTimeout(() => {
            // User never started speaking after agent
            if (!userStartedSpeakingRef.current && canShowHint()) {
              console.log("→ L1 hint: user silent after agent");
              try {
                conversation.sendContextualUpdate(
                  "The user is thinking and reading hints on screen. Wait for them to speak. Do not interrupt."
                );
                hintPauseSentRef.current = true;
              } catch {}
              fetchHint(1);
            }
          }, L1_DELAY_MS);

          hintTimer2Ref.current = setTimeout(() => {
            if (!userStartedSpeakingRef.current) {
              console.log("→ L2 hint: user still silent");
              fetchHint(2);
            }
          }, L2_DELAY_MS);
        }
      }
    },
    onStatusChange: (prop: { status: string }) => {
      console.log("Status:", prop.status);
    },
    onVadScore: (prop: { vadScore: number }) => {
      // VAD score 0-1: voice activity detection
      // Low scores for extended time = user is silent
      // We can use this to detect when user STOPS mid-sentence
      const speaking = prop.vadScore > 0.3;

      if (speaking && !userSpeakingRef.current) {
        // User started speaking
        userSpeakingRef.current = true;
        userStartedSpeakingRef.current = true;
        hideHints();
      } else if (!speaking && userSpeakingRef.current) {
        // User stopped speaking — might be mid-sentence pause
        userSpeakingRef.current = false;

        // If user said something but stopped, check if it's incomplete
        const lastMsg = lastUserMsgRef.current.trim();
        if (lastMsg && !agentSpeakingRef.current) {
          const isIncomplete = lastMsg.length > 0 && !/[.!?]$/.test(lastMsg);
          const isFillerOnly = isFiller(lastMsg);

          if (isIncomplete || isFillerOnly) {
            console.log("User stopped mid-thought:", lastMsg);
            startHintTimers(isFillerOnly ? "filler pause" : "incomplete sentence");
          }
        }
      }
    },
    onError: (message: string, context?: unknown) => {
      console.error("Conversation error:", message, context);
      if (lessonState !== "ending") {
        setError("Utracono połączenie z tutorem. " + message);
        setLessonState("error");
      }
    },
  });

  // ---- Fetch hints ----

  const fetchHint = async (level: 1 | 2) => {
    if (level === 1) setHintsLoading(true);
    lastHintTimeRef.current = Date.now();

    const recentTranscript = transcriptRef.current
      .slice(-6)
      .map((t) => `${t.source === "ai" ? "Tutor" : "Uczeń"}: ${t.message}`)
      .join("\n");

    const userAttempt = lastUserMsgRef.current.trim();
    const stuckType = !userAttempt
      ? "no_response"
      : isFiller(userAttempt)
        ? "filler_words"
        : "incomplete_sentence";

    try {
      const res = await fetch("/api/lessons/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          conversation_context: recentTranscript,
          target_language: profileRef.current.language,
          native_language: nativeLanguage,
          hint_level: level,
          last_agent_message: lastAgentMsgRef.current,
          user_attempt: userAttempt,
          stuck_type: stuckType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`Hints L${level}:`, data.hints);
        if (level === 1) {
          setHintsL1(data.hints);
        } else {
          setHintsL2(data.hints);
        }
        setHintLevel(level);
      }
    } catch {
      // Non-critical
    } finally {
      if (level === 1) setHintsLoading(false);
    }
  };

  // ---- Lifecycle ----

  useEffect(() => {
    loadLessonData();
    return () => {
      clearHintTimers();
      if (lessonTimerRef.current) clearInterval(lessonTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLessonData = async () => {
    try {
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
        body: JSON.stringify({ language, agent_id: agentId ?? "default" }),
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
      setNativeLanguage(data.native_language ?? "pl");
      setLessonState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przygotować lekcji");
      setLessonState("error");
    }
  };

  const startConversation = async () => {
    setLessonState("connecting");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const conversationId = await conversation.startSession({
        signedUrl,
        dynamicVariables: {
          user_name: displayName,
          user_level: level,
          native_language: nativeLanguage,
          lesson_topic: topic,
          lesson_duration: String(duration),
        },
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
    lessonActiveRef.current = false;
    clearHintTimers();
    if (lessonTimerRef.current) clearInterval(lessonTimerRef.current);

    try { await conversation.endSession(); } catch {}

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
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
      router.push(res.ok ? `/lesson/${lessonId}/summary` : "/dashboard");
    } catch {
      router.push("/dashboard");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonState, lessonId, router]);

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
        body: JSON.stringify({ text, language: profileRef.current.language }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
      }
    } catch {}
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
            <button onClick={() => router.push("/dashboard")} className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary">Dashboard</button>
            <button onClick={loadLessonData} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white">Spróbuj ponownie</button>
          </div>
        </div>
      </main>
    );
  }

  if (lessonState === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-text-secondary">Przygotowuję lekcję...</p>
      </main>
    );
  }

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
                <button onClick={refreshTopic} className="rounded-lg p-2 text-text-secondary hover:text-primary" title="Zmień temat">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-text-secondary">
              <div>Poziom: {level}</div>
              <div>Czas: {duration} min</div>
            </div>
          </div>
          <button onClick={startConversation} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-medium text-white transition-colors hover:bg-primary-dark">
            <Mic className="h-5 w-5" />
            Rozpocznij rozmowę
          </button>
          <button onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
            <ArrowLeft className="h-4 w-4" />
            Wróć do Dashboard
          </button>
        </div>
      </main>
    );
  }

  if (lessonState === "connecting") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-text-secondary">Łączę z tutorem...</p>
      </main>
    );
  }

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
        <div className={`rounded-full px-5 py-2 text-lg font-mono font-bold ${
          timeLeft <= 60 ? "bg-red-500/20 text-red-400"
          : timeLeft <= 180 ? "bg-yellow-500/20 text-yellow-400"
          : "bg-bg-card text-text-secondary"
        }`}>
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
        <div className="relative">
          <div className={`flex h-40 w-40 items-center justify-center rounded-full transition-all duration-300 ${
            isSpeaking ? "animate-pulse bg-primary/20 ring-4 ring-primary/40"
            : conversation.status === "connected" ? "bg-bg-card ring-2 ring-border"
            : "bg-bg-card"
          }`}>
            <div className={`flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 ${
              isSpeaking ? "bg-primary/30" : "bg-bg-card-hover"
            }`}>
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
            <div className={`rounded-xl px-6 py-3 text-sm ${
              captionSource === "ai" ? "bg-bg-card text-text-primary" : "bg-primary/10 text-primary"
            }`}>
              <span className="text-xs text-text-secondary">
                {captionSource === "ai" ? "Tutor" : "Ty"}
              </span>
              <p className="mt-1">{currentCaption}</p>
            </div>
          )}
        </div>
      </div>

      {/* Hint loading */}
      {hintsLoading && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-bg-card/80 px-4 py-2 text-sm text-text-secondary backdrop-blur-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Szukam podpowiedzi...
          </div>
        </div>
      )}

      {/* Level 1 hints — subtle word bar */}
      {hintLevel === 1 && hintsL1.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 mx-auto max-w-md animate-slide-in-up">
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-full border border-border/50 bg-bg-card/70 px-5 py-3 backdrop-blur-sm">
            {hintsL1.map((hint, i) => (
              <span key={i} className="text-sm">
                <span className="font-medium text-text-primary">{hint.phrase}</span>
                <span className="text-text-secondary"> → {hint.translation}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Level 2 hints — full phrase panel */}
      {hintLevel === 2 && hintsL2.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 mx-auto max-w-md animate-slide-in-up">
          <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-xl">
            <div className="mb-3 text-xs font-medium text-text-secondary">Podpowiedzi</div>
            <div className="space-y-2">
              {hintsL2.map((hint, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-bg-card-hover p-3">
                  <div>
                    <div className="font-medium text-text-primary">{hint.phrase}</div>
                    <div className="text-sm text-text-secondary">{hint.translation}</div>
                  </div>
                  <button onClick={() => playHintTTS(hint.phrase)} className="rounded-lg p-2 text-text-secondary hover:text-primary">
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
        <button
          onClick={handleSOS}
          className={`flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold transition-all ${
            sosActive ? "bg-orange-500 text-white ring-4 ring-orange-500/30" : "bg-bg-card text-orange-400 hover:bg-orange-500/20"
          }`}
          title="Pomoc — uprość język"
        >
          <LifeBuoy className="h-6 w-6" />
        </button>
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
