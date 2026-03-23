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
type LessonState = "loading" | "ready" | "connecting" | "active" | "ending" | "error";

// Strip ElevenLabs emotion tags like [Happy], [Patient], etc.
function cleanCaption(text: string): string {
  return text.replace(/\[.*?\]\s*/g, "").trim();
}

// Filler words indicating struggling
const FILLER_RE = /^(e+h*|u+h*m*|h+m+|a+h+|y+|øh*|eh+m+|hm+|mm+|ah+)$/i;
function isFiller(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((w) => FILLER_RE.test(w));
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

  const [timeLeft, setTimeLeft] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentCaption, setCurrentCaption] = useState("");
  const [captionSource, setCaptionSource] = useState<"user" | "ai" | null>(null);
  const [sosActive, setSosActive] = useState(false);

  // Hints
  const [hintsL1, setHintsL1] = useState<Hint[]>([]);
  const [hintsL2, setHintsL2] = useState<Hint[]>([]);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [hintsLoading, setHintsLoading] = useState(false);

  // Enrichment words
  const [enrichmentWords, setEnrichmentWords] = useState<{ word: string; translation: string }[]>([]);
  const enrichmentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enrichmentWordsShownRef = useRef<string[]>([]);

  // Debug refs (console only, no UI)
  const debugRef = useRef({
    mode: "—",
    lastSpeaker: "—",
    silenceStart: 0,
    hintsTriggered: 0,
  });

  // Refs
  const hintTimer1Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agentDoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lessonTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const startTimeRef = useRef<number>(0);

  const lastHintTimeRef = useRef(0);
  const agentSpeakingRef = useRef(false);
  const lastUserMsgRef = useRef("");
  const lastAgentMsgRef = useRef("");
  const hintPauseSentRef = useRef(false);
  const lessonActiveRef = useRef(false);
  const hintLevelRef = useRef(0); // mirror of hintLevel for use in callbacks

  const HINT_COOLDOWN_MS = 12_000;
  const HINT_GRACE_MS = 3_000;
  const L1_MS = 2_000;
  const L2_MS = 4_000;

  const profileRef = useRef({ language: "", agentId: "" });

  const setHintLevelSynced = (lvl: 0 | 1 | 2) => {
    hintLevelRef.current = lvl;
    setHintLevel(lvl);
  };

  // ---- Debug log helper ----
  const dbg = (msg: string) => {
    console.log(`[hint] ${msg}`);
  };

  // ---- Hint timer helpers ----
  const clearHintTimers = () => {
    if (hintTimer1Ref.current) { clearTimeout(hintTimer1Ref.current); hintTimer1Ref.current = null; }
    if (hintTimer2Ref.current) { clearTimeout(hintTimer2Ref.current); hintTimer2Ref.current = null; }
    if (agentDoneTimerRef.current) { clearTimeout(agentDoneTimerRef.current); agentDoneTimerRef.current = null; }
  };

  const canTriggerHint = (): boolean => {
    const elapsed = Date.now() - startTimeRef.current;
    const sinceLast = Date.now() - lastHintTimeRef.current;
    const ok =
      lessonActiveRef.current &&
      !agentSpeakingRef.current &&
      elapsed > HINT_GRACE_MS &&
      (lastHintTimeRef.current === 0 || sinceLast > HINT_COOLDOWN_MS);
    if (!ok) {
      dbg(`canTrigger=false: active=${lessonActiveRef.current} agentSpeaking=${agentSpeakingRef.current} elapsed=${Math.round(elapsed/1000)}s sinceLast=${Math.round(sinceLast/1000)}s`);
    }
    return ok;
  };

  const hideHints = () => {
    clearHintTimers();
    if (hintLevelRef.current !== 0) setHintLevelSynced(0);
    if (hintPauseSentRef.current) {
      try { conversation.sendContextualUpdate("The user is ready to continue."); } catch {}
      hintPauseSentRef.current = false;
    }
  };

  const scheduleHints = (reason: string) => {
    if (!canTriggerHint()) return;
    clearHintTimers();
    debugRef.current.silenceStart = Date.now();
    dbg(`Scheduling hints: ${reason}`);

    hintTimer1Ref.current = setTimeout(() => {
      if (!lessonActiveRef.current || agentSpeakingRef.current) return;
      dbg("→ L1 firing");
      try {
        conversation.sendContextualUpdate(
          "The user is thinking and reading hints on screen. Wait for them to speak. Do not interrupt."
        );
        hintPauseSentRef.current = true;
      } catch {}
      fetchHint(1);
    }, L1_MS);

    hintTimer2Ref.current = setTimeout(() => {
      // Don't check cooldown for L2 — it's an upgrade from L1
      if (!lessonActiveRef.current || agentSpeakingRef.current) return;
      dbg("→ L2 firing");
      fetchHint(2, true);
    }, L2_MS);
  };

  // ---- ElevenLabs conversation ----
  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      dbg(`Connected: ${conversationId}`);
      setLessonState("active");
      lessonActiveRef.current = true;
      startTimeRef.current = Date.now();

      if (systemPrompt) {
        conversation.sendContextualUpdate(systemPrompt);
      }

      setTimeLeft(duration * 60);
      lessonTimerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { if (lessonTimerRef.current) clearInterval(lessonTimerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);

      // Start enrichment words timer (every 25s, first after 15s)
      setTimeout(() => fetchEnrichment(), 15000);
      enrichmentTimerRef.current = setInterval(() => {
        // Don't show enrichment while hints are visible
        if (hintLevelRef.current === 0 && !agentSpeakingRef.current) {
          fetchEnrichment();
        }
      }, 25000);
    },
    onDisconnect: () => {
      lessonActiveRef.current = false;
      if (enrichmentTimerRef.current) clearInterval(enrichmentTimerRef.current);
      if (lessonState === "active") handleEndLesson();
    },
    onMessage: ({ message, source }) => {
      const clean = cleanCaption(message);
      setCurrentCaption(clean);
      setCaptionSource(source);

      const entry: TranscriptEntry = { source, message: clean, ts: Date.now() };
      transcriptRef.current = [...transcriptRef.current, entry];
      setTranscript([...transcriptRef.current]);

      debugRef.current.lastSpeaker = source;

      if (source === "ai") {
        lastAgentMsgRef.current = clean;
        agentSpeakingRef.current = true;
        debugRef.current.mode = "speaking";
        dbg(`Agent: "${clean.substring(0, 50)}"`);

        // Clear any pending hint timers while agent is talking
        clearHintTimers();
        if (hintLevelRef.current !== 0) setHintLevelSynced(0);

        // Debounce: if no new AI message for 1s → agent finished speaking
        if (agentDoneTimerRef.current) clearTimeout(agentDoneTimerRef.current);
        agentDoneTimerRef.current = setTimeout(() => {
          agentSpeakingRef.current = false;
          debugRef.current.mode = "listening";
          debugRef.current.silenceStart = Date.now();
          dbg("Agent finished (1s debounce) → scheduling hints");

          // Schedule hint timers
          scheduleHints("agent finished, waiting for user");
        }, 1000);
      }

      if (source === "user") {
        lastUserMsgRef.current = clean;
        dbg(`User: "${clean.substring(0, 50)}"`);

        // User is talking — cancel everything, hide hints
        agentSpeakingRef.current = false;
        hideHints();

        // Check for fillers — schedule hints after filler
        if (isFiller(clean)) {
          dbg(`Filler: "${clean}"`);
          scheduleHints("filler words");
        }
      }
    },
    onModeChange: (prop: { mode: string }) => {
      // Log only — actual detection uses onMessage debounce
      dbg(`ModeEvent: ${prop.mode}`);
    },
    onStatusChange: (prop: { status: string }) => {
      dbg(`Status: ${prop.status}`);
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
  const fetchHint = async (hintLvl: 1 | 2, isUpgrade = false) => {
    if (hintLvl === 1) setHintsLoading(true);
    if (!isUpgrade) lastHintTimeRef.current = Date.now();
    debugRef.current.hintsTriggered++;

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

    dbg(`Fetching L${hintLvl} hint, stuck=${stuckType}`);

    try {
      const res = await fetch("/api/lessons/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          conversation_context: recentTranscript,
          target_language: profileRef.current.language,
          native_language: nativeLanguage,
          hint_level: hintLvl,
          last_agent_message: lastAgentMsgRef.current,
          user_attempt: userAttempt,
          stuck_type: stuckType,
        }),
      });

      dbg(`Hint API response: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        dbg(`Got ${data.hints?.length ?? 0} hints`);
        if (hintLvl === 1) {
          setHintsL1(data.hints ?? []);
        } else {
          setHintsL2(data.hints ?? []);
        }
        setHintLevelSynced(hintLvl as 0 | 1 | 2);
      }
    } catch (err) {
      dbg(`Hint fetch error: ${err}`);
    } finally {
      if (hintLvl === 1) setHintsLoading(false);
    }
  };

  // ---- Enrichment words ----
  const fetchEnrichment = async () => {
    try {
      const res = await fetch("/api/lessons/enrichment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_topic: topic,
          language: profileRef.current.language,
          user_level: level,
          recent_vocabulary: enrichmentWordsShownRef.current,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.words?.length > 0) {
          setEnrichmentWords(data.words);
          enrichmentWordsShownRef.current = [
            ...enrichmentWordsShownRef.current,
            ...data.words.map((w: { word: string }) => w.word),
          ];
          // Auto-hide after 10s
          setTimeout(() => setEnrichmentWords([]), 10000);
        }
      }
    } catch { /* non-critical */ }
  };

  const addEnrichmentToVocab = async (word: string, translation: string) => {
    try {
      await fetch("/api/vocabulary/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, translation, language: profileRef.current.language, lesson_id: lessonId }),
      });
    } catch { /* non-critical */ }
  };

  // ---- Lifecycle ----
  useEffect(() => {
    loadLessonData();
    return () => {
      clearHintTimers();
      if (lessonTimerRef.current) clearInterval(lessonTimerRef.current);
      if (enrichmentTimerRef.current) clearInterval(enrichmentTimerRef.current);
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
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? "Błąd serwera"); }
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
      const cid = await conversation.startSession({
        signedUrl,
        dynamicVariables: {
          user_name: displayName,
          user_level: level,
          native_language: nativeLanguage,
          lesson_topic: topic,
          lesson_duration: String(duration),
        },
      });
      console.log("Conversation started:", cid);
    } catch (err) {
      console.error("Start session error:", err);
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Musisz zezwolić na dostęp do mikrofonu."
          : "Nie udało się połączyć. Sprawdź mikrofon."
      );
      setLessonState("error");
    }
  };

  const handleEndLesson = useCallback(async () => {
    if (lessonState === "ending") return;
    setLessonState("ending");
    lessonActiveRef.current = false;
    clearHintTimers();
    if (lessonTimerRef.current) clearInterval(lessonTimerRef.current);
    if (enrichmentTimerRef.current) clearInterval(enrichmentTimerRef.current);
    try { await conversation.endSession(); } catch {}

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const transcriptText = transcriptRef.current
      .map((t) => `${t.source === "ai" ? "Tutor" : "Uczeń"}: ${t.message}`)
      .join("\n");
    try {
      const res = await fetch("/api/lessons/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lessonId, transcript: transcriptText, duration_seconds: durationSeconds }),
      });
      // Check achievements in background
      fetch("/api/achievements/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lessonId }),
      }).catch(() => {});
      router.push(res.ok ? `/lesson/${lessonId}/summary` : "/dashboard");
    } catch { router.push("/dashboard"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonState, lessonId, router]);

  const handleSOS = () => {
    conversation.sendContextualUpdate("Użytkownik prosi o pomoc. Zwolnij, uprość język i powtórz ostatnią myśl prostszymi słowami.");
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

  const refreshTopic = () => prepareLesson(profileRef.current.language, profileRef.current.agentId);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ---- RENDER ----

  if (lessonState === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10"><MicOff className="h-8 w-8 text-red-400" /></div>
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

  if (lessonState === "loading") return <main className="flex min-h-screen flex-col items-center justify-center px-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-text-secondary">Przygotowuję lekcję...</p></main>;

  if (lessonState === "ready") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div><MessageCircle className="mx-auto h-12 w-12 text-primary" /><h1 className="mt-4 text-2xl font-bold">Gotowy do rozmowy?</h1></div>
          <div className="rounded-xl border border-border bg-bg-card p-6 text-left">
            <div className="mb-4">
              <div className="text-sm text-text-secondary">Temat dnia</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-lg font-medium">{topic}</span>
                <button onClick={refreshTopic} className="rounded-lg p-2 text-text-secondary hover:text-primary"><RefreshCw className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-text-secondary"><div>Poziom: {level}</div><div>Czas: {duration} min</div></div>
          </div>
          <button onClick={startConversation} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-medium text-white hover:bg-primary-dark"><Mic className="h-5 w-5" />Rozpocznij rozmowę</button>
          <button onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"><ArrowLeft className="h-4 w-4" />Wróć do Dashboard</button>
        </div>
      </main>
    );
  }

  if (lessonState === "connecting") return <main className="flex min-h-screen flex-col items-center justify-center px-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-text-secondary">Łączę z tutorem...</p></main>;
  if (lessonState === "ending") return <main className="flex min-h-screen flex-col items-center justify-center px-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-text-secondary">Analizuję lekcję...</p></main>;

  const isSpeaking = conversation.isSpeaking;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-bg-dark px-4">
      {/* Timer */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <div className={`rounded-full px-5 py-2 text-lg font-mono font-bold ${
          timeLeft <= 60 ? "bg-red-500/20 text-red-400" : timeLeft <= 180 ? "bg-yellow-500/20 text-yellow-400" : "bg-bg-card text-text-secondary"
        }`}>{formatTime(timeLeft)}</div>
        {timeLeft === 0 && <div className="mt-2 text-center text-xs text-text-secondary">Czas minął — zakończ kiedy chcesz</div>}
      </div>

      {/* Enrichment words — above visualization, only when no hints */}
      {enrichmentWords.length > 0 && hintLevel === 0 && (
        <div className="absolute top-20 left-4 right-4 mx-auto flex max-w-md justify-center gap-3">
          {enrichmentWords.map((w, i) => (
            <div key={i} className="flex items-center gap-2 rounded-full border border-border/30 bg-bg-card/60 px-4 py-2 text-sm backdrop-blur-sm">
              <div>
                <span className="font-medium text-primary">{w.word}</span>
                <span className="text-text-secondary"> — {w.translation}</span>
              </div>
              <button
                onClick={() => { addEnrichmentToVocab(w.word, w.translation); setEnrichmentWords((prev) => prev.filter((_, j) => j !== i)); }}
                className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary hover:bg-primary/20"
                title="Dodaj do słowniczka"
              >+</button>
            </div>
          ))}
        </div>
      )}

      {/* Voice viz */}
      <div className="flex flex-col items-center gap-8">
        <div className="relative">
          <div className={`flex h-40 w-40 items-center justify-center rounded-full transition-all duration-300 ${
            isSpeaking ? "animate-pulse bg-primary/20 ring-4 ring-primary/40" : conversation.status === "connected" ? "bg-bg-card ring-2 ring-border" : "bg-bg-card"
          }`}>
            <div className={`flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 ${isSpeaking ? "bg-primary/30" : "bg-bg-card-hover"}`}>
              {isSpeaking ? <Volume2 className="h-10 w-10 text-primary animate-pulse" /> : <Mic className="h-10 w-10 text-text-secondary" />}
            </div>
          </div>
        </div>

        <div className="min-h-[80px] max-w-md text-center">
          {currentCaption && (
            <div className={`rounded-xl px-6 py-3 text-sm ${captionSource === "ai" ? "bg-bg-card text-text-primary" : "bg-primary/10 text-primary"}`}>
              <span className="text-xs text-text-secondary">{captionSource === "ai" ? "Tutor" : "Ty"}</span>
              <p className="mt-1">{currentCaption}</p>
            </div>
          )}
        </div>
      </div>

      {/* Hint loading */}
      {hintsLoading && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-bg-card/80 px-4 py-2 text-sm text-text-secondary backdrop-blur-sm">
            <Loader2 className="h-4 w-4 animate-spin" />Szukam podpowiedzi...
          </div>
        </div>
      )}

      {/* L1 hints — subtle word bar */}
      {hintLevel === 1 && hintsL1.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 mx-auto max-w-md animate-slide-in-up">
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-full border border-border/50 bg-bg-card/70 px-5 py-3 backdrop-blur-sm">
            {hintsL1.map((h, i) => (
              <span key={i} className="text-sm">
                <span className="font-medium text-text-primary">{h.phrase}</span>
                <span className="text-text-secondary"> → {h.translation}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* L2 hints — full panel */}
      {hintLevel === 2 && hintsL2.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 mx-auto max-w-md animate-slide-in-up">
          <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-xl">
            <div className="mb-3 text-xs font-medium text-text-secondary">Podpowiedzi</div>
            <div className="space-y-2">
              {hintsL2.map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-bg-card-hover p-3">
                  <div>
                    <div className="font-medium text-text-primary">{h.phrase}</div>
                    <div className="text-sm text-text-secondary">{h.translation}</div>
                  </div>
                  <button onClick={() => playHintTTS(h.phrase)} className="rounded-lg p-2 text-text-secondary hover:text-primary"><Play className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-between px-8">
        <button onClick={handleSOS} className={`flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold transition-all ${sosActive ? "bg-orange-500 text-white ring-4 ring-orange-500/30" : "bg-bg-card text-orange-400 hover:bg-orange-500/20"}`} title="Pomoc">
          <LifeBuoy className="h-6 w-6" />
        </button>
        <button onClick={handleEndLesson} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30" title="Zakończ">
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </main>
  );
}
