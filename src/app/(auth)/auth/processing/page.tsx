"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { LogoFull } from "@/components/logo";
import { useTranslation } from "@/lib/i18n";

export default function AuthProcessingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [error, setError] = useState(false);

  useEffect(() => {
    const processAuth = async () => {
      try {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const supabase = createClient();
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            fetch("/api/auth/notify-login", { method: "POST" }).catch(() => {});
            router.replace("/dashboard");
            return;
          }
        }

        // Also try code exchange
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        if (code) {
          const supabase = createClient();
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            fetch("/api/auth/notify-login", { method: "POST" }).catch(() => {});
            router.replace("/dashboard");
            return;
          }
        }

        // No valid auth params found
        setError(true);
        setTimeout(() => router.replace("/login"), 3000);
      } catch {
        setError(true);
        setTimeout(() => router.replace("/login"), 3000);
      }
    };

    processAuth();
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center space-y-6">
        <LogoFull size={40} />
        {error ? (
          <>
            <p className="text-red-400 text-lg font-medium">
              Link wygasł lub jest nieprawidłowy
            </p>
            <p className="text-text-secondary text-sm">
              Przekierowuję na stronę logowania...
            </p>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-text-secondary text-lg">Logujemy Cię...</p>
          </>
        )}
      </div>
    </main>
  );
}
