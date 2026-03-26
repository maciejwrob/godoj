"use client";

import { useEffect, useState } from "react";

type Feedback = {
  id: string;
  user_id: string;
  lesson_id: string | null;
  transcript: string;
  summary: string;
  created_at: string;
  user_name?: string;
  language?: string;
  level?: string;
};

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/feedback")
      .then((r) => r.json())
      .then((data) => setFeedbacks(data.feedbacks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(feedbacks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `godoj-feedback-${new Date().toISOString().split("T")[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8 text-text-secondary">Ladowanie...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Feedback</h1>
        <button onClick={exportAll} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">
          Eksportuj JSON
        </button>
      </div>

      {feedbacks.length === 0 ? (
        <p className="text-text-secondary">Brak feedbackow.</p>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="rounded-xl border border-border bg-bg-card p-5">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === fb.id ? null : fb.id)}>
                <div>
                  <p className="font-bold text-text-primary">{fb.user_name ?? "Uzytkownik"}</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(fb.created_at).toLocaleDateString("pl-PL")} · {fb.language ?? "?"} · {fb.level ?? "?"}
                  </p>
                </div>
                <span className="material-symbols-outlined text-text-secondary">{expanded === fb.id ? "expand_less" : "expand_more"}</span>
              </div>
              {fb.summary && <p className="mt-2 text-sm text-text-secondary">{fb.summary}</p>}
              {expanded === fb.id && fb.transcript && (
                <pre className="mt-4 p-4 bg-bg-card-hover rounded-lg text-xs text-text-secondary whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {fb.transcript}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
