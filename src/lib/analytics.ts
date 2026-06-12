"use client";

// Lightweight product analytics — performance-first by design:
// * track() only pushes to an in-memory queue (sub-millisecond, never blocks UI)
// * batches flush in the background every 5s or at 20 events via keepalive fetch
// * pagehide/visibility-hidden flushes via sendBeacon (survives navigation/close)
// * fire-and-forget: failures are silently dropped, never surface to the user

type EventProps = Record<string, unknown>;
type QueuedEvent = { event: string; properties: EventProps; path: string; client_ts: number };

const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH = 20;

const queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;

function flush(useBeacon = false) {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  const body = JSON.stringify({ events: batch });
  try {
    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      return;
    }
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

function bindLifecycleFlush() {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  window.addEventListener("pagehide", () => flush(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
}

export function track(event: string, properties?: EventProps) {
  if (typeof window === "undefined") return;
  bindLifecycleFlush();
  queue.push({
    event,
    properties: properties ?? {},
    path: window.location.pathname,
    client_ts: Date.now(),
  });
  if (queue.length >= MAX_BATCH) {
    if (timer) { clearTimeout(timer); timer = null; }
    flush();
    return;
  }
  if (!timer) {
    timer = setTimeout(() => { timer = null; flush(); }, FLUSH_INTERVAL_MS);
  }
}
