"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setError("Nie udało się wysłać linku. Spróbuj ponownie.");
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <Mail className="mx-auto h-12 w-12 text-primary" />
          <h1 className="text-2xl font-bold">Sprawdź skrzynkę</h1>
          <p className="text-text-secondary">
            Wysłaliśmy link do logowania na <strong>{email}</strong>
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-sm text-primary hover:underline"
          >
            Użyj innego adresu e-mail
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Witaj w Godoj</h1>
          <p className="mt-2 text-text-secondary">
            Podaj swój e-mail, aby się zalogować
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="twoj@email.pl"
            required
            className="w-full rounded-lg border border-border bg-bg-card px-4 py-3 text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Wyślij link do logowania"
            )}
          </button>
        </form>

        <Link
          href="/"
          className="flex items-center justify-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć na stronę główną
        </Link>
      </div>
    </main>
  );
}
