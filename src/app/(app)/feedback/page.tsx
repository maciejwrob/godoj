"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useConversation } from "@11labs/react";
import { Loader2, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

const FEEDBACK_AGENT_ID = "agent_9401kmmgjzt3ey5bs3ms27ecjw9e";
const GOODBYE_PATTERNS = /dzięk|do widzenia|miłej nauki|bye|thank|goodbye|powodzenia/i;
const MAX_DURATION_S = 120; // 2 minutes

function cleanCaption(text: string): string {
  return text.replace(/\[.*?\]\s*/g, "").trim();
}

function FeedbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const lessonId = params.get("lesson_id") ?? "";
  const { languageName, level } = useLanguage();
  const autoEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<"loading" | "ready" | "connecting" | "active" | "ending">("loading");
  const [timeLeft, setTimeLeft] = useState(MAX_DURATION_S);
  const [messages, setMessages] = useState<{ source: string; text: string }[]>([]);
  const [error, setError] = useState("");

  const transcriptRef = useRef<{ source: string; text: string }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Get signed URL
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${FEEDBACK_AGENT_ID}`, {
          headers: { "xi-api-key": "" }, // Will use server-side
        });
        // Use our own API to get signed URL
        const apiRes = await fetch("/api/feedback/signed-url");
        if (apiRes.ok) {
          setState("ready");
        } else {
          setState("ready"); // Still allow — will get signed URL on start
        }
      } catch {
        setState("ready");
      }
    }
    init();
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      setState("active");
      setTimeLeft(MAX_DURATION_S);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onDisconnect: () => {
      if (state === "active") handleEnd();
    },
    onMessage: ({ message, source }) => {
      const clean = cleanCaption(message);
      if (!clean) return;
      const entry = { source, text: clean };
      transcriptRef.current = [...transcriptRef.current, entry];
      setMessages([...transcriptRef.current]);

      // Auto-end if agent says goodbye
      if (source === "ai" && GOODBYE_PATTERNS.test(clean)) {
        if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
        autoEndTimerRef.current = setTimeout(() => handleEnd(), 5000);
      }
    },
    onError: (msg: string) => { setError(msg); },
  });

  const startConversation = async () => {
    setState("connecting");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from our API
      const res = await fetch("/api/feedback/signed-url");
      if (!res.ok) throw new Error("Could not get signed URL");
      const { signed_url } = await res.json();

      // Get user name
      const profileRes = await fetch("/api/user/profile");
      const profile = profileRes.ok ? await profileRes.json() : {};
      const userName = profile.display_name ?? profile.user_name ?? "User";

      await conversation.startSession({
        signedUrl: signed_url,
        dynamicVariables: {
          user_name: userName,
          language_name: languageName,
          user_level: level,
        },
      });
    } catch (err) {
      setError("Nie udało się połączyć. Sprawdź mikrofon.");
      setState("ready");
    }
  };

  const handleEnd = useCallback(async () => {
    if (state === "ending") return;
    setState("ending");
    if (timerRef.current) clearInterval(timerRef.current);
    try { await conversation.endSession(); } catch {}

    const transcript = transcriptRef.current
      .map((t) => `${t.source === "ai" ? "Maciej" : "User"}: ${t.text}`)
      .join("\n");

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lessonId, transcript }),
      });
    } catch {}

    // Redirect back to lesson summary
    if (lessonId) {
      router.push(`/lesson/${lessonId}/summary`);
    } else {
      router.push("/dashboard");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, lessonId, router]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const isSpeaking = conversation.isSpeaking;

  if (state === "loading") return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (state === "ready") return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
      <div className="max-w-sm space-y-6 text-center">
        <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-primary/30 bg-surface-container-high flex items-center justify-center">
          <img src="/avatars/maciej.png" alt="Maciej" className="w-full h-full object-cover object-top rounded-full" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Maciej</h1>
          <p className="text-on-surface-variant">Twórca Godoj.co</p>
        </div>
        <p className="text-sm text-on-surface-variant">
          Opowiedz mi jak Ci się podoba godoj.co! Co działa dobrze? Co mógłbym poprawić? Rozmowa potrwa max 2 minuty.
        </p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button onClick={startConversation} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-godoj-blue px-6 py-4 font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
          Rozpocznij feedback
        </button>
        <button onClick={() => lessonId ? router.push(`/lesson/${lessonId}/summary`) : router.push("/dashboard")} className="text-sm text-slate-500 hover:text-white">
          Pomiń
        </button>
      </div>
    </div>
  );

  if (state === "connecting") return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-3 text-on-surface-variant">Łączę...</p>
    </div>
  );

  if (state === "ending") return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-3 text-on-surface-variant">Zapisuje feedback...</p>
    </div>
  );

  // Active
  return (
    <div className="flex h-screen flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-surface-container-high flex items-center justify-center">
            <img src="/avatars/maciej.png" alt="Maciej" className="w-full h-full object-cover object-top rounded-full" />
          </div>
          <div>
            <span className="text-sm font-bold text-white">Maciej · Feedback</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`rounded-full px-3 py-1 text-sm font-mono font-bold ${timeLeft <= 30 ? "bg-red-500/20 text-red-400" : "bg-surface-container-high text-slate-400"}`}>
            {formatTime(timeLeft)}
          </div>
          <button onClick={handleEnd} className="text-slate-500 hover:text-red-400"><X className="h-5 w-5" /></button>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <span className="material-symbols-outlined text-4xl text-primary">mic</span>
            <p className="mt-2 text-sm text-slate-500">{isSpeaking ? "Maciej mówi..." : "Słucham..."}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.source === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
              msg.source === "user" ? "bg-godoj-blue text-white rounded-tr-none" : "bg-surface-container border border-white/5 rounded-tl-none"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-6 py-6 border-t border-white/5">
        {/* Mic indicator */}
        <div className="relative">
          {!isSpeaking && <div className="absolute -inset-2 bg-primary/20 blur-xl rounded-full animate-pulse" />}
          <div className={`relative h-16 w-16 rounded-full flex items-center justify-center ${isSpeaking ? "bg-surface-container-high" : "bg-primary"}`}>
            <span className="material-symbols-outlined text-2xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>{isSpeaking ? "volume_up" : "mic"}</span>
          </div>
        </div>
        {/* End button — red phone */}
        <button onClick={handleEnd} className="h-14 w-14 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/30 border border-red-500/20 transition-all" title="Zakończ">
          <span className="material-symbols-outlined text-2xl">call_end</span>
        </button>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-surface"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><FeedbackContent /></Suspense>;
}
