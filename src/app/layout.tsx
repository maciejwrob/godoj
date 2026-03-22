import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Godoj — Gadoj po swojemu",
  description:
    "Ucz się języków obcych rozmawiając z AI. Godoj to Twój prywatny tutor konwersacyjny.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-bg-dark text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
