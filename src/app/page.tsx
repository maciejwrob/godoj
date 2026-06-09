"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, Loader2 } from "lucide-react";
import { getTranslations } from "@/lib/i18n-data";
import { UILanguageToggle, getStoredUILocale } from "@/components/ui-language-toggle";
import { sendMagicLink } from "@/app/(auth)/login/actions";
import { createClient } from "@/lib/supabase/client";

// Featured tutor (large) + supporting grid
const FEATURED = { src: "/avatars/camille.jpg", name: "Camille", flag: "🇫🇷" };
const GRID_TUTORS = [
  { src: "/avatars/erik.jpg", name: "Erik", flag: "🇸🇪" },
  { src: "/avatars/james.jpg", name: "James", flag: "🇬🇧" },
  { src: "/avatars/martina.jpg", name: "Martina", flag: "🇪🇸" },
  { src: "/avatars/marco.jpg", name: "Marco", flag: "🇮🇹" },
  { src: "/avatars/heidi.jpg", name: "Heidi", flag: "🇩🇪" },
  { src: "/avatars/minji.jpg", name: "Minji", flag: "🇰🇷" },
];

export default function Home() {
  const [locale, setLocale] = useState<"pl" | "en">("en");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [seatsLeft, setSeatsLeft] = useState<number | null>(null);
  const [betaLimit, setBetaLimit] = useState<number>(30);
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  useEffect(() => {
    setLocale(getStoredUILocale());
    // Fetch beta stats
    fetch("/api/beta-stats")
      .then((r) => r.json())
      .then((d) => { setSeatsLeft(d.remaining); setBetaLimit(d.limit); })
      .catch(() => {});
  }, []);

  // Handle #access_token hash from Supabase magic link redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      const supabase = createClient();
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (!error) {
            fetch("/api/auth/notify-login", { method: "POST" }).catch(() => {});
            window.location.href = "/app/dashboard";
          }
        });
    }
  }, []);

  const t = (key: string) => getTranslations(locale)[key] ?? key;

  const betaFull = seatsLeft !== null && seatsLeft <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (betaFull) {
      // Waitlist signup
      try {
        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, locale }),
        });
        if (res.ok) {
          setWaitlistJoined(true);
        } else if (res.status === 409) {
          setError(t("waitlistAlready"));
        } else {
          setError(t("waitlistError"));
        }
      } catch {
        setError(t("waitlistError"));
      }
      setLoading(false);
      return;
    }

    const result = await sendMagicLink(email, locale);

    if (result.success) {
      setSent(true);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  // Waitlist confirmation state
  if (waitlistJoined) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center px-4">
        <UILanguageToggle className="absolute top-6 right-6 z-10" />
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center -space-x-2">
            {[FEATURED, ...GRID_TUTORS.slice(0, 4)].map((tutor) => (
              <div key={tutor.name} className="relative h-11 w-11 overflow-hidden rounded-full border-2 border-surface-container">
                <Image src={tutor.src} alt={tutor.name} fill quality={95} className="object-cover object-top" sizes="88px" />
              </div>
            ))}
          </div>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
            <span className="text-3xl">🎉</span>
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>{t("waitlistDone")}</h1>
          <p className="text-on-surface-variant">
            {t("waitlistDoneDesc")}
          </p>
          <p className="text-sm text-white/60">
            <span className="font-semibold text-white">{email}</span>
          </p>
          <p className="text-xs text-on-surface-variant/40 pt-4 border-t border-white/5">
            {t("needHelp")}{" "}
            <a href="mailto:maciej@godoj.co" className="text-godoj-blue/70 hover:text-godoj-blue transition-colors">
              maciej@godoj.co
            </a>
          </p>
        </div>
      </main>
    );
  }

  // "Check inbox" confirmation state
  if (sent) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center px-4">
        <UILanguageToggle className="absolute top-6 right-6 z-10" />
        <div className="w-full max-w-md space-y-6 text-center">
          {/* Tutor avatars row */}
          <div className="flex justify-center -space-x-2">
            {[FEATURED, ...GRID_TUTORS.slice(0, 4)].map((tutor) => (
              <div key={tutor.name} className="relative h-11 w-11 overflow-hidden rounded-full border-2 border-surface-container">
                <Image src={tutor.src} alt={tutor.name} fill quality={95} className="object-cover object-top" sizes="88px" />
              </div>
            ))}
          </div>

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-godoj-blue/10">
            <Mail className="h-7 w-7 text-godoj-blue" />
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>{t("checkInbox")}</h1>
          <p className="text-on-surface-variant">
            {t("linkSent")}{" "}
            <span className="font-semibold text-white">{email}</span>
          </p>
          <p className="text-sm text-on-surface-variant/70">{t("linkValidFor")}</p>
          <button
            onClick={() => { setSent(false); setError(""); }}
            className="text-sm font-medium text-godoj-blue hover:underline"
          >
            {t("useOtherEmail")}
          </button>
          {/* Help line */}
          <p className="text-xs text-on-surface-variant/40 pt-4 border-t border-white/5">
            {t("needHelp")}{" "}
            <a href="mailto:maciej@godoj.co" className="text-godoj-blue/70 hover:text-godoj-blue transition-colors">
              maciej@godoj.co
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ===================== STICKY TOP BAR ===================== */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-surface/80 backdrop-blur-sm">
        <div className="relative mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3 sm:px-10 lg:px-14 xl:px-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-xl">
              <Image src="/logo-icon.png" alt="Godoj" width={72} height={72} className="h-full w-full object-cover" priority />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
              Godoj.co
            </span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
            <Link href="/pricing" className="text-sm font-medium text-on-surface-variant hover:text-white transition-colors">
              {t("navPricing")}
            </Link>
            <Link href="/metoda" className="text-sm font-medium text-on-surface-variant hover:text-white transition-colors">
              {locale === "pl" ? "Metoda" : "Method"}
            </Link>
          </nav>
          <div className="flex items-center gap-3 sm:gap-4">
            <UILanguageToggle />
            <Link
              href="/login"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-all"
            >
              {t("navLogin")}
            </Link>
          </div>
        </div>
      </header>

    <main className="relative mx-auto w-full max-w-[1400px] flex-1 overflow-hidden lg:flex">
      {/* ===================== LEFT COLUMN — Copy + Form ===================== */}
      <div className="relative z-10 flex w-full flex-col justify-between px-5 py-6 sm:px-10 sm:py-8 lg:w-[45%] lg:min-w-[480px] lg:max-w-[600px] lg:px-14 lg:py-10 xl:px-16">

        {/* MOBILE — Tutor strip (right after nav for instant social proof) */}
        <div className="relative mt-5 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 sm:-mx-10 sm:px-10 scrollbar-none">
            {[FEATURED, ...GRID_TUTORS].map((tutor) => (
              <div
                key={tutor.name}
                className="relative h-[100px] w-[76px] shrink-0 overflow-hidden rounded-xl border border-white/10"
              >
                <Image
                  src={tutor.src}
                  alt={tutor.name}
                  fill
                  quality={90}
                  className="object-cover object-top"
                  sizes="76px"
                />
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-1 left-0 right-0 z-10 flex items-center justify-center gap-0.5">
                  <span className="text-[10px] drop-shadow-lg">{tutor.flag}</span>
                  <span className="text-[9px] font-semibold text-white drop-shadow-md">{tutor.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="py-5 sm:py-8 lg:py-0">
          {/* Eyebrow */}
          <p className="mb-2 sm:mb-3 text-[10px] sm:text-xs font-bold tracking-[0.18em] text-godoj-blue uppercase">
            {t("landingEyebrow")}
          </p>

          {/* Heading */}
          <h1
            className="mb-3 sm:mb-4 text-[2rem] sm:text-[2.5rem] font-extrabold leading-[1.08] text-white lg:text-5xl"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            {betaFull ? t("waitlistTitle") : t("landingH1")}
          </h1>

          {/* Subtitle */}
          <p className="mb-7 sm:mb-8 max-w-[420px] text-sm sm:text-base leading-relaxed text-on-surface-variant">
            {betaFull ? t("waitlistDesc") : t("landingSub")}
          </p>

          {/* Email form + CTA button */}
          <form onSubmit={handleSubmit} className="max-w-[420px] space-y-2.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              required
              className="w-full rounded-xl border border-white/10 bg-surface-container-high px-4 py-3.5 text-sm sm:text-base text-white placeholder:text-white/40 focus:border-godoj-blue focus:outline-none focus:ring-1 focus:ring-godoj-blue"
            />
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 ${betaFull ? "bg-amber-500" : "bg-godoj-blue"}`}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : betaFull ? t("waitlistCta") : t("landingCta")}
            </button>
          </form>

          {/* Seats counter or waitlist badge */}
          <div className="max-w-[420px] flex items-center justify-center gap-2 py-2">
            {betaFull ? (
              <>
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400"></span>
                </span>
                <span className="text-[11px] sm:text-xs font-medium text-red-400/80">
                  {locale === "pl" ? `${betaLimit} z ${betaLimit} miejsc zajętych` : `${betaLimit} of ${betaLimit} seats taken`}
                </span>
              </>
            ) : (
              <>
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-50"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                </span>
                <span className="text-[11px] sm:text-xs font-medium text-amber-400/80">
                  {seatsLeft !== null
                    ? (locale === "pl" ? `Zostało tylko ${seatsLeft} z ${betaLimit} wolnych miejsc!` : `Only ${seatsLeft} of ${betaLimit} seats left!`)
                    : t("landingSeats")}
                </span>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-2 max-w-[420px] rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Benefits — horizontal cards */}
          <div className="mt-6 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-2.5 max-w-[420px]">
            {[
              { icon: "🎙", titleKey: "landingBenefit1Title", descKey: "landingBenefit1Desc" },
              { icon: "🌙", titleKey: "landingBenefit2Title", descKey: "landingBenefit2Desc" },
              { icon: "🚀", titleKey: "landingBenefit3Title", descKey: "landingBenefit3Desc" },
            ].map((b) => (
              <div key={b.titleKey} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 sm:px-3.5 sm:py-3.5 text-center">
                <span className="text-xl sm:text-2xl leading-none">{b.icon}</span>
                <p className="mt-2 text-[11px] sm:text-xs font-semibold text-white leading-snug">{t(b.titleKey)}</p>
                <p className="text-[10px] sm:text-[11px] leading-snug text-on-surface-variant/60 mt-1">{t(b.descKey)}</p>
              </div>
            ))}
          </div>

        </div>

        {/* Maciej quote — larger, always visible */}
        <div className="max-w-[420px] mt-4 lg:mt-0">
          <div className="flex gap-3.5 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-godoj-blue/20">
              <Image src="/avatars/maciej.png" alt="Maciej" width={88} height={88} className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-[13px] sm:text-sm leading-snug text-on-surface-variant/80 italic">
                {t("landingMaciej")}
              </p>
              <p className="mt-1.5 text-xs font-semibold text-white/60">Maciej — {locale === "pl" ? "twórca Godoj.co" : "founder of Godoj.co"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== RIGHT COLUMN — Tutor bento collage (desktop) ===================== */}
      <div className="relative hidden flex-1 lg:block">
        {/* Bento grid with varied tile sizes for organic feel */}
        <div className="absolute inset-4 xl:inset-6 grid gap-2.5" style={{
          gridTemplateColumns: "1.2fr 1fr 0.9fr",
          gridTemplateRows: "1.1fr 0.9fr 1fr",
        }}>
          {/* Camille — large featured, spans 2 rows */}
          <div className="group relative row-span-2 overflow-hidden rounded-[1.5rem] border border-white/8">
            <Image
              src={FEATURED.src}
              alt={FEATURED.name}
              fill
              quality={95}
              className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
              sizes="(min-width: 1024px) 35vw, 0px"
              priority
            />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3 left-4 z-10 flex items-center gap-1.5">
              <span className="text-lg drop-shadow-lg">{FEATURED.flag}</span>
              <span className="text-sm font-semibold text-white drop-shadow-md">{FEATURED.name}</span>
            </div>
          </div>

          {/* Erik */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/8">
            <Image src="/avatars/erik.jpg" alt="Erik" fill quality={95} className="object-cover object-top transition-transform duration-500 group-hover:scale-105" sizes="(min-width: 1024px) 20vw, 0px" />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-2 left-3 z-10 flex items-center gap-1">
              <span className="text-sm drop-shadow-lg">🇸🇪</span>
              <span className="text-xs font-semibold text-white drop-shadow-md">Erik</span>
            </div>
          </div>

          {/* James */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/8">
            <Image src="/avatars/james.jpg" alt="James" fill quality={95} className="object-cover object-top transition-transform duration-500 group-hover:scale-105" sizes="(min-width: 1024px) 20vw, 0px" />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-2 left-3 z-10 flex items-center gap-1">
              <span className="text-sm drop-shadow-lg">🇬🇧</span>
              <span className="text-xs font-semibold text-white drop-shadow-md">James</span>
            </div>
          </div>

          {/* Martina — spans 2 columns for variety */}
          <div className="group relative col-span-2 overflow-hidden rounded-2xl border border-white/8">
            <Image src="/avatars/martina.jpg" alt="Martina" fill quality={95} className="object-cover object-[center_20%] transition-transform duration-500 group-hover:scale-105" sizes="(min-width: 1024px) 40vw, 0px" />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-2 left-3 z-10 flex items-center gap-1">
              <span className="text-sm drop-shadow-lg">🇪🇸</span>
              <span className="text-xs font-semibold text-white drop-shadow-md">Martina</span>
            </div>
          </div>

          {/* Marco */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/8">
            <Image src="/avatars/marco.jpg" alt="Marco" fill quality={95} className="object-cover object-top transition-transform duration-500 group-hover:scale-105" sizes="(min-width: 1024px) 20vw, 0px" />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-2 left-3 z-10 flex items-center gap-1">
              <span className="text-sm drop-shadow-lg">🇮🇹</span>
              <span className="text-xs font-semibold text-white drop-shadow-md">Marco</span>
            </div>
          </div>

          {/* Heidi */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/8">
            <Image src="/avatars/heidi.jpg" alt="Heidi" fill quality={95} className="object-cover object-top transition-transform duration-500 group-hover:scale-105" sizes="(min-width: 1024px) 20vw, 0px" />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-2 left-3 z-10 flex items-center gap-1">
              <span className="text-sm drop-shadow-lg">🇩🇪</span>
              <span className="text-xs font-semibold text-white drop-shadow-md">Heidi</span>
            </div>
          </div>

          {/* Minji */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/8">
            <Image src="/avatars/minji.jpg" alt="Minji" fill quality={95} className="object-cover object-top transition-transform duration-500 group-hover:scale-105" sizes="(min-width: 1024px) 20vw, 0px" />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-2 left-3 z-10 flex items-center gap-1">
              <span className="text-sm drop-shadow-lg">🇰🇷</span>
              <span className="text-xs font-semibold text-white drop-shadow-md">Minji</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    {/* Footer */}
    <footer className="border-t border-white/5 px-5 py-8 sm:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 overflow-hidden rounded">
              <Image src="/logo-icon.png" alt="Godoj" width={20} height={20} className="h-full w-full object-cover" />
            </div>
            <span className="font-medium">Godoj.co</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href="/pricing" className="hover:text-white/60 transition-colors">
              {t("navPricing")}
            </Link>
            <Link href="/metoda" className="hover:text-white/60 transition-colors">
              {locale === "pl" ? "Metoda" : "Method"}
            </Link>
            <span className="text-white/20">|</span>
            <Link href="/regulamin" className="hover:text-white/60 transition-colors">
              {t("tosLink")}
            </Link>
            <Link href="/prywatnosc" className="hover:text-white/60 transition-colors">
              {t("privacyLink")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
    </div>
  );
}
