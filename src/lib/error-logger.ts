// Fire-and-forget error logging to /api/errors/log
export function logError(
  page: string,
  errorMessage: string,
  context?: Record<string, unknown>
) {
  fetch("/api/errors/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      page,
      error_message: errorMessage,
      error_context: context ?? {},
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    }),
  }).catch(() => {});
}
