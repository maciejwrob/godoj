"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n-data";
import { UILanguageToggle, getStoredUILocale } from "@/components/ui-language-toggle";

export default function MetodaPage() {
  const [locale, setLocale] = useState<"pl" | "en">("en");

  useEffect(() => {
    setLocale(getStoredUILocale());
  }, []);

  const i18n = getTranslations(locale);
  const t = (key: string) => i18n[key] ?? key;

  const pt = (pl: string, en: string) => (locale === "pl" ? pl : en);

  const sections = [
    {
      number: "01",
      title: pt(
        "Nauka przez rozmowę jest najskuteczniejsza",
        "Conversation is the most effective way to learn"
      ),
      body: pt(
        "Badania nad przyswajaniem języków (Krashen, 1982; Swain, 1995) jednoznacznie pokazują: język przyswajamy przez zrozumiały input i aktywne mówienie — nie przez wypełnianie luk w ćwiczeniach. Osoby uczące się przez konwersację osiągają biegłość 3-5 razy szybciej niż ci, którzy polegają na tradycyjnych metodach nauki z podręcznika.",
        "Language acquisition research (Krashen, 1982; Swain, 1995) is clear: we acquire language through comprehensible input and active speaking — not by filling in blanks. Learners who practice through conversation reach fluency 3-5 times faster than those relying on traditional textbook methods."
      ),
      citation: "Krashen, S. (1982). Principles and Practice in Second Language Acquisition; Swain, M. (1995). Three functions of output in second language learning.",
      highlight: {
        number: "3-5x",
        label: pt(
          "szybciej niż nauka z podręcznikiem czy aplikacją",
          "faster than learning from textbooks or apps"
        ),
      },
    },
    {
      number: "02",
      title: pt(
        "Porównywalny do życia za granicą",
        "Comparable to living abroad"
      ),
      body: pt(
        "Nauka w Godoj symuluje to, co lingwiści nazywają immersją — naturalnym zanurzeniem się w języku. Zamiast ćwiczyć pojedyncze słówka, prowadzisz prawdziwe rozmowy na tematy, które Cię interesują. To ten sam mechanizm, który sprawia, że ludzie mieszkający za granicą uczą się języka tak szybko — z tą różnicą, że nie musisz nigdzie wyjeżdżać.",
        "Learning with Godoj simulates what linguists call immersion — a natural submersion in the language. Instead of practicing isolated vocabulary, you have real conversations on topics that interest you. It's the same mechanism that helps people living abroad learn languages so quickly — except you don't have to leave home."
      ),
    },
    {
      number: "03",
      title: pt(
        "Ćwiczysz myślenie w obcym języku",
        "You practice thinking in the language"
      ),
      body: pt(
        "W tradycyjnej nauce myślisz po polsku i tłumaczysz w głowie. W Godoj nie masz na to czasu — musisz reagować spontanicznie, jak w prawdziwej rozmowie. To zmusza mózg do tworzenia bezpośrednich połączeń między myślą a obcym językiem — kluczowy krok do prawdziwej biegłości.",
        "In traditional learning, you think in your native language and mentally translate. With Godoj, there's no time for that — you must respond spontaneously, like in a real conversation. This forces your brain to create direct connections between thought and the foreign language — the critical step toward true fluency."
      ),
    },
    {
      number: "04",
      title: pt(
        "Tutor, który się do Ciebie dostosowuje",
        "A tutor that adapts to you"
      ),
      body: pt(
        "Nasz AI tutor na bieżąco ocenia Twój poziom i dostosowuje złożoność rozmowy. Mówi prostszym językiem, gdy się gubisz, i podnosi poprzeczkę, gdy jesteś gotowy. Tematy? Wybierasz sam — od sportu po filozofię. Każda lekcja jest inna, bo to Ty decydujesz o czym rozmawiasz.",
        "Our AI tutor continuously evaluates your level and adjusts conversation complexity. It simplifies when you struggle and raises the bar when you're ready. Topics? You choose — from sports to philosophy. Every lesson is different because you decide what to talk about."
      ),
    },
    {
      number: "05",
      title: pt(
        "Nie jesteśmy kolejnym Duolingo",
        "We're not another Duolingo"
      ),
      body: pt(
        "Duolingo i podobne aplikacje uczą rudymentów — powtarzasz te same zdania, dopasowujesz obrazki, tłumaczysz frazesy. To dobre na pierwszy tydzień. Ale biegłości tak nie osiągniesz. Godoj to rozmowa na żywo z inteligentnym rozmówcą — z naturalnym akcentem, spontanicznymi reakcjami i tematami, które Cię angażują. Różnica? Taka jak między ćwiczeniem forehandu pod ścianą a grą w tenisa z partnerem.",
        "Duolingo and similar apps teach rudiments — you repeat the same sentences, match images, translate canned phrases. It's fine for the first week. But you won't reach fluency that way. Godoj is a live conversation with an intelligent partner — with natural accent, spontaneous reactions, and topics that engage you. The difference? Like practicing a forehand against a wall versus playing tennis with a partner."
      ),
    },
    {
      number: "06",
      title: pt(
        "Kiedy chcesz, gdzie chcesz",
        "Anytime, anywhere"
      ),
      body: pt(
        "Rano przy kawie. W przerwie na lunch. 5 minut przed snem. W samochodzie (hands-free!). Nie musisz umawiać lektora, dojeżdżać na zajęcia ani blokować całego wieczoru. Badania nad efektem rozłożonej praktyki (spacing effect) pokazują, że krótkie, regularne sesje — nawet 5-10 minut dziennie — dają lepsze rezultaty niż rzadsze, dłuższe sesje nauki.",
        "Morning with coffee. During lunch break. 5 minutes before bed. In the car (hands-free!). No scheduling tutors, commuting to classes, or blocking entire evenings. Research on the spacing effect shows that short, regular sessions — even 5-10 minutes daily — deliver better results than less frequent, longer study sessions."
      ),
      citation: "Cepeda, N. J. et al. (2006). Distributed practice in verbal recall tasks.",
      highlight: {
        number: pt("5 min / dzień", "5 min / day"),
        label: pt(
          "lepiej niż godzina raz w tygodniu",
          "better than one hour once a week"
        ),
      },
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      {/* ===================== STICKY HEADER ===================== */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3 sm:px-10 lg:px-14 xl:px-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-xl">
              <Image src="/logo-icon.png" alt="Godoj" width={72} height={72} className="h-full w-full object-cover" priority />
            </div>
            <span
              className="text-xl font-extrabold tracking-tight text-white"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              Godoj.co
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/pricing"
              className="hidden sm:block text-sm font-medium text-on-surface-variant hover:text-white transition-colors"
            >
              {t("navPricing")}
            </Link>
            <Link
              href="/metoda"
              className="hidden sm:block text-sm font-medium text-white transition-colors"
            >
              {pt("Metoda", "Method")}
            </Link>
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

      {/* ===================== MAIN CONTENT ===================== */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-10 sm:py-16 lg:py-20">

        {/* ---------- Hero ---------- */}
        <section className="text-center mb-16 sm:mb-20">
          <p className="mb-3 text-xs font-bold tracking-[0.18em] text-godoj-blue uppercase">
            {pt("Metoda Godoj", "The Godoj Method")}
          </p>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            {pt("Dlaczego rozmowa, nie apka", "Why conversation, not an app")}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            {pt(
              "Nauka języka to nie ćwiczenie. To rozmowa.",
              "Language learning isn't an exercise. It's a conversation."
            )}
          </p>
        </section>

        {/* ---------- Content sections ---------- */}
        <div className="space-y-16 sm:space-y-20">
          {sections.map((section) => (
            <section key={section.number}>
              {/* Section heading */}
              <div className="border-l-2 border-godoj-blue/30 pl-6">
                <span className="text-xs font-bold tracking-wider text-godoj-blue/50 uppercase">
                  {section.number}
                </span>
                <h2
                  className="mt-1 text-2xl font-bold text-white"
                  style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                >
                  {section.title}
                </h2>
              </div>

              {/* Section body */}
              <p className="mt-5 text-base leading-relaxed text-on-surface-variant pl-6 sm:pl-8">
                {section.body}
              </p>

              {/* Citation */}
              {section.citation && (
                <p className="mt-3 pl-6 sm:pl-8 text-xs text-white/30 italic">
                  {section.citation}
                </p>
              )}

              {/* Highlight box */}
              {section.highlight && (
                <div className="mt-6 ml-6 sm:ml-8 rounded-2xl bg-godoj-blue/5 border border-godoj-blue/20 p-8 text-center max-w-sm">
                  <span
                    className="text-5xl font-extrabold text-godoj-blue"
                    style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                  >
                    {section.highlight.number}
                  </span>
                  <p className="mt-2 text-sm text-white/60">
                    {section.highlight.label}
                  </p>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* ---------- CTA ---------- */}
        <section className="mt-20 sm:mt-24 mb-4">
          <div className="rounded-2xl border border-white/10 bg-surface-container p-8 sm:p-10 text-center">
            <h2
              className="text-xl sm:text-2xl font-bold text-white mb-3"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              {pt(
                "Gotowy na prawdziwą rozmowę?",
                "Ready for a real conversation?"
              )}
            </h2>
            <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
              {pt(
                "15 minut za darmo. Bez karty. Bez zobowiązań.",
                "15 minutes free. No card. No commitment."
              )}
            </p>
            <Link
              href="/login"
              className="inline-block rounded-xl bg-godoj-blue px-8 py-3.5 text-base font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
            >
              {pt("Zacznij mówić", "Start speaking")}
            </Link>
          </div>
        </section>
      </main>

      {/* ===================== FOOTER ===================== */}
      <footer className="mt-auto border-t border-white/5 px-5 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
            <div className="flex items-center gap-2">
              <Image src="/logo-icon.png" alt="Godoj" width={20} height={20} className="rounded" />
              <span>Godoj.co</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/regulamin" className="hover:text-white/60 transition-colors">
                {locale === "pl" ? "Regulamin" : "Terms of Service"}
              </Link>
              <Link href="/prywatnosc" className="hover:text-white/60 transition-colors">
                {locale === "pl" ? "Polityka Prywatności" : "Privacy Policy"}
              </Link>
              <span>maciej.wrob@gmail.com</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
