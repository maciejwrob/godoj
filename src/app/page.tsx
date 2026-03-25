import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Logo large */}
        <div className="flex items-center gap-5">
          <div className="overflow-hidden rounded-2xl" style={{ width: 72, height: 72 }}>
            <Image src="/logo-icon.png" alt="Godoj" width={144} height={144} className="h-full w-full object-cover" style={{ width: 72, height: 72 }} priority />
          </div>
          <span className="text-5xl font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
            godoj.co
          </span>
        </div>

        <p className="text-xl text-on-surface-variant">
          Gadoj. Ucz sie. Plynnie.
        </p>

        <div className="mt-4 rounded-2xl border border-white/5 bg-surface-container-high px-6 py-4 text-sm text-on-surface-variant">
          Godoj jest dostepny tylko na zaproszenie.
        </div>

        <Link
          href="/login"
          className="mt-2 rounded-xl bg-godoj-blue px-8 py-3 font-bold text-white transition-all hover:scale-105 active:scale-95"
        >
          Zaloguj sie
        </Link>
      </div>
    </main>
  );
}
