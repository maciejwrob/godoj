"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";

interface AppEvent {
  id: number;
  user_id: string;
  display_name: string | null;
  event: string;
  properties: Record<string, unknown>;
  path: string | null;
  created_at: string;
}

interface LoginEvent {
  id: string;
  user_id: string;
  display_name: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [logins, setLogins] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [tab, setTab] = useState<"events" | "logins">("events");

  const fetchData = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (userFilter.trim()) qs.set("user_id", userFilter.trim());
    if (eventFilter.trim()) qs.set("event", eventFilter.trim());
    fetch(`/api/admin/user-events?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events ?? []);
        setLogins(data.logins ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userFilter, eventFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // Multi-account signal: same IP used by 2+ users
  const ipUsers = logins.reduce<Record<string, Set<string>>>((acc, l) => {
    if (!l.ip) return acc;
    (acc[l.ip] ??= new Set()).add(l.user_id);
    return acc;
  }, {});
  const sharedIps = Object.entries(ipUsers).filter(([, set]) => set.size > 1);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Aktywność użytkowników</h1>
        <button onClick={fetchData} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary">
          <RefreshCw size={14} />Odśwież
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          placeholder="Filtruj po user_id (UUID)"
          className="w-80 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50"
        />
        <input
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          placeholder="Filtruj po evencie (np. lesson_ended)"
          className="w-72 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50"
        />
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => setTab("events")} className={`px-4 py-2 text-sm ${tab === "events" ? "bg-primary/15 text-primary" : "text-text-secondary"}`}>Eventy ({events.length})</button>
          <button onClick={() => setTab("logins")} className={`px-4 py-2 text-sm ${tab === "logins" ? "bg-primary/15 text-primary" : "text-text-secondary"}`}>Logowania / IP ({logins.length})</button>
        </div>
      </div>

      {sharedIps.length > 0 && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-300">
          ⚠️ Współdzielone IP (możliwe multikonta): {sharedIps.map(([ip, set]) => `${ip} (${set.size} kont)`).join(", ")}
        </div>
      )}

      {loading ? (
        <p className="text-text-secondary">Ładowanie…</p>
      ) : tab === "events" ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-bg-card text-left text-text-secondary">
              <tr>
                <th className="px-3 py-2">Czas</th>
                <th className="px-3 py-2">Użytkownik</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Ścieżka</th>
                <th className="px-3 py-2">Szczegóły</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-border/50 hover:bg-bg-card/50">
                  <td className="whitespace-nowrap px-3 py-2 text-text-secondary">{fmt(e.created_at)}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => setUserFilter(e.user_id)} className="text-primary hover:underline">
                      {e.display_name ?? e.user_id.slice(0, 8)}
                    </button>
                  </td>
                  <td className="px-3 py-2 font-medium text-text-primary">{e.event}</td>
                  <td className="px-3 py-2 text-text-secondary">{e.path}</td>
                  <td className="px-3 py-2">
                    {Object.keys(e.properties ?? {}).length > 0 && (
                      <button onClick={() => setExpanded(expanded === e.id ? null : e.id)} className="text-xs text-primary hover:underline">
                        {expanded === e.id ? "ukryj" : "pokaż"}
                      </button>
                    )}
                    {expanded === e.id && (
                      <pre className="mt-1 max-w-md overflow-x-auto rounded bg-bg-card p-2 text-[11px] text-text-secondary">{JSON.stringify(e.properties, null, 2)}</pre>
                    )}
                  </td>
                </tr>
              ))}
              {events.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-text-secondary">Brak eventów</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-bg-card text-left text-text-secondary">
              <tr>
                <th className="px-3 py-2">Czas</th>
                <th className="px-3 py-2">Użytkownik</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">Lokalizacja</th>
                <th className="px-3 py-2">Urządzenie</th>
              </tr>
            </thead>
            <tbody>
              {logins.map((l) => (
                <tr key={l.id} className="border-t border-border/50 hover:bg-bg-card/50">
                  <td className="whitespace-nowrap px-3 py-2 text-text-secondary">{fmt(l.created_at)}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => setUserFilter(l.user_id)} className="text-primary hover:underline">
                      {l.display_name ?? l.user_id.slice(0, 8)}
                    </button>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{l.ip ?? "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">{[l.city, l.country].filter(Boolean).join(", ") || "—"}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-xs text-text-secondary">{l.user_agent ?? "—"}</td>
                </tr>
              ))}
              {logins.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-text-secondary">Brak logowań</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
