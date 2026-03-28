"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "@/lib/i18n-data";
import { UILanguageToggle, getStoredUILocale } from "@/components/ui-language-toggle";

export default function Home() {
  const [locale, setLocale] = useState<"pl" | "en">("en");
  useEffect(() => { setLocale(getStoredUILocale()); }, []);
  const t = (key: string) => getTranslations(locale)[key] ?? key;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <UILanguageToggle className="absolute top-6 right-6" />

      <div className="flex flex-col items-center gap-8 text-center">
        {/* Logo large */}
        <div className="flex items-center gap-5">
          <div className="overflow-hidden rounded-2xl" style={{ width: 72, height: 72 }}>
            <Image src="/logo-icon.png" alt="Godoj" width={144} height={144} className="h-full w-full object-cover" style={{ width: 72, height: 72 }} priority />
          </div>
          <span className="text-5xl font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
            Godoj.co
          </span>
        </div>

        <p className="text-xl text-on-surface-variant">
          {locale === "pl" ? "Godoj. Ucz si\u0119. P\u0142ynnie." : "Speak. Learn. Fluently."}
        </p>

        <Link
          href="/login"
          className="mt-2 rounded-xl bg-godoj-blue px-8 py-3 font-bold text-white transition-all hover:scale-105 active:scale-95"
        >
          {t("sendLoginLink")}
        </Link>
      </div>
      {/* eslint-disable-next-line react/no-danger */}
      <div dangerouslySetInnerHTML={{ __html: '<!-- fixbot test -->' }} />
      {/* eslint-disable-next-line react/no-danger */}
      <div dangerouslySetInnerHTML={{ __html: '<!-- fixbot-v2-test -->' }} />
    </main>
  );
}
