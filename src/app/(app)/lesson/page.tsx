"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useConversation } from "@11labs/react";
import { Loader2, Play, ArrowLeft, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { TutorAvatar } from "@/components/tutor-avatars";

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
  const [lessonState, setLessonState] = useState<LessonState>("loading");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("A1");
  const [displayName, setDisplayName] = useState("");
  const [duration, setDuration] = useState(15);
  const [signedUrl, setSignedUrl] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("pl");
  const [languageName, setLanguageName] = useState("Norwegian");
  const [agentName, setAgentName] = useState("Mia");
  const [agentId, setAgentId] = useState("ingrid");
  const [firstMessage, setFirstMessage] = useState("");
  const [error, setError] = useState("");

  const [timeLeft, setTimeLeft] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sosActive, setSosActive] = useState(false);

  // Hints
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [hintsLoading, setHintsLoading] = useState(false);
  const hintLevelRef = useRef(0);
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

      setTimeLeft(duration * 60);
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
        clearHintTimers();

        if (agentDoneTimerRef.current) clearTimeout(agentDoneTimerRef.current);
        agentDoneTimerRef.current = setTimeout(() => {
          agentSpeakingRef.current = false;
          scheduleHints("agent finished");
        }, 1000);
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
      if (lessonState !== "ending") { setError("Utracono polaczenie. " + message); setLessonState("error"); }
    },
  });

  // ---- Fetch hints (add to chat as hint message) ----
  const fetchHint = async (hintLvl: 1 | 2, isUpgrade = false) => {
    if (hintLvl === 1) setHintsLoading(true);
    if (!isUpgrade) lastHintTimeRef.current = Date.now();

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
      const profileRes = await fetch("/api/user/profile");
      if (!profileRes.ok) throw new Error("Failed to load profile");
      const profileData = await profileRes.json();
      profileRef.current = { language: profileData.target_language, agentId: profileData.selected_agent_id ?? "default" };
      setAgentId(profileData.selected_agent_id ?? "ingrid");
      await prepareLesson(profileData.target_language, profileData.selected_agent_id);
    } catch { setError("Nie udalo sie zaladowac danych."); setLessonState("error"); }
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
      setLessonState("ready");
    } catch (err) { setError(err instanceof Error ? err.message : "Blad"); setLessonState("error"); }
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
          lesson_duration: String(duration), first_message: firstMessage,
        },
      });
    } catch (err) {
      const msg = err instanceof DOMException && err.name === "NotAllowedError" ? "Zezwol na dostep do mikrofonu." : "Nie udalo sie polaczyc.";
      setError(msg); setLessonState("error");
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

  const handleSOS = () => {
    conversation.sendContextualUpdate("User needs help. Slow down, simplify, repeat.");
    setSosActive(true); setTimeout(() => setSosActive(false), 5000);
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
        <h1 className="text-xl font-bold">Cos poszlo nie tak</h1>
        <p className="text-on-surface-variant">{error}</p>
        <div className="flex gap-3">
          <button onClick={() => router.push("/dashboard")} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400">Dashboard</button>
          <button onClick={loadLessonData} className="flex-1 rounded-xl bg-godoj-blue py-2.5 text-sm font-bold text-white">Sprobuj ponownie</button>
        </div>
      </div>
    </div>
  );

  if (lessonState === "loading") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-on-surface-variant">Przygotowuje lekcje...</p>
    </div>
  );

  if (lessonState === "ready") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <TutorAvatar agentId={agentId} size={100} />
        <div>
          <h1 className="text-2xl font-extrabold">{agentName}</h1>
          <p className="mt-1 text-on-surface-variant">{languageName} · Poziom {level}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-surface-container-high p-6 text-left">
          <div className="text-sm text-on-surface-variant">Temat dnia</div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-lg font-bold">{topic}</span>
            <button onClick={refreshTopic} className="text-slate-400 hover:text-primary"><RefreshCw className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 text-sm text-slate-500">Czas: {duration} min</div>
        </div>
        <button onClick={startConversation} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-godoj-blue px-6 py-4 text-lg font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
          Rozpocznij rozmowe
        </button>
        <button onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />Wroc do Dashboard
        </button>
      </div>
    </div>
  );

  if (lessonState === "connecting") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-on-surface-variant">Lacze z {agentName}...</p>
    </div>
  );

  if (lessonState === "ending") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-on-surface-variant">Analizuje lekcje...</p>
    </div>
  );

  // ---- ACTIVE LESSON ----
  const isSpeaking = conversation.isSpeaking;

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-surface via-surface to-surface-container">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <TutorAvatar agentId={agentId} size={36} speaking={isSpeaking} />
          <div>
            <span className="text-sm font-bold text-white">{agentName}</span>
            {hintsLoading && <span className="ml-2 text-xs text-tertiary">myśli...</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`rounded-full px-3 py-1 text-sm font-mono font-bold ${
            timeLeft <= 60 ? "bg-red-500/20 text-red-400" : timeLeft <= 180 ? "bg-tertiary/20 text-tertiary" : "bg-surface-container-high text-slate-400"
          }`}>{formatTime(timeLeft)}</div>
          <button onClick={handleEndLesson} className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Enrichment words (above chat) */}
      {enrichmentWords.length > 0 && hintLevel === 0 && (
        <div className="flex items-center justify-center gap-3 border-b border-white/5 px-4 py-2 bg-surface-container/50">
          {enrichmentWords.map((w, i) => (
            <div key={i} className="flex items-center gap-2 rounded-full border border-white/10 bg-surface-container-high px-3 py-1.5 text-xs">
              <span className="font-medium text-primary">{w.word}</span>
              <span className="text-slate-500">— {w.translation}</span>
              <button onClick={() => { addEnrichmentToVocab(w.word, w.translation); setEnrichmentWords((prev) => prev.filter((_, j) => j !== i)); }} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/20">+</button>
            </div>
          ))}
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
            <TutorAvatar agentId={agentId} size={64} speaking={isSpeaking} />
            <p className="mt-3 text-sm text-slate-500">{isSpeaking ? `${agentName} mowi...` : "Czekam na rozmowe..."}</p>
          </div>
        )}

        {chatMessages.map((msg) => {
          if (msg.source === "ai") return (
            <div key={msg.id} className="flex items-start gap-2 max-w-[85%]">
              <TutorAvatar agentId={agentId} size={28} />
              <div>
                <div className="rounded-2xl rounded-tl-sm bg-surface-container-high px-4 py-2.5 text-sm text-on-surface">
                  {msg.message}
                </div>
                <span className="ml-2 text-[10px] text-slate-600">{new Date(msg.ts).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          );

          if (msg.source === "user") return (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[85%]">
                <div className="rounded-2xl rounded-tr-sm bg-godoj-blue/20 px-4 py-2.5 text-sm text-on-surface">
                  {msg.message}
                </div>
                <span className="mr-2 float-right text-[10px] text-slate-600">{new Date(msg.ts).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          );

          if (msg.source === "hint" && msg.hints) return (
            <div key={msg.id} className="mx-auto max-w-[90%]">
              <div className="rounded-2xl border border-tertiary/20 bg-tertiary/5 p-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-tertiary mb-2">
                  <span className="material-symbols-outlined text-sm">lightbulb</span>
                  Podpowiedzi
                </div>
                <div className="space-y-1.5">
                  {msg.hints.map((h, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-surface-container-high px-3 py-2">
                      <div>
                        <span className="text-sm font-medium text-on-surface">{h.phrase}</span>
                        <span className="ml-2 text-xs text-slate-500">{h.translation}</span>
                      </div>
                      <button onClick={() => playTTS(h.phrase)} className="text-slate-500 hover:text-primary">
                        <Play className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );

          return null;
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between border-t border-white/5 bg-surface px-6 py-4">
        <button onClick={handleSOS} className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all ${sosActive ? "bg-tertiary text-black ring-4 ring-tertiary/30" : "bg-surface-container-high text-tertiary hover:bg-tertiary/10"}`}>
          <span className="material-symbols-outlined text-lg">sos</span>
          Pomoc
        </button>

        {/* Recording indicator */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {!isSpeaking && conversation.status === "connected" && (
            <>
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Slucham...
            </>
          )}
          {isSpeaking && (
            <>
              <span className="material-symbols-outlined text-primary animate-pulse text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>volume_up</span>
              {agentName} mowi...
            </>
          )}
        </div>

        <button onClick={handleEndLesson} className="flex items-center gap-2 rounded-2xl bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400 hover:bg-red-500/20">
          <span className="material-symbols-outlined text-lg">call_end</span>
          Zakoncz
        </button>
      </div>
    </div>
  );
}
