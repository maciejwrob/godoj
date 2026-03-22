"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";

export default function PronunciationButton({
  text,
  language,
}: {
  text: string;
  language: string;
}) {
  const [loading, setLoading] = useState(false);

  const play = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={play}
      disabled={loading}
      className="rounded-lg p-2 text-text-secondary hover:text-primary"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4" />
      )}
    </button>
  );
}
