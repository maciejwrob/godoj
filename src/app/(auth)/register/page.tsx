"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UserPlus, Mail, AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Status = "loading" | "invalid" | "form" | "submitting" | "success";

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg-dark px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    }>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<Status>("loading");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const supabase = createClient();
    supabase
      .from("invitations")
      .select("id, used_at, expires_at")
      .eq("token", token)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setStatus("invalid");
          return;
        }
        // Already used
        if (data.used_at) {
          setStatus("invalid");
          return;
        }
        // Expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setStatus("invalid");
          return;
        }
        setStatus("form");
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("submitting");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, display_name: displayName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Coś poszło nie tak");
        setStatus("form");
        return;
      }

      setStatus("success");
    } catch {
      setError("Nie udało się połączyć z serwerem");
      setStatus("form");
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg-dark px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  // Invalid / expired token
  if (status === "invalid") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg-dark px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            Nieprawidłowy link
          </h1>
          <p className="text-text-secondary">
            To zaproszenie wygasło lub zostało już użyte
          </p>
        </div>
      </main>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg-dark px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            Sprawdź swoją skrzynkę email
          </h1>
          <p className="text-text-secondary">
            Sprawdź swoją skrzynkę email — wysłaliśmy link do logowania
          </p>
        </div>
      </main>
    );
  }

  // Registration form
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-dark px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            Utwórz konto
          </h1>
          <p className="text-text-secondary">
            Podaj swoje imię, aby dołączyć do Godoj
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="display_name"
              className="mb-1.5 block text-sm font-medium text-text-secondary"
            >
              Twoje imię
            </label>
            <input
              id="display_name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="np. Anna"
              required
              minLength={2}
              maxLength={50}
              className="w-full rounded-lg border border-border bg-bg-card px-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "submitting" || displayName.trim().length < 2}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {status === "submitting" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                Utwórz konto
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
