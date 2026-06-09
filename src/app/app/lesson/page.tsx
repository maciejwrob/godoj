"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useConversation } from "@11labs/react";
import { Loader2, Play, ArrowLeft, RefreshCw, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { TutorAvatar } from "@/components/tutor-avatars";
import { MicCheckModal } from "@/components/mic-check-modal";
import { useLanguage } from "@/lib/language-context";
import { useTranslation } from "@/lib/i18n";
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

type WordTranslation = {
  word: string;
  translation: string;
  note: string;
  msgId: number;
  wordIdx: number;
};

let msgIdCounter = 0;

export default function LessonPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const langCtx = useLanguage();
  const { t, locale } = useTranslation();
  const [lessonState, setLessonState] = useState<LessonState>("loading");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("A1");
  const [displayName, setDisplayName] = useState("");
  const [duration, setDuration] = useState(10);
  // Read duration from URL query param (passed from dashboard)
  const urlDuration = searchParams.get("duration");
  const [selectedDuration, setSelectedDuration] = useState<number | null>(
    urlDuration ? parseInt(urlDuration, 10) : null
  );
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
  const [micCheckOpen, setMicCheckOpen] = useState(false);
  const [micCheckPassed, setMicCheckPassed] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("godoj_mic_checked") === "1";
    return false;
  });
  const [autoEndCountdown, setAutoEndCountdown] = useState<number | null>(null);
  const [limitError, setLimitError] = useState<{ type: "daily" | "monthly" | "minutes"; used: number; limit: number; tier?: string } | null>(null);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [planMinutesRemaining, setPlanMinutesRemaining] = useState<number | null>(null); // minutes left in subscription
  const [trialWarningShown, setTrialWarningShown] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<"manual" | "limit" | null>(null);
  const pausedAtRef = useRef<number>(0); // total paused ms to subtract from duration
  const [wordTranslations, setWordTranslations] = useState<Map<string, WordTranslation>>(new Map());
  const [translatingKey, setTranslatingKey] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<{ key: string; x: number; y: number } | null>(null);
  const autoEndTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      console.log("[ElevenLabs] WebSocket connected, conversationId:", conversationId);
      dbg(`Connected: ${conversationId}`);
      setLessonState("active");
      lessonActiveRef.current = true;
      startTimeRef.current = Date.now();

      if (systemPrompt) conversation.sendContextualUpdate(systemPrompt);

      const effectiveDuration = selectedDuration ?? duration;
      setTimeLeft(effectiveDuration * 60);
      // Wrap-up timing: 30s for short lessons (≤5min), 60s for longer ones
      const wrapUpBuffer = effectiveDuration <= 5 ? 30 : 60;
      const wrapUpSeconds = effectiveDuration * 60 - wrapUpBuffer;
      let elapsed = 0;
      let wrapUpSent = false;
      let trialWarned = false;
      let graceStarted = false;
      const planMins = planMinutesRemaining; // capture at connect time
      // For non-unlimited: hard cutoff = plan minutes + 2 min grace
      const planLimitSeconds = planMins != null ? planMins * 60 : null;
      const graceSeconds = 120; // 2 min bonus after plan limit

      lessonTimerRef.current = setInterval(() => {
        elapsed++;
        setTimeLeft((prev) => prev - 1);

        // Wrap-up reminder: tell the AI tutor to start wrapping up
        if (!wrapUpSent && elapsed === wrapUpSeconds && lessonActiveRef.current) {
          wrapUpSent = true;
          const wrapMsg = wrapUpBuffer <= 30
            ? "WRAP UP NOW: The lesson is ending. Do NOT ask any more questions. Briefly summarize what was covered and say a warm goodbye. This is your LAST turn."
            : "WRAP UP NOW: The lesson ends in about 1 minute. Do NOT ask any new questions. Finish your current thought, give a brief summary, and say goodbye warmly.";
          try { conversation.sendContextualUpdate(wrapMsg); } catch {}
        }

        // For non-unlimited users: plan limit enforcement
        if (!isUnlimited && planLimitSeconds != null && lessonActiveRef.current) {
          const secsIntoLimit = elapsed - planLimitSeconds;

          // 2 min before plan limit: show warning
          if (!trialWarned && secsIntoLimit >= -120) {
            trialWarned = true;
            setTrialWarningShown(true);
            setAutoEndCountdown(Math.max(0, -secsIntoLimit));
            autoEndTimerRef.current = setInterval(() => {
              setAutoEndCountdown((prev) => {
                if (prev === null || prev <= 1) {
                  if (autoEndTimerRef.current) clearInterval(autoEndTimerRef.current);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }

          // At plan limit: switch to grace period
          if (!graceStarted && secsIntoLimit >= 0) {
            graceStarted = true;
            setAutoEndCountdown(graceSeconds);
            if (autoEndTimerRef.current) clearInterval(autoEndTimerRef.current);
            autoEndTimerRef.current = setInterval(() => {
              setAutoEndCountdown((prev) => {
                if (prev === null || prev <= 1) {
                  if (autoEndTimerRef.current) clearInterval(autoEndTimerRef.current);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
            try { conversation.sendContextualUpdate("URGENT: The student's time has completely run out. Say goodbye RIGHT NOW in 1-2 sentences. Do NOT ask any questions or continue the conversation."); } catch {}
          }

          // After grace period: force end
          if (secsIntoLimit >= graceSeconds) {
            handleEndLesson();
          }
        }
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
        const isFirstMsgThisTurn = !agentSpeakingRef.current;
        lastAgentMsgRef.current = clean;
        agentSpeakingRef.current = true;

        // Only reset on FIRST chunk of a new turn, not every chunk
        if (isFirstMsgThisTurn) {
          hintShownThisTurnRef.current = false;
        }

        // agentDone debounce — restart on every chunk (last chunk + 3s = done)
        if (agentDoneTimerRef.current) clearTimeout(agentDoneTimerRef.current);
        agentDoneTimerRef.current = setTimeout(() => {
          agentSpeakingRef.current = false;
          dbg("Agent done (3s debounce)");
          if (!hintShownThisTurnRef.current) scheduleHints("agent finished");
        }, 3000);
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
      if (lessonState !== "ending") { setError(t("connectionLost") + " " + message); setLessonState("error"); logError("/app/lesson", "Conversation error: " + message, { step: "onError", agentId: profileRef.current.agentId }); }
    },
  });

  // ---- Pause / Resume ----
  const pauseLesson = useCallback((reason: "manual" | "limit" = "manual") => {
    if (isPaused || conversation.status !== "connected") return;
    setIsPaused(true);
    setPauseReason(reason);
    pausedAtRef.current = Date.now();
    try { conversation.setVolume({ volume: 0 }); } catch {}
    try { conversation.sendContextualUpdate("PAUSE: The student has paused the lesson. Do NOT say anything. Wait in complete silence until resumed."); } catch {}
    if (lessonTimerRef.current) { clearInterval(lessonTimerRef.current); lessonTimerRef.current = null; }
    clearHintTimers();
  }, [isPaused, conversation]);

  const resumeLesson = useCallback(() => {
    if (!isPaused || conversation.status !== "connected") return;
    setIsPaused(false);
    setPauseReason(null);
    try { conversation.setVolume({ volume: 1 }); } catch {}
    try { conversation.sendContextualUpdate("RESUME: The student is back. Continue the conversation naturally from where you left off."); } catch {}
  }, [isPaused, conversation]);

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
          addChatMessage("hint", hintLvl === 1 ? t("hints") : `${t("hints")} (frazy)`, data.hints);
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
          setTimeout(() => setEnrichmentWords([]), 45000);
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
    return () => { clearHintTimers(); if (lessonTimerRef.current) clearInterval(lessonTimerRef.current); if (enrichmentTimerRef.current) clearInterval(enrichmentTimerRef.current); if (autoEndTimerRef.current) clearInterval(autoEndTimerRef.current); };
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
    } catch (err) { const msg = "Nie udało się załadować danych."; setError(msg); setLessonState("error"); logError("/app/lesson", msg, { step: "loadLessonData", error: String(err) }); }
  };

  const prepareLesson = async (language: string, agId?: string) => {
    setLessonState("loading"); setError("");
    try {
      const res = await fetch("/api/lessons/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language, agent_id: agId ?? "default" }) });
      if (!res.ok) {
        const data = await res.json();
        if (data.error === "MINUTES_EXHAUSTED" || res.status === 403) {
          setLimitError({ type: "minutes", used: data.minutesUsed ?? 0, limit: data.minutesLimit ?? 0, tier: data.tier });
          setLessonState("error");
          return;
        }
        if (res.status === 429) {
          if (data.error === "DAILY_LIMIT_REACHED") {
            setLimitError({ type: "daily", used: data.dailyUsed, limit: data.dailyLimit });
            setLessonState("error");
            return;
          }
          if (data.error === "MONTHLY_LIMIT_REACHED") {
            setLimitError({ type: "monthly", used: data.monthlyUsed, limit: data.monthlyLimit });
            setLessonState("error");
            return;
          }
        }
        throw new Error(data.error ?? "Blad serwera");
      }
      const data = await res.json();
      setLessonId(data.lesson_id); setTopic(data.topic); setSignedUrl(data.signed_url);
      setSystemPrompt(data.system_prompt_override); setDuration(data.duration);
      setDisplayName(data.display_name); setLevel(data.level);
      setNativeLanguage(data.native_language ?? "pl"); setLanguageName(data.language_name ?? "Norwegian");
      setAgentName(data.agent_name ?? "Tutor");
      if (data.resolved_agent_id) { setAgentId(data.resolved_agent_id); profileRef.current.agentId = data.resolved_agent_id; }
      setFirstMessage(data.first_message ?? "");
      setPreviousContext(data.previous_context ?? "To pierwsza rozmowa.");
      setAgentSystemPrompt(data.agent_system_prompt ?? "");
      setIsUnlimited(data.unlimited ?? false);
      setPlanMinutesRemaining(data.minutes_remaining ?? null);
      setLessonState("ready");
    } catch (err) { const msg = err instanceof Error ? err.message : "Blad"; setError(msg); setLessonState("error"); logError("/app/lesson", msg, { step: "prepareLesson", language, agent_id: agId }); }
  };

  const startConversation = async () => {
    setLessonState("connecting");
    try {
      console.log("[ElevenLabs] Requesting microphone permissions...");
      // Mobile-friendly mic constraints: noise suppression + AGC for outdoor/car use
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      console.log("[ElevenLabs] Mic granted. signedUrl present:", !!signedUrl);

      if (!signedUrl) {
        throw new Error("Brak signed URL — odśwież stronę.");
      }

      console.log("[ElevenLabs] Starting session...");
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
      console.error("[ElevenLabs] startConversation error:", err);
      let msg = "Nie udało się połączyć.";
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") msg = "Zezwól na dostęp do mikrofonu.";
        else if (err.name === "NotFoundError") msg = "Nie znaleziono mikrofonu. Podłącz mikrofon i spróbuj ponownie.";
      } else if (err instanceof Error && err.message.startsWith("Brak signed URL")) {
        msg = err.message;
      }
      setError(msg); setLessonState("error"); logError("/app/lesson", msg, { step: "startConversation", error: String(err) });
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
      router.push(res.ok ? `/app/lesson/${lessonId}/summary` : "/app/dashboard");
    } catch { router.push("/app/dashboard"); }
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

  const [refreshingTopic, setRefreshingTopic] = useState(false);
  const refreshTopic = async () => {
    setRefreshingTopic(true);
    try {
      const res = await fetch("/api/lessons/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: profileRef.current.language, agent_id: profileRef.current.agentId }),
      });
      if (res.ok) {
        const data = await res.json();
        setLessonId(data.lesson_id);
        setTopic(data.topic);
        setSignedUrl(data.signed_url);
        setSystemPrompt(data.system_prompt_override);
        setFirstMessage(data.first_message ?? "");
        setPreviousContext(data.previous_context ?? "To pierwsza rozmowa.");
        setAgentSystemPrompt(data.agent_system_prompt ?? "");
      }
    } catch {} finally { setRefreshingTopic(false); }
  };
  const formatTime = (s: number) => {
    if (s < 0) {
      // Overtime: show as +0:01, +0:02, etc.
      const abs = Math.abs(s);
      return `+${Math.floor(abs / 60)}:${(abs % 60).toString().padStart(2, "0")}`;
    }
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  };

  // ---- Word translation ----
  const translateWord = async (word: string, msgId: number, wordIdx: number, fullSentence: string) => {
    const key = `${msgId}-${wordIdx}`;
    // If already translated, just toggle visibility
    if (wordTranslations.has(key)) {
      setWordTranslations((prev) => { const next = new Map(prev); next.delete(key); return next; });
      return;
    }
    // Close all other tooltips before opening a new one
    setWordTranslations(new Map());
    setTranslatingKey(key);
    try {
      const res = await fetch("/api/lessons/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: word.replace(/[.,!?;:"""''()[\]{}]/g, ""),
          context: fullSentence,
          source_language: languageName,
          ui_language: locale,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWordTranslations((prev) => {
          const next = new Map(prev);
          next.set(key, { word, translation: data.translation, note: data.note || "", msgId, wordIdx });
          return next;
        });
      }
    } catch {} finally { setTranslatingKey(null); }
  };

  // ---- RENDER ----

  if (lessonState === "error" && limitError) return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-sm space-y-6 text-center">
        <div className="text-5xl">{limitError.type === "minutes" ? "⏱️" : limitError.type === "daily" ? "🎙️" : "📊"}</div>
        <h1 className="text-xl font-bold">
          {limitError.type === "minutes"
            ? "Wykorzystano limit minut"
            : limitError.type === "daily"
              ? `${t("dailyLimitTitle")} (${limitError.limit} min)`
              : `${t("monthlyLimitTitle")} (${limitError.limit} min)`}
        </h1>
        <p className="text-on-surface-variant">
          {limitError.type === "minutes"
            ? `Wykorzystano ${Math.round(limitError.used)} z ${limitError.limit} minut w tym okresie. Przejdź na wyższy plan, żeby kontynuować naukę.`
            : limitError.type === "daily"
              ? t("comeBackTomorrow")
              : t("wantMoreContact")}
        </p>
        {limitError.type === "minutes" && (
          <button onClick={() => router.push("/app/settings/plans")} className="w-full rounded-xl bg-godoj-blue py-3 text-sm font-bold text-white hover:bg-godoj-blue/90 transition-colors">
            Zobacz plany
          </button>
        )}
        <button onClick={() => router.push("/app/dashboard")} className="w-full rounded-xl border border-white/10 py-2.5 text-sm text-slate-400">{t("dashboard")}</button>
      </div>
    </div>
  );

  if (lessonState === "error") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <span className="material-symbols-outlined text-3xl text-red-400">error</span>
        </div>
        <h1 className="text-xl font-bold">{t("somethingWentWrong")}</h1>
        <p className="text-on-surface-variant">{error}</p>
        <div className="flex gap-3">
          <button onClick={() => router.push("/app/dashboard")} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400">{t("dashboard")}</button>
          <button onClick={loadLessonData} className="flex-1 rounded-xl bg-godoj-blue py-2.5 text-sm font-bold text-white">{t("tryAgain")}</button>
        </div>
      </div>
    </div>
  );

  if (lessonState === "loading") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-on-surface-variant">{t("preparingLesson")}</p>
    </div>
  );

  if (lessonState === "ready") return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-md space-y-4 sm:space-y-6 text-center">
        <div className="sm:hidden"><TutorAvatar agentId={agentId} size={100} /></div>
        <div className="hidden sm:block"><TutorAvatar agentId={agentId} size={160} /></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">{agentName}</h1>
          <p className="mt-1 text-sm sm:text-base text-on-surface-variant">{langCtx.languageName || languageName} · {t("level")} {level}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-surface-container-high p-4 sm:p-6 text-left">
          <div className="text-sm text-on-surface-variant">{t("topicOfDay")}</div>
          <div className="mt-2 text-base sm:text-lg font-bold leading-snug">{topic}</div>
          <button onClick={refreshTopic} disabled={refreshingTopic} className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-colors disabled:opacity-50">
            <RefreshCw className={`h-3 w-3 ${refreshingTopic ? "animate-spin" : ""}`} />
            {t("otherTopic")}
          </button>
        </div>
        <div>
          <div className="mb-2 text-sm text-on-surface-variant text-center">{t("lessonDuration")}</div>
          <div className="flex justify-center gap-2">
            {[5, 10, 15].map((d) => (
              <button key={d} onClick={() => setSelectedDuration(d)}
                className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${(selectedDuration ?? duration) === d ? "bg-godoj-blue text-white shadow-lg shadow-godoj-blue/30" : "border border-white/10 text-on-surface-variant hover:border-primary/50"}`}>
                {d} min
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => {
          if (!micCheckPassed) { setMicCheckOpen(true); return; }
          startConversation();
        }} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-godoj-blue px-6 py-4 text-lg font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
          {t("startConversation")}
        </button>
        <div className="flex items-center justify-center gap-4 pt-2">
          <button onClick={() => router.push("/app/dashboard")} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />{t("backToDashboard")}
          </button>
          <span className="text-slate-700">·</span>
          <button onClick={() => setMicCheckOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-sm">mic</span>
            {t("testMicrophone")}
          </button>
        </div>
      </div>
      {micCheckOpen && <MicCheckModal
        mandatory={!micCheckPassed}
        onClose={() => setMicCheckOpen(false)}
        onSuccess={() => {
          localStorage.setItem("godoj_mic_checked", "1");
          setMicCheckPassed(true);
          setMicCheckOpen(false);
          startConversation();
        }}
      />}
    </div>
  );

  if (lessonState === "connecting") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-on-surface-variant">{t("connectingTo")} {agentName}...</p>
    </div>
  );

  if (lessonState === "ending") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-on-surface-variant">{t("analyzingLesson")}</p>
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
          <button onClick={() => router.push("/app/dashboard")} className="h-9 w-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-white transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div className="hidden sm:block">
            <h2 className="text-sm font-extrabold text-white leading-tight">{topic}</h2>
            <p className="text-[10px] text-on-surface-variant">{agentName} · {langCtx.languageName || languageName}</p>
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
            timeLeft < 0 ? "bg-amber-500/20 text-amber-400" : timeLeft <= 60 ? "bg-orange-500/20 text-orange-400" : "bg-surface-container-high text-slate-400"
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
              <button onClick={() => setEnrichmentWords([])} className="text-slate-600 hover:text-slate-400 ml-1 text-xs">✕</button>
            </div>
          )}

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 pb-48 space-y-6" onClick={() => activeTooltip && setActiveTooltip(null)} onScroll={() => activeTooltip && setActiveTooltip(null)} style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                <TutorAvatar agentId={agentId} size={80} speaking={isSpeaking} />
                <p className="mt-4 text-sm text-slate-500">{isSpeaking ? `${agentName} ${t("speaking")}` : t("conversationStarting")}</p>
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
                    <p className="text-base lg:text-lg font-medium leading-relaxed">
                      {msg.message.split(/(\s+)/).map((token, i) => {
                        if (/^\s+$/.test(token)) return token;
                        const key = `${msg.id}-${i}`;
                        const tr = wordTranslations.get(key);
                        const isLoading = translatingKey === key;
                        return (
                          <span key={i} className="relative inline">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = (e.target as HTMLElement).getBoundingClientRect();
                                setActiveTooltip(prev => prev?.key === key ? null : { key, x: rect.left + rect.width / 2, y: rect.top });
                                translateWord(token, msg.id, i, msg.message);
                              }}
                              className={`cursor-pointer rounded-sm transition-colors hover:bg-primary/20 ${tr ? "bg-primary/15 text-primary" : ""} ${isLoading ? "animate-pulse" : ""}`}
                            >{token}</span>
                          </span>
                        );
                      })}
                    </p>
                  </div>
                  <span className="pl-2 text-[10px] text-slate-600">{new Date(msg.ts).toLocaleTimeString(locale === "pl" ? "pl-PL" : "en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              );

              if (msg.source === "user") return (
                <div key={msg.id} className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-2 pr-2">
                    <div className="w-1 h-1 rounded-full bg-godoj-blue" />
                    <span className="text-[10px] font-bold text-godoj-blue tracking-widest uppercase">{t("you")}</span>
                  </div>
                  <div className="max-w-lg rounded-[1.5rem] rounded-tr-none bg-godoj-blue px-5 py-4 shadow-[0_10px_30px_rgba(26,115,232,0.2)]">
                    <p className="text-base lg:text-lg font-semibold leading-relaxed text-white">{msg.message}</p>
                  </div>
                  <span className="pr-2 text-[10px] text-slate-600">{new Date(msg.ts).toLocaleTimeString(locale === "pl" ? "pl-PL" : "en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              );

              if (msg.source === "hint" && msg.hints) return (
                <div key={msg.id} className="w-full max-w-2xl mx-auto">
                  <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-5 rounded-3xl shadow-2xl">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-sm text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                      <span className="text-xs font-bold text-tertiary tracking-wider uppercase">{t("hints")}</span>
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

          {/* Fixed tooltip for word translations — rendered outside scroll container to avoid clipping */}
          {activeTooltip && wordTranslations.get(activeTooltip.key) && (
            <span
              className="fixed z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-white/10 px-2.5 py-1.5 shadow-xl pointer-events-none"
              style={{ left: activeTooltip.x, top: activeTooltip.y - 8, transform: "translate(-50%, -100%)" }}
            >
              <span className="text-xs font-bold text-primary">{wordTranslations.get(activeTooltip.key)!.translation}</span>
              {wordTranslations.get(activeTooltip.key)!.note && <span className="text-[10px] text-slate-400 ml-1.5">{wordTranslations.get(activeTooltip.key)!.note}</span>}
            </span>
          )}

          {/* Bottom controls — floating */}
          <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center pb-6 pointer-events-none">
            {/* SOS + Mic + End */}
            <div className="flex items-end gap-6 pointer-events-auto">
              {/* SOS */}
              <button onClick={handleHintToggle} className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${hintsEnabled ? "bg-tertiary/10 text-tertiary border border-tertiary/20" : "bg-surface-container-high text-slate-500 border border-white/5"}`} title={hintsEnabled ? t("disableHints") : t("enableHints")}>
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: hintsEnabled ? "'FILL' 1" : undefined }}>lightbulb</span>
                <span className="hidden sm:inline">{hintsEnabled ? t("hintsOn") : t("hintsOff")}</span>
              </button>

              {/* Pause */}
              <button
                onClick={() => isPaused ? resumeLesson() : pauseLesson("manual")}
                className={`h-12 w-12 rounded-full flex items-center justify-center border transition-all ${
                  isPaused ? "bg-primary/20 text-primary border-primary/30 animate-pulse" : "bg-surface-container-high text-slate-400 border-white/5 hover:text-white"
                }`}
                title={isPaused ? (locale === "pl" ? "Wznów" : "Resume") : (locale === "pl" ? "Pauza" : "Pause")}
              >
                <span className="material-symbols-outlined text-lg">{isPaused ? "play_arrow" : "pause"}</span>
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
                    {isPaused ? (locale === "pl" ? "PAUZA" : "PAUSED") : isSpeaking ? `${agentName} ${t("speaking")}` : hintsLoading ? t("searchingHints") : t("listening")}
                  </p>
                </div>
              </div>

              {/* Send Now — force end-of-turn */}
              {!isSpeaking && conversation.status === "connected" && (
                <button
                  onClick={() => {
                    try { conversation.sendUserMessage("..."); } catch {}
                  }}
                  className="h-12 w-12 rounded-full bg-godoj-blue/20 flex items-center justify-center text-godoj-blue hover:bg-godoj-blue/30 border border-godoj-blue/20 transition-all"
                  title={t("sendNow")}
                  style={{ marginBottom: "max(0px, env(safe-area-inset-bottom))" }}
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              )}

              {/* End */}
              <button onClick={handleEndLesson} className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 border border-white/5 transition-all" title={t("endCall")}>
                <span className="material-symbols-outlined">call_end</span>
              </button>
            </div>
          </div>

          {/* Pause overlay */}
          {isPaused && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-center space-y-4 p-8 max-w-sm">
                <div className="mx-auto h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-primary">pause</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  {pauseReason === "limit"
                    ? (locale === "pl" ? "Limit minut wyczerpany" : "Plan minutes exhausted")
                    : (locale === "pl" ? "Lekcja wstrzymana" : "Lesson paused")
                  }
                </h3>
                {pauseReason === "limit" && (
                  <div className="space-y-2">
                    <p className="text-sm text-on-surface-variant">
                      {locale === "pl" ? "Kup pakiet minut lub zmień plan, żeby kontynuować naukę." : "Buy more minutes or upgrade your plan to continue."}
                    </p>
                    <a
                      href="/app/settings/plans"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary/90 transition-all"
                    >
                      {locale === "pl" ? "Zobacz plany" : "See plans"}
                    </a>
                  </div>
                )}
                <button
                  onClick={resumeLesson}
                  className={`rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                    pauseReason === "limit" ? "bg-white/10 text-white hover:bg-white/20 border border-white/10" : "bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  {locale === "pl" ? "Wznów lekcję" : "Resume lesson"}
                </button>
              </div>
            </div>
          )}

          {/* Trial/plan limit countdown overlay */}
          {autoEndCountdown !== null && autoEndCountdown > 0 && trialWarningShown && (
            <div className="absolute top-16 left-0 right-0 z-40 flex justify-center pointer-events-none">
              <div className="bg-amber-500/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-xl text-center pointer-events-auto">
                <p className="text-sm font-bold">
                  {timeLeft > 0
                    ? `${locale === "pl" ? "Twój limit minut kończy się za" : "Your plan minutes end in"} ${autoEndCountdown}s`
                    : `${locale === "pl" ? "Bonus od nas! Lekcja kończy się za" : "Bonus time! Lesson ends in"} ${autoEndCountdown}s`
                  }
                </p>
                <p className="text-xs text-white/80 mt-0.5">
                  {locale === "pl" ? "Dokończ swoją myśl — nie spiesz się" : "Finish your thought — no rush"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
