"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

interface ErrorLog {
  id: string;
  user_id: string | null;
  email: string | null;
  page: string;
  error_message: string;
  error_context: Record<string, unknown>;
  user_agent: string | null;
  created_at: string;
}

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchErrors = () => {
    setLoading(true);
    fetch("/api/admin/errors")
      .then((res) => res.json())
      .then((data) => setErrors(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchErrors(); }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const isMobile = (ua: string | null) =>
    ua ? /mobile|android|iphone|ipad/i.test(ua) : false;

  // Group errors by page for quick stats
  const pageStats = errors.reduce<Record<string, number>>((acc, e) => {
    acc[e.page] = (acc[e.page] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Error Log</h1>
        <button onClick={fetchErrors} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary">
          <RefreshCw size={14} />Odśwież
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border border-border bg-bg-card px-4 py-3">
          <p className="text-xs text-text-secondary">Łącznie</p>
          <p className="text-2xl font-bold text-text-primary">{errors.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card px-4 py-3">
          <p className="text-xs text-text-secondary">Ostatnie 24h</p>
          <p className="text-2xl font-bold text-text-primary">
            {errors.filter((e) => Date.now() - new Date(e.created_at).getTime() < 86400000).length}
          </p>
        </div>
        {Object.entries(pageStats).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([page, count]) => (
          <div key={page} className="rounded-xl border border-border bg-bg-card px-4 py-3">
            <p className="text-xs text-text-secondary">{page}</p>
            <p className="text-2xl font-bold text-red-400">{count}</p>
          </div>
        ))}
      </div>

      {/* Error list */}
      <div className="space-y-2">
        {loading ? (
          <p className="text-text-secondary text-sm">Ładowanie...</p>
        ) : errors.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg-card p-8 text-center text-text-secondary">
            Brak błędów. Wszystko działa!
          </div>
        ) : (
          errors.map((err) => (
            <div key={err.id} className="rounded-xl border border-border bg-bg-card overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === err.id ? null : err.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-card-hover transition-colors"
              >
                <div className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-bold text-red-400">{err.page}</span>
                    <span className="text-text-secondary">·</span>
                    <span className="text-text-secondary truncate">{err.error_message}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-text-secondary">
                    <span>{formatDate(err.created_at)}</span>
                    {err.email && <><span>·</span><span>{err.email}</span></>}
                    {isMobile(err.user_agent) && <span className="rounded bg-yellow-900/40 text-yellow-400 px-1.5 py-0.5 text-[10px]">Mobile</span>}
                  </div>
                </div>
              </button>
              {expanded === err.id && (
                <div className="px-4 pb-3 pt-0 space-y-2 border-t border-border">
                  <div className="text-xs">
                    <span className="text-text-secondary">Message: </span>
                    <span className="text-text-primary">{err.error_message}</span>
                  </div>
                  {Object.keys(err.error_context).length > 0 && (
                    <pre className="text-xs bg-bg-dark rounded-lg p-3 overflow-x-auto text-text-secondary">
                      {JSON.stringify(err.error_context, null, 2)}
                    </pre>
                  )}
                  {err.user_agent && (
                    <div className="text-[10px] text-text-secondary truncate">UA: {err.user_agent}</div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
