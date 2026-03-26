"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useConversation } from "@11labs/react";
import { Loader2, Play, ArrowLeft, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { TutorAvatar } from "@/components/tutor-avatars";
import { useLanguage } from "@/lib/language-context";
import { logError } from "@/lib/error-logger";

type Hint = { phrase: string; translation: string };
type ChatMessage = {
  id: number;
  source: "user" | "ai" | "hint" | "enrichment";
  message: string;
  ts: number;
  hints?: Hint[];
};
type LessonState = "loading" | "ready" | "connecting" | "active" | "ending" | "error";

function cleanCaption(text: string): string {
  return text.replace(/\[.*?\]\s*/g, "").trim();
}

const FILLER_RE = /^(e+h*|u+h*m*|h+m+|a+h+|y+|øh*|eh+m+|hm+|mm+|ah+)$/i;
function isFiller(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((w) => FILLER_RE.test(w));
}

let msgIdCounter = 0;

export default function LessonPage() {
  const router = useRouter();
  const langCtx = useLanguage();
  const [lessonState, setLessonState] = useState<LessonState>("loading");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("A1");
  const [displayName, setDisplayName] = useState("");
  const [duration, setDuration] = useState(15);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [signedUrl, setSignedUrl] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("pl");
  const [languageName, setLanguageName] = useState("Norwegian");
  const [agentName, setAgentName] = useState("Mia");
  const [agentId, setAgentId] = useState("ingrid");
  const [firstMessage, setFirstMessage] = useState("");
  const [previousContext, setPreviousContext] = useState("To pierwsza rozmowa.");
  const [agentSystemPrompt, setAgentSystemPrompt] = useState("");
  const [error, setError] = useState("");

  const [timeLeft, setTimeLeft] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [hintsEnabled, setHintsEnabled] = useState(true); // SOS toggle

  // Hints
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [hintsLoading, setHintsLoading] = useState(false);
  const hintLevelRef = useRef(0);
  const hintsEnabledRef = useRef(true);
  const hintShownThisTurnRef = useRef(false); // max 1 hint per agent turn
  const setHintLevelSynced = (lvl: 0 | 1 | 2) => { hintLevelRef.current = lvl; setHintLevel(lvl); };

  // Enrichment
  const [enrichmentWords, setEnrichmentWords] = useState<{ word: string; translation: string }[]>([]);
  const enrichmentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enrichmentWordsShownRef = useRef<string[]>([]);

  // Refs
  const hintTimer1Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agentDoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lessonTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<{ source: "user" | "ai"; message: string }[]>([]);
  const startTimeRef = useRef<number>(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const lastHintTimeRef = useRef(0);
  const agentSpeakingRef = useRef(false);
  const lastUserMsgRef = useRef("");
  const lastAgentMsgRef = useRef("");
  const hintPauseSentRef = useRef(false);
  const lessonActiveRef = useRef(false);

  const HINT_COOLDOWN_MS = 12_000;
  const HINT_GRACE_MS = 3_000;
  const L1_MS = 2_000;
  const L2_MS = 4_000;

  const profileRef = useRef({ language: "", agentId: "" });

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const addChatMessage = (source: ChatMessage["source"], message: string, hints?: Hint[]) => {
    setChatMessages((prev) => [...prev, { id: ++msgIdCounter, source, message, ts: Date.now(), hints }]);
  };

  const dbg = (msg: string) => console.log(`[hint] ${msg}`);

  // ---- Hint helpers ----
  const clearHintTimers = () => {
    if (hintTimer1Ref.current) { clearTimeout(hintTimer1Ref.current); hintTimer1Ref.current = null; }
    if (hintTimer2Ref.current) { clearTimeout(hintTimer2Ref.current); hintTimer2Ref.current = null; }
    if (agentDoneTimerRef.current) { clearTimeout(agentDoneTimerRef.current); agentDoneTimerRef.current = null; }
  };

  const canTriggerHint = (): boolean => {
    if (!hintsEnabledRef.current) return false;
    if (hintShownThisTurnRef.current) return false;
    const elapsed = Date.now() - startTimeRef.current;
    const sinceLast = Date.now() - lastHintTimeRef.current;
    return lessonActiveRef.current && !agentSpeakingRef.current && elapsed > HINT_GRACE_MS && (lastHintTimeRef.current === 0 || sinceLast > HINT_COOLDOWN_MS);
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
    dbg(`Scheduling hints: ${reason}`);

    hintTimer1Ref.current = setTimeout(() => {
      if (!lessonActiveRef.current || agentSpeakingRef.current) return;
      try { conversation.sendContextualUpdate("The user is thinking and reading hints. Wait for them."); hintPauseSentRef.current = true; } catch {}
      fetchHint(1);
    }, L1_MS);

    hintTimer2Ref.current = setTimeout(() => {
      if (!lessonActiveRef.current || agentSpeakingRef.current) return;
      fetchHint(2, true);
    }, L2_MS);
  };

  // ---- ElevenLabs ----
  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      dbg(`Connected: ${conversationId}`);
      setLessonState("active");
      lessonActiveRef.current = true;
      startTimeRef.current = Date.now();

      if (systemPrompt) conversation.sendContextualUpdate(systemPrompt);

      const effectiveDuration = selectedDuration ?? duration;
      setTimeLeft(effectiveDuration * 60);
      lessonTimerRef.current = setInterval(() => {
        setTimeLeft((prev) => { if (prev <= 1) { if (lessonTimerRef.current) clearInterval(lessonTimerRef.current); return 0; } return prev - 1; });
      }, 1000);

      // Enrichment timer
      setTimeout(() => fetchEnrichment(), 15000);
      enrichmentTimerRef.current = setInterval(() => {
        if (hintLevelRef.current === 0 && !agentSpeakingRef.current) fetchEnrichment();
      }, 25000);
    },
    onDisconnect: () => {
      lessonActiveRef.current = false;
      if (enrichmentTimerRef.current) clearInterval(enrichmentTimerRef.current);
      if (lessonState === "active") handleEndLesson();
    },
    onMessage: ({ message, source }) => {
      const clean = cleanCaption(message);
      if (!clean) return;

      // Add to chat
      addChatMessage(source, clean);

      // Track for transcript
      transcriptRef.current = [...transcriptRef.current, { source, message: clean }];

      if (source === "ai") {
        lastAgentMsgRef.current = clean;
        agentSpeakingRef.current = true;
        hintShownThisTurnRef.current = false; // reset for new turn
        clearHintTimers();

        if (agentDoneTimerRef.current) clearTimeout(agentDoneTimerRef.current);
        agentDoneTimerRef.current = setTimeout(() => {
          agentSpeakingRef.current = false;
          dbg("Agent done (3s debounce)");
          scheduleHints("agent finished");
        }, 3000); // 3s debounce — wait for agent to truly finish
      }

      if (source === "user") {
        lastUserMsgRef.current = clean;
        agentSpeakingRef.current = false;
        hideHints();
        if (isFiller(clean)) scheduleHints("filler words");
      }
    },
    onModeChange: (prop: { mode: string }) => { dbg(`Mode: ${prop.mode}`); },
    onStatusChange: (prop: { status: string }) => { dbg(`Status: ${prop.status}`); },
    onError: (message: string) => {
      console.error("Conversation error:", message);
      if (lessonState !== "ending") { setError("Utracono polaczenie. " + message); setLessonState("error"); logError("/lesson", "Conversation error: " + message, { step: "onError", agentId: profileRef.current.agentId }); }
    },
  });

  // ---- Fetch hints (add to chat as hint message) ----
  const fetchHint = async (hintLvl: 1 | 2, isUpgrade = false) => {
    if (hintLvl === 1) setHintsLoading(true);
    if (!isUpgrade) lastHintTimeRef.current = Date.now();
    hintShownThisTurnRef.current = true;

    const recentTranscript = transcriptRef.current.slice(-6).map((t) => `${t.source === "ai" ? "Tutor" : "User"}: ${t.message}`).join("\n");
    const userAttempt = lastUserMsgRef.current.trim();
    const stuckType = !userAttempt ? "no_response" : isFiller(userAttempt) ? "filler_words" : "incomplete_sentence";

    try {
      const res = await fetch("/api/lessons/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId, conversation_context: recentTranscript,
          target_language: profileRef.current.language, native_language: nativeLanguage,
          hint_level: hintLvl, last_agent_message: lastAgentMsgRef.current,
          user_attempt: userAttempt, stuck_type: stuckType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.hints?.length > 0) {
          // Add hint as chat message (persists in chat)
          addChatMessage("hint", hintLvl === 1 ? "Podpowiedzi" : "Podpowiedzi (frazy)", data.hints);
          setHintLevelSynced(hintLvl);
        }
      }
    } catch {} finally { if (hintLvl === 1) setHintsLoading(false); }
  };

  // ---- Enrichment ----
  const fetchEnrichment = async () => {
    try {
      const res = await fetch("/api/lessons/enrichment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_topic: topic, language: profileRef.current.language, user_level: level, recent_vocabulary: enrichmentWordsShownRef.current }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.words?.length > 0) {
          setEnrichmentWords(data.words);
          enrichmentWordsShownRef.current = [...enrichmentWordsShownRef.current, ...data.words.map((w: { word: string }) => w.word)];
          setTimeout(() => setEnrichmentWords([]), 10000);
        }
      }
    } catch {}
  };

  const addEnrichmentToVocab = async (word: string, translation: string) => {
    try { await fetch("/api/vocabulary/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word, translation, language: profileRef.current.language, lesson_id: lessonId }) }); } catch {}
  };

  // ---- Lifecycle ----
  useEffect(() => {
    loadLessonData();
    return () => { clearHintTimers(); if (lessonTimerRef.current) clearInterval(lessonTimerRef.current); if (enrichmentTimerRef.current) clearInterval(enrichmentTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLessonData = async () => {
    try {
      // Use language context — single source of truth
      const lang = langCtx.language;
      const agId = langCtx.agentId || "default";
      profileRef.current = { language: lang, agentId: agId };
      setAgentId(agId);
      await prepareLesson(lang, agId);
    } catch (err) { const msg = "Nie udało się załadować danych."; setError(msg); setLessonState("error"); logError("/lesson", msg, { step: "loadLessonData", error: String(err) }); }
  };

  const prepareLesson = async (language: string, agId?: string) => {
    setLessonState("loading"); setError("");
    try {
      const res = await fetch("/api/lessons/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language, agent_id: agId ?? "default" }) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? "Blad serwera"); }
      const data = await res.json();
      setLessonId(data.lesson_id); setTopic(data.topic); setSignedUrl(data.signed_url);
      setSystemPrompt(data.system_prompt_override); setDuration(data.duration);
      setDisplayName(data.display_name); setLevel(data.level);
      setNativeLanguage(data.native_language ?? "pl"); setLanguageName(data.language_name ?? "Norwegian");
      setAgentName(data.agent_name ?? "Tutor"); setFirstMessage(data.first_message ?? "");
      setPreviousContext(data.previous_context ?? "To pierwsza rozmowa.");
      setAgentSystemPrompt(data.agent_system_prompt ?? "");
      setLessonState("ready");
    } catch (err) { const msg = err instanceof Error ? err.message : "Blad"; setError(msg); setLessonState("error"); logError("/lesson", msg, { step: "prepareLesson", language, agent_id: agId }); }
  };

  const startConversation = async () => {
    setLessonState("connecting");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        signedUrl,
        dynamicVariables: {
          user_name: displayName, user_level: level, native_language: nativeLanguage,
          language_name: languageName, agent_name: agentName, lesson_topic: topic,
          lesson_duration: String(selectedDuration ?? duration), first_message: firstMessage,
          previous_context: previousContext,
        },
      });
    } catch (err) {
      const msg = err instanceof DOMException && err.name === "NotAllowedError" ? "Zezwól na dostęp do mikrofonu." : "Nie udało się połączyć.";
      setError(msg); setLessonState("error"); logError("/lesson", msg, { step: "startConversation", error: String(err) });
    }
  };

  const handleEndLesson = useCallback(async () => {
    if (lessonState === "ending") return;
    setLessonState("ending"); lessonActiveRef.current = false;
    clearHintTimers(); if (lessonTimerRef.current) clearInterval(lessonTimerRef.current);
    if (enrichmentTimerRef.current) clearInterval(enrichmentTimerRef.current);
    try { await conversation.endSession(); } catch {}

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const transcriptText = transcriptRef.current.map((t) => `${t.source === "ai" ? "Tutor" : "User"}: ${t.message}`).join("\n");
    try {
      const res = await fetch("/api/lessons/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lesson_id: lessonId, transcript: transcriptText, duration_seconds: durationSeconds }) });
      fetch("/api/achievements/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lesson_id: lessonId }) }).catch(() => {});
      router.push(res.ok ? `/lesson/${lessonId}/summary` : "/dashboard");
    } catch { router.push("/dashboard"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonState, lessonId, router]);

  const handleHintToggle = () => {
    if (hintsEnabled) {
      // First: show hints immediately
      if (!hintShownThisTurnRef.current) {
        fetchHint(1);
      }
      // Then disable for future
      setHintsEnabled(false);
      hintsEnabledRef.current = false;
      clearHintTimers();
    } else {
      setHintsEnabled(true);
      hintsEnabledRef.current = true;
    }
  };

  const playTTS = async (text: string) => {
    try {
      const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language: profileRef.current.language }) });
      if (res.ok) { const blob = await res.blob(); const url = URL.createObjectURL(blob); const audio = new Audio(url); audio.play(); audio.onended = () => URL.revokeObjectURL(url); }
    } catch {}
  };

  const refreshTopic = () => prepareLesson(profileRef.current.language, profileRef.current.agentId);
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ---- RENDER ----

  if (lessonState === "error") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <span className="material-symbols-outlined text-3xl text-red-400">error</span>
        </div>
        <h1 className="text-xl font-bold">Coś poszło nie tak</h1>
        <p className="text-on-surface-variant">{error}</p>
        <div className="flex gap-3">
          <button onClick={() => router.push("/dashboard")} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400">Dashboard</button>
          <button onClick={loadLessonData} className="flex-1 rounded-xl bg-godoj-blue py-2.5 text-sm font-bold text-white">Spróbuj ponownie</button>
        </div>
      </div>
    </div>
  );

  if (lessonState === "loading") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-on-surface-variant">Przygotowuję lekcję...</p>
    </div>
  );

  if (lessonState === "ready") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <TutorAvatar agentId={agentId} size={160} />
        <div className="mt-2">
          <h1 className="text-3xl font-extrabold">{agentName}</h1>
          <p className="mt-1 text-on-surface-variant">{languageName} · Poziom {level}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-surface-container-high p-6 text-left">
          <div className="text-sm text-on-surface-variant">Temat dnia</div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-lg font-bold">{topic}</span>
            <button onClick={refreshTopic} className="text-slate-400 hover:text-primary"><RefreshCw className="h-4 w-4" /></button>
          </div>
        </div>
        {/* Duration picker */}
        <div>
          <div className="mb-2 text-sm text-on-surface-variant text-center">Czas lekcji</div>
          <div className="flex justify-center gap-2">
            {[5, 10, 15].map((d) => (
              <button key={d} onClick={() => setSelectedDuration(d)}
                className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${(selectedDuration ?? duration) === d ? "bg-godoj-blue text-white shadow-lg shadow-godoj-blue/30" : "border border-white/10 text-on-surface-variant hover:border-primary/50"}`}>
                {d} min
              </button>
            ))}
          </div>
        </div>
        <button onClick={startConversation} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-godoj-blue px-6 py-4 text-lg font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
          Rozpocznij rozmowę
        </button>
        <button onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />Wróć do Dashboard
        </button>
      </div>
    </div>
  );

  if (lessonState === "connecting") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-on-surface-variant">Łączę z {agentName}...</p>
    </div>
  );

  if (lessonState === "ending") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-on-surface-variant">Analizuję lekcję...</p>
    </div>
  );

  // ---- ACTIVE LESSON ----
  const isSpeaking = conversation.isSpeaking;
  const effectiveDur = selectedDuration ?? duration;
  const elapsed = effectiveDur * 60 - timeLeft;
  const progressPct = effectiveDur > 0 ? Math.min(100, Math.round((elapsed / (effectiveDur * 60)) * 100)) : 0;

  return (
    <div className="flex h-screen flex-col bg-[#0F172A] overflow-hidden">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between px-4 lg:px-8 bg-surface/50 backdrop-blur-md border-b border-white/5 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="h-9 w-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-white transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div className="hidden sm:block">
            <h2 className="text-sm font-extrabold text-white leading-tight">{topic}</h2>
            <p className="text-[10px] text-on-surface-variant">{agentName} · {languageName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Progress bar */}
          <div className="hidden sm:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <div className="w-32 lg:w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-xs font-bold text-primary">{progressPct}%</span>
            </div>
          </div>
          {/* Timer */}
          <div className={`rounded-full px-3 py-1 text-xs font-mono font-bold ${
            timeLeft <= 60 ? "bg-red-500/20 text-red-400" : "bg-surface-container-high text-slate-400"
          }`}>{formatTime(timeLeft)}</div>
        </div>
      </header>

      {/* Main content: avatar + chat */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Tutor avatar — left panel (desktop only) */}
        <div className="hidden lg:flex w-1/3 items-end justify-center p-8 relative">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10 flex items-end justify-center h-full w-full">
            <TutorAvatar agentId={agentId} size={240} speaking={isSpeaking} />
          </div>
        </div>

        {/* Chat + bottom controls */}
        <div className="flex-1 flex flex-col relative">
          {/* Enrichment words */}
          {enrichmentWords.length > 0 && hintLevel === 0 && (
            <div className="flex items-center justify-center gap-2 px-4 py-2 border-b border-white/5 bg-surface-container/30">
              {enrichmentWords.map((w, i) => (
                <div key={i} className="flex items-center gap-2 rounded-full border border-white/10 bg-surface-container-high px-3 py-1.5 text-xs">
                  <span className="font-medium text-primary">{w.word}</span>
                  <span className="text-slate-500">— {w.translation}</span>
                  <button onClick={() => { addEnrichmentToVocab(w.word, w.translation); setEnrichmentWords((prev) => prev.filter((_, j) => j !== i)); }} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/20">+</button>
                </div>
              ))}
            </div>
          )}

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 pb-48 space-y-6" style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                <TutorAvatar agentId={agentId} size={80} speaking={isSpeaking} />
                <p className="mt-4 text-sm text-slate-500">{isSpeaking ? `${agentName} mówi...` : "Rozmowa zaraz się zacznie..."}</p>
              </div>
            )}

            {chatMessages.map((msg) => {
              if (msg.source === "ai") return (
                <div key={msg.id} className="flex flex-col items-start gap-1.5">
                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{agentName}</span>
                    <div className="w-1 h-1 rounded-full bg-primary" />
                  </div>
                  <div className="max-w-lg rounded-[1.5rem] rounded-tl-none bg-surface-container border border-white/5 px-5 py-4 shadow-xl">
                    <p className="text-base lg:text-lg font-medium leading-relaxed">{msg.message}</p>
                  </div>
                  <span className="pl-2 text-[10px] text-slate-600">{new Date(msg.ts).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              );

              if (msg.source === "user") return (
                <div key={msg.id} className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-2 pr-2">
                    <div className="w-1 h-1 rounded-full bg-godoj-blue" />
                    <span className="text-[10px] font-bold text-godoj-blue tracking-widest uppercase">Ty</span>
                  </div>
                  <div className="max-w-lg rounded-[1.5rem] rounded-tr-none bg-godoj-blue px-5 py-4 shadow-[0_10px_30px_rgba(26,115,232,0.2)]">
                    <p className="text-base lg:text-lg font-semibold leading-relaxed text-white">{msg.message}</p>
                  </div>
                  <span className="pr-2 text-[10px] text-slate-600">{new Date(msg.ts).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              );

              if (msg.source === "hint" && msg.hints) return (
                <div key={msg.id} className="w-full max-w-2xl mx-auto">
                  <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-5 rounded-3xl shadow-2xl">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-sm text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                      <span className="text-xs font-bold text-tertiary tracking-wider uppercase">Podpowiedzi</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {msg.hints.map((h, i) => (
                        <button key={i} onClick={() => playTTS(h.phrase)} className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-left group">
                          <div>
                            <p className="text-sm font-bold text-primary">{h.phrase}</p>
                            <p className="text-[10px] text-on-surface-variant">{h.translation}</p>
                          </div>
                          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">play_circle</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );

              return null;
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Bottom controls — floating */}
          <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center pb-6 pointer-events-none">
            {/* SOS + Mic + End */}
            <div className="flex items-end gap-6 pointer-events-auto">
              {/* SOS */}
              <button onClick={handleHintToggle} className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${hintsEnabled ? "bg-tertiary/10 text-tertiary border border-tertiary/20" : "bg-surface-container-high text-slate-500 border border-white/5"}`} title={hintsEnabled ? "Wyłącz podpowiedzi" : "Włącz podpowiedzi"}>
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: hintsEnabled ? "'FILL' 1" : undefined }}>lightbulb</span>
                <span className="hidden sm:inline">{hintsEnabled ? "Wł." : "Wył."}</span>
              </button>

              {/* Mic button */}
              <div className="relative flex flex-col items-center">
                {!isSpeaking && conversation.status === "connected" && (
                  <div className="absolute -inset-3 bg-primary/20 blur-2xl rounded-full animate-pulse" style={{ animationDuration: "2s" }} />
                )}
                <div className={`relative h-20 w-20 rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all ${
                  isSpeaking ? "bg-surface-container-high ring-2 ring-primary/30" : "bg-primary hover:scale-110 active:scale-95"
                }`}>
                  <span className="material-symbols-outlined text-3xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {isSpeaking ? "volume_up" : "mic"}
                  </span>
                </div>
                <div className="mt-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                  <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {isSpeaking ? `${agentName} mówi...` : hintsLoading ? "Szukam podpowiedzi..." : "Słucham..."}
                  </p>
                </div>
              </div>

              {/* End */}
              <button onClick={handleEndLesson} className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 border border-white/5 transition-all" title="Zakończ">
                <span className="material-symbols-outlined">call_end</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
