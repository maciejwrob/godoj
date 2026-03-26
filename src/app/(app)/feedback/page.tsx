"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useConversation } from "@11labs/react";
import { Loader2, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

const FEEDBACK_AGENT_ID = "agent_9401kmmgjzt3ey5bs3ms27ecjw9e";
const GOODBYE_PATTERNS = /dzięk|do widzenia|miłej nauki|bye|thank|goodbye|powodzenia/i;
const MAX_DURATION_S = 120; // 2 minutes

function cleanCaption(text: string): string {
  return text.replace(/\[.*?\]\s*/g, "").trim();
}

type ChatMessage = { id: number; source: "user" | "ai"; text: string; ts: number };
let msgIdCounter = 0;

function FeedbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const lessonId = params.get("lesson_id") ?? "";
  const { languageName, level } = useLanguage();
  const autoEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<"loading" | "ready" | "connecting" | "active" | "ending">("loading");
  const [timeLeft, setTimeLeft] = useState(MAX_DURATION_S);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");

  const transcriptRef = useRef<{ source: string; text: string }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const addChatMessage = (source: "user" | "ai", text: string) => {
    setMessages((prev) => [...prev, { id: ++msgIdCounter, source, text, ts: Date.now() }]);
  };

  // Get signed URL
  useEffect(() => {
    async function init() {
      try {
        const apiRes = await fetch("/api/feedback/signed-url");
        if (apiRes.ok) setState("ready");
        else setState("ready");
      } catch { setState("ready"); }
    }
    init();
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      setState("active");
      setTimeLeft(MAX_DURATION_S);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { handleEnd(); return 0; }
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
      transcriptRef.current = [...transcriptRef.current, { source, text: clean }];
      addChatMessage(source as "user" | "ai", clean);

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
      const res = await fetch("/api/feedback/signed-url");
      if (!res.ok) throw new Error("Could not get signed URL");
      const { signed_url } = await res.json();

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
    } catch {
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

    if (lessonId) router.push(`/lesson/${lessonId}/summary`);
    else router.push("/dashboard");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, lessonId, router]);

  const goBack = () => lessonId ? router.push(`/lesson/${lessonId}/summary`) : router.push("/dashboard");
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const isSpeaking = conversation.isSpeaking;

  // ---- LOADING ----
  if (state === "loading") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  // ---- READY ----
  if (state === "ready") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto h-40 w-40 overflow-hidden rounded-full border-4 border-primary/20 shadow-[0_0_60px_rgba(26,115,232,0.15)]">
          <img src="/avatars/maciej.png" alt="Maciej" className="w-full h-full object-cover object-top" />
        </div>
        <div className="mt-2">
          <h1 className="text-3xl font-extrabold text-white">Maciej</h1>
          <p className="mt-1 text-on-surface-variant">Twórca Godoj.co</p>
        </div>
        <p className="text-sm text-on-surface-variant">
          Opowiedz mi jak Ci się podoba Godoj.co! Co działa dobrze? Co mógłbym poprawić? Rozmowa potrwa max 2 minuty.
        </p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button onClick={startConversation} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-godoj-blue px-6 py-4 text-lg font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
          Rozpocznij feedback
        </button>
        <button onClick={goBack} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />Pomiń
        </button>
      </div>
    </div>
  );

  // ---- CONNECTING ----
  if (state === "connecting") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-on-surface-variant">Łączę z Maciejem...</p>
    </div>
  );

  // ---- ENDING ----
  if (state === "ending") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-on-surface-variant">Zapisuję feedback...</p>
    </div>
  );

  // ---- ACTIVE ----
  return (
    <div className="flex h-screen flex-col bg-[#0F172A] overflow-hidden">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between px-4 lg:px-8 bg-surface/50 backdrop-blur-md border-b border-white/5 z-20">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="h-9 w-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-white transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div className="hidden sm:block">
            <h2 className="text-sm font-extrabold text-white leading-tight">Feedback</h2>
            <p className="text-[10px] text-on-surface-variant">Maciej · Twórca Godoj.co</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`rounded-full px-3 py-1 text-xs font-mono font-bold ${
            timeLeft <= 30 ? "bg-red-500/20 text-red-400" : "bg-surface-container-high text-slate-400"
          }`}>{formatTime(timeLeft)}</div>
        </div>
      </header>

      {/* Main content: avatar + chat */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Avatar — left panel (desktop only) */}
        <div className="hidden lg:flex w-1/3 items-end justify-center p-8 relative">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10 flex items-end justify-center h-full w-full">
            <div className={`relative transition-transform ${isSpeaking ? "scale-105" : "scale-100"}`}>
              <div className={`h-60 w-60 overflow-hidden rounded-full border-4 shadow-2xl transition-all duration-500 ${
                isSpeaking ? "border-primary/60 shadow-primary/20" : "border-white/10 shadow-black/20"
              }`}>
                <img src="/avatars/maciej.png" alt="Maciej" className="w-full h-full object-cover object-top" />
              </div>
              {isSpeaking && (
                <div className="absolute -inset-4 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: "2s" }} />
              )}
            </div>
          </div>
        </div>

        {/* Chat + bottom controls */}
        <div className="flex-1 flex flex-col relative">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 pb-48 space-y-6" style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white/10">
                  <img src="/avatars/maciej.png" alt="Maciej" className="w-full h-full object-cover object-top" />
                </div>
                <p className="mt-4 text-sm text-slate-500">{isSpeaking ? "Maciej mówi..." : "Rozmowa zaraz się zacznie..."}</p>
              </div>
            )}

            {messages.map((msg) => {
              if (msg.source === "ai") return (
                <div key={msg.id} className="flex flex-col items-start gap-1.5">
                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Maciej</span>
                    <div className="w-1 h-1 rounded-full bg-primary" />
                  </div>
                  <div className="max-w-lg rounded-[1.5rem] rounded-tl-none bg-surface-container border border-white/5 px-5 py-4 shadow-xl">
                    <p className="text-base lg:text-lg font-medium leading-relaxed">{msg.text}</p>
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
                    <p className="text-base lg:text-lg font-semibold leading-relaxed text-white">{msg.text}</p>
                  </div>
                  <span className="pr-2 text-[10px] text-slate-600">{new Date(msg.ts).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              );

              return null;
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Bottom controls — floating */}
          <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center pb-6 pointer-events-none">
            <div className="flex items-end gap-6 pointer-events-auto">
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
                    {isSpeaking ? "Maciej mówi..." : "Słucham..."}
                  </p>
                </div>
              </div>

              {/* End button */}
              <button onClick={handleEnd} className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 border border-white/5 transition-all" title="Zakończ">
                <span className="material-symbols-outlined">call_end</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-surface"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><FeedbackContent /></Suspense>;
}
