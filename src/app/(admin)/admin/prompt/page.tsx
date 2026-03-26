"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const AVAILABLE_VARS = [
  "{{agent_name}}", "{{language_name}}", "{{user_name}}", "{{user_level}}",
  "{{native_language}}", "{{lesson_topic}}", "{{lesson_duration}}",
  "{{previous_context}}", "{{first_message}}",
];

export default function AdminPromptPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/prompt")
      .then((r) => r.json())
      .then((d) => { if (d.prompt) setPrompt(d.prompt); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) setSaved(true);
    } catch {}
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = async () => {
    const res = await fetch("/api/admin/prompt?default=true");
    const d = await res.json();
    if (d.prompt) setPrompt(d.prompt);
  };

  if (loading) return <div className="p-8 text-text-secondary">Ladowanie...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">System Prompt Agenta</h1>
        <div className="flex gap-2">
          <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
            Przywroc domyslny
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saved ? "Zapisano!" : "Zapisz"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-bg-card p-4">
        <p className="mb-3 text-sm text-text-secondary">Dostepne zmienne (automatycznie wypelniane):</p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_VARS.map((v) => (
            <code key={v} className="rounded bg-bg-card-hover px-2 py-1 text-xs text-primary">{v}</code>
          ))}
        </div>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full h-[500px] rounded-xl border border-border bg-bg-card p-4 text-sm text-text-primary font-mono resize-y focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="System prompt..."
      />
    </div>
  );
}
