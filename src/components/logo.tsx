import Image from "next/image";
import Link from "next/link";

export function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <div className="overflow-hidden rounded-xl shrink-0" style={{ width: size, height: size }}>
      <Image
        src="/logo-icon.png"
        alt="Godoj"
        width={size * 2}
        height={size * 2}
        className="h-full w-full object-cover"
        style={{ width: size, height: size }}
        priority
      />
    </div>
  );
}

export function LogoFull({ size = 32, href = "/dashboard" }: { size?: number; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <LogoIcon size={size} />
      <span
        className="text-xl font-extrabold tracking-tight text-white"
        style={{ fontFamily: "var(--font-manrope), var(--font-sans), sans-serif" }}
      >
        godoj.co
      </span>
    </Link>
  );
}

export function LogoLarge() {
  return (
    <div className="flex items-center gap-4">
      <LogoIcon size={56} />
      <span
        className="text-4xl font-extrabold tracking-tight text-white"
        style={{ fontFamily: "var(--font-manrope), var(--font-sans), sans-serif" }}
      >
        godoj.co
      </span>
    </div>
  );
}
