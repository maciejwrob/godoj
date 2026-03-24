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
  // Legacy ID
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

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {avatar ? (
        <Image
          src={avatar.src}
          alt={avatar.name}
          width={size}
          height={size}
          className={`rounded-full object-cover ${speaking ? "ring-3 ring-primary/50" : ""}`}
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className={`flex items-center justify-center rounded-full bg-godoj-blue/20 text-lg font-bold text-godoj-blue ${speaking ? "ring-3 ring-primary/50" : ""}`}
          style={{ width: size, height: size }}
        >
          {initials}
        </div>
      )}
      {speaking && (
        <div
          className="absolute inset-0 rounded-full ring-4 ring-primary/30 animate-ping"
          style={{ animationDuration: "1.5s" }}
        />
      )}
    </div>
  );
}

export function TutorAvatarSmall({ agentId }: { agentId: string }) {
  return <TutorAvatar agentId={agentId} size={36} />;
}
