import Link from "next/link";
import { MessageCircle } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-12 w-12 text-primary" />
          <h1 className="text-5xl font-bold tracking-tight">Godoj</h1>
        </div>

        <p className="text-xl text-text-secondary">
          Gadoj. Ucz się. Płynnie.
        </p>

        <div className="mt-4 rounded-xl border border-border bg-bg-card px-6 py-4 text-sm text-text-secondary">
          Godoj jest dostępny tylko na zaproszenie.
        </div>

        <Link
          href="/login"
          className="mt-2 rounded-lg bg-primary px-8 py-3 font-medium text-white transition-colors hover:bg-primary-dark"
        >
          Zaloguj się
        </Link>
      </div>
    </main>
  );
}
