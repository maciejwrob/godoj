import Image from "next/image";
import Link from "next/link";

export function LogoIcon({ size = 40 }: { size?: number }) {
  return (
    <div className="overflow-hidden rounded-xl" style={{ width: size, height: size }}>
      <Image
        src="/logo.png"
        alt="Godoj"
        width={size}
        height={size}
        className="h-full w-full object-cover"
        priority
      />
    </div>
  );
}

export function LogoFull({ size = 40 }: { size?: number }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <LogoIcon size={size} />
      <span
        className="text-2xl font-extrabold tracking-tight text-godoj-blue"
        style={{ fontFamily: "var(--font-manrope), var(--font-sans), sans-serif" }}
      >
        Godoj
      </span>
    </Link>
  );
}
