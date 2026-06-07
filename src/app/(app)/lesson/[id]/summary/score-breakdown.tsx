"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type ScoreEntry = { score: number; comment: string };

const DIMENSION_ICONS: Record<string, string> = {
  grammar: "📝",
  vocabulary: "📚",
  fluency: "🗣️",
  comprehension: "👂",
  courage: "💪",
};

const DIMENSION_ORDER = ["grammar", "vocabulary", "fluency", "comprehension", "courage"] as const;

function ScoreBar({ score }: { score: number }) {
  const percent = (score / 5) * 100;
  // Color gradient: red -> amber -> green
  const color =
    score >= 4 ? "bg-green-500" : score >= 3 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="h-2 w-full rounded-full bg-white/5">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default function ScoreBreakdown({
  breakdown,
  labels,
  showLabel,
  hideLabel,
}: {
  breakdown: Record<string, ScoreEntry>;
  labels: Record<string, string>;
  showLabel: string;
  hideLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="mx-auto flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        {open ? hideLabel : showLabel}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {DIMENSION_ORDER.map((key) => {
            const entry = breakdown[key];
            if (!entry) return null;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                    <span>{DIMENSION_ICONS[key]}</span>
                    {labels[key] ?? key}
                  </span>
                  <span className="text-sm font-bold text-text-primary">
                    {entry.score.toFixed(1)}
                  </span>
                </div>
                <ScoreBar score={entry.score} />
                <p className="mt-1 text-xs text-text-secondary">
                  {entry.comment}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
