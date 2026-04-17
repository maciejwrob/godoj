"use client";

import { useEffect, useRef, useState } from "react";
import { X, Mic, Check, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type Status = "idle" | "testing" | "denied" | "notfound" | "error";

const BAR_COUNT = 20;
// Level at which we're confident the mic is actually hearing the user
const HEARD_THRESHOLD = 0.08;
// How long to keep "heard" state once triggered, so it doesn't flicker off between syllables
const HEARD_HOLD_MS = 600;

export function MicCheckModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>("idle");
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastHeardAtRef = useRef<number>(0);

  // Release audio resources on unmount; parent controls lifetime via conditional mount
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  const startTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.fftSize);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buffer);
        // RMS over the waveform, normalized around 128 (silence)
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        // Scale up a bit so normal speech fills the meter
        const scaled = Math.min(1, rms * 3);
        setLevel(scaled);

        const now = Date.now();
        if (scaled >= HEARD_THRESHOLD) lastHeardAtRef.current = now;
        setHeard(now - lastHeardAtRef.current < HEARD_HOLD_MS);

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      setStatus("testing");
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "SecurityError") setStatus("denied");
        else if (err.name === "NotFoundError" || err.name === "OverconstrainedError") setStatus("notfound");
        else setStatus("error");
      } else {
        setStatus("error");
      }
    }
  };

  const activeBars = Math.round(level * BAR_COUNT);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/5 bg-surface-container p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-white">{t("micCheckTitle")}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {status === "idle" && (
          <div className="space-y-5 text-center">
            <p className="text-sm text-on-surface-variant">{t("micCheckIntro")}</p>
            <button onClick={startTest} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary/90">
              <Mic className="h-4 w-4" />
              {t("enableMicrophone")}
            </button>
          </div>
        )}

        {status === "testing" && (
          <div className="space-y-5">
            <p className="text-center text-sm text-on-surface-variant">
              {heard ? t("micWorking") : t("micCheckSaySomething")}
            </p>

            <div className="flex items-end justify-center gap-1 h-24">
              {Array.from({ length: BAR_COUNT }).map((_, i) => {
                const filled = i < activeBars;
                const heightPct = 20 + (i / BAR_COUNT) * 80;
                return (
                  <div
                    key={i}
                    className={`w-2 rounded-full transition-colors ${filled ? (heard ? "bg-green-400" : "bg-primary") : "bg-white/10"}`}
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              {heard ? (
                <span className="inline-flex items-center gap-1.5 text-green-400"><Check className="h-4 w-4" /> {t("micWorking")}</span>
              ) : (
                <span className="text-slate-500">{t("micNoSound")}</span>
              )}
            </div>

            <button onClick={onClose} className="w-full rounded-xl border border-white/10 py-2.5 text-sm font-bold text-white hover:bg-white/5">
              {t("close")}
            </button>
          </div>
        )}

        {(status === "denied" || status === "notfound" || status === "error") && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <p className="text-sm text-on-surface-variant">
              {status === "denied" && t("micPermissionDenied")}
              {status === "notfound" && t("micNotFound")}
              {status === "error" && t("micGenericError")}
            </p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-bold text-white hover:bg-white/5">
                {t("close")}
              </button>
              <button onClick={() => { setStatus("idle"); startTest(); }} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary/90">
                {t("tryAgain")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
