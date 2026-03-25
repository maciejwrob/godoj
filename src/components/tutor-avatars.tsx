import Image from "next/image";

const AVATAR_MAP: Record<string, { src: string; name: string }> = {
  "godoj-no-adult-mia": { src: "/avatars/mia.jpg", name: "Mia" },
  "godoj-fr-adult-camille": { src: "/avatars/camille.jpg", name: "Camille" },
  "godoj-es-eu-adult-martina": { src: "/avatars/martina.jpg", name: "Martina" },
  "godoj-en-us-adult-sarah": { src: "/avatars/sarah.jpg", name: "Sarah" },
  "godoj-en-gb-adult-lucy": { src: "/avatars/lucy.jpg", name: "Lucy" },
  "godoj-it-adult-violetta": { src: "/avatars/violetta.jpg", name: "Violetta" },
  "godoj-sv-adult-astrid": { src: "/avatars/astrid.jpg", name: "Astrid" },
  "godoj-de-adult-heidi": { src: "/avatars/heidi.jpg", name: "Heidi" },
  "godoj-fi-adult-sanna": { src: "/avatars/sanna.jpg", name: "Sanna" },
  ingrid: { src: "/avatars/mia.jpg", name: "Mia" },
};

export function TutorAvatar({
  agentId,
  size = 80,
  speaking = false,
}: {
  agentId: string;
  size?: number;
  speaking?: boolean;
}) {
  const avatar = AVATAR_MAP[agentId];
  const initials = avatar?.name?.[0] ?? agentId?.[0]?.toUpperCase() ?? "?";

  // Border width scales with size
  const borderWidth = size >= 100 ? 3 : size >= 48 ? 2 : 1;

  return (
    <div
      className="relative mx-auto shrink-0"
      style={{ width: size, height: size }}
    >
      {avatar ? (
        <div
          className="overflow-hidden rounded-full bg-[#0F172A]"
          style={{
            width: size,
            height: size,
            border: `${borderWidth}px solid rgba(132, 173, 255, 0.25)`,
          }}
        >
          <Image
            src={avatar.src}
            alt={avatar.name}
            width={size * 2}
            height={size * 2}
            className="h-full w-full rounded-full object-cover object-[center_20%]"
            style={{ width: "100%", height: "100%" }}
            priority={size >= 100}
          />
        </div>
      ) : (
        <div
          className="flex items-center justify-center rounded-full bg-godoj-blue/20 font-bold text-godoj-blue"
          style={{
            width: size,
            height: size,
            fontSize: size * 0.4,
            border: `${borderWidth}px solid rgba(132, 173, 255, 0.25)`,
          }}
        >
          {initials}
        </div>
      )}

      {/* Speaking indicator ring */}
      {speaking && (
        <>
          <div
            className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping"
            style={{ animationDuration: "1.5s" }}
          />
          <div className="absolute inset-0 rounded-full border-2 border-primary/30" />
        </>
      )}
    </div>
  );
}

export function TutorAvatarSmall({ agentId }: { agentId: string }) {
  return <TutorAvatar agentId={agentId} size={36} />;
}
