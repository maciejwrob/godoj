"use client";

import { useState, useEffect } from "react";
import { sendMagicLink } from "./actions";
import { Mail, ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Handle magic link hash fragment (#access_token=...)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const supabase = createClient();
      // Supabase client auto-detects the hash and sets the session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          // Check onboarding status
          supabase
            .from("users")
            .select("onboarding_complete")
            .eq("id", session.user.id)
            .single()
            .then(({ data }) => {
              if (data?.onboarding_complete) {
                router.push("/dashboard");
              } else {
                router.push("/onboarding");
              }
            });
        } else {
          setAuthLoading(false);
        }
      });
    } else {
      setAuthLoading(false);
    }
  }, [router]);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await sendMagicLink(email);

    if (result.success) {
      setSent(true);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-on-surface-variant">Loguję...</p>
      </main>
    );
  }

  if (sent) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Sprawdź skrzynkę</h1>
          <p className="text-text-secondary">
            Wysłaliśmy link do logowania na{" "}
            <span className="font-medium text-text-primary">{email}</span>
          </p>
          <p className="text-sm text-text-secondary">
            Kliknij link w wiadomości, aby się zalogować. Link jest ważny przez
            24 godziny.
          </p>
          <button
            onClick={() => {
              setSent(false);
              setError("");
            }}
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
        <div className="flex flex-col items-center gap-3 text-center">
          <MessageCircle className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold">Godoj</h1>
          <p className="text-text-secondary">
            Podaj swoj e-mail, aby sie zalogowac
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <p className="text-xs text-on-surface-variant text-center">
            Wyslemy Ci link do logowania na podany adres email. Kliknij go zeby sie zalogowac — nie potrzebujesz hasla.
          </p>
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="twoj@email.pl"
              required
              className="w-full rounded-lg border border-border bg-bg-card px-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

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

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć na stronę główną
          </Link>
        </div>
      </div>
    </main>
  );
}
