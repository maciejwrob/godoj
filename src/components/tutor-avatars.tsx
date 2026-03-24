export function TutorAvatar({ agentId, size = 80, speaking = false }: { agentId: string; size?: number; speaking?: boolean }) {
  const avatars: Record<string, { bg: string; hair: string; skin: string; accent: string; detail: string }> = {
    ingrid: { bg: "#1E3A5F", hair: "#F5D6A0", skin: "#FDDCB5", accent: "#C41E3A", detail: "lusekofte" },
    mia: { bg: "#1E3A5F", hair: "#F5D6A0", skin: "#FDDCB5", accent: "#00205B", detail: "lusekofte" },
    carlos: { bg: "#8B2500", hair: "#3D2314", skin: "#D4A574", accent: "#F4C430", detail: "flamenco" },
    sofia: { bg: "#8B2500", hair: "#2C1810", skin: "#D4A574", accent: "#E8412E", detail: "flamenco" },
    james: { bg: "#1B365D", hair: "#5C4033", skin: "#FDDCB5", accent: "#87CEEB", detail: "casual" },
    sarah: { bg: "#1B365D", hair: "#8B6914", skin: "#FDDCB5", accent: "#B5651D", detail: "coffee" },
    emma: { bg: "#1B365D", hair: "#C4A35A", skin: "#FDDCB5", accent: "#87CEEB", detail: "casual" },
    oliver: { bg: "#1B365D", hair: "#5C4033", skin: "#FDDCB5", accent: "#006400", detail: "tea" },
    pierre: { bg: "#002654", hair: "#3D2314", skin: "#D4A574", accent: "#CE1126", detail: "beret" },
    camille: { bg: "#002654", hair: "#2C1810", skin: "#FDDCB5", accent: "#CE1126", detail: "beret" },
    erik: { bg: "#1E3A5F", hair: "#C4A35A", skin: "#FDDCB5", accent: "#00205B", detail: "casual" },
    astrid: { bg: "#006AA7", hair: "#F5D6A0", skin: "#FDDCB5", accent: "#FECC02", detail: "dala" },
  };

  const a = avatars[agentId] ?? avatars.ingrid;
  const r = size / 2;
  const pulseClass = speaking ? "animate-pulse" : "";

  return (
    <div className={`relative ${pulseClass}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="rounded-full">
        {/* Background circle */}
        <circle cx="50" cy="50" r="50" fill={a.bg} />

        {/* Body/shoulders */}
        <ellipse cx="50" cy="95" rx="30" ry="18" fill={a.accent} />

        {/* Neck */}
        <rect x="43" y="62" width="14" height="10" rx="3" fill={a.skin} />

        {/* Head */}
        <ellipse cx="50" cy="45" rx="22" ry="24" fill={a.skin} />

        {/* Hair */}
        {a.detail === "beret" ? (
          <>
            <ellipse cx="50" cy="30" rx="24" ry="14" fill={a.hair} />
            <ellipse cx="50" cy="25" rx="22" ry="10" fill={a.accent} />
            <circle cx="50" cy="18" r="3" fill={a.accent} />
          </>
        ) : (
          <>
            <ellipse cx="50" cy="32" rx="24" ry="16" fill={a.hair} />
            <rect x="26" y="30" width="48" height="6" rx="3" fill={a.hair} />
            {/* Side hair */}
            <ellipse cx="30" cy="45" rx="5" ry="12" fill={a.hair} />
            <ellipse cx="70" cy="45" rx="5" ry="12" fill={a.hair} />
          </>
        )}

        {/* Eyes */}
        <ellipse cx="40" cy="44" rx="3.5" ry="4" fill="white" />
        <ellipse cx="60" cy="44" rx="3.5" ry="4" fill="white" />
        <circle cx="40" cy="44" r="2" fill="#2C1810" />
        <circle cx="60" cy="44" r="2" fill="#2C1810" />
        <circle cx="41" cy="43" r="0.8" fill="white" />
        <circle cx="61" cy="43" r="0.8" fill="white" />

        {/* Eyebrows */}
        <line x1="35" y1="38" x2="44" y2="37" stroke={a.hair} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="56" y1="37" x2="65" y2="38" stroke={a.hair} strokeWidth="1.5" strokeLinecap="round" />

        {/* Nose */}
        <ellipse cx="50" cy="50" rx="2" ry="2.5" fill={a.skin} stroke="#D4A060" strokeWidth="0.5" opacity="0.5" />

        {/* Mouth - smile */}
        <path d={speaking ? "M 42 56 Q 50 64 58 56" : "M 43 56 Q 50 62 57 56"} fill="none" stroke="#C07050" strokeWidth="1.5" strokeLinecap="round" />

        {/* Cheeks */}
        <circle cx="35" cy="52" r="3" fill="#FFB6C1" opacity="0.3" />
        <circle cx="65" cy="52" r="3" fill="#FFB6C1" opacity="0.3" />

        {/* Detail: coffee cup for Sarah */}
        {a.detail === "coffee" && (
          <g transform="translate(72, 70)">
            <rect x="0" y="0" width="8" height="10" rx="2" fill="#8B4513" />
            <path d="M 8 2 Q 12 5 8 8" fill="none" stroke="#8B4513" strokeWidth="1.5" />
          </g>
        )}

        {/* Detail: tea cup for Oliver */}
        {a.detail === "tea" && (
          <g transform="translate(72, 70)">
            <rect x="0" y="2" width="8" height="8" rx="2" fill="white" stroke="#006400" strokeWidth="0.5" />
            <rect x="1" y="0" width="6" height="2" rx="1" fill="#006400" opacity="0.3" />
          </g>
        )}

        {/* Sweater pattern for Norwegian */}
        {a.detail === "lusekofte" && (
          <g>
            <line x1="35" y1="80" x2="35" y2="88" stroke="white" strokeWidth="1" opacity="0.5" />
            <line x1="42" y1="78" x2="42" y2="90" stroke="white" strokeWidth="1" opacity="0.5" />
            <line x1="50" y1="78" x2="50" y2="92" stroke="white" strokeWidth="1" opacity="0.5" />
            <line x1="58" y1="78" x2="58" y2="90" stroke="white" strokeWidth="1" opacity="0.5" />
            <line x1="65" y1="80" x2="65" y2="88" stroke="white" strokeWidth="1" opacity="0.5" />
          </g>
        )}
      </svg>

      {/* Speaking ring */}
      {speaking && (
        <div className="absolute inset-0 rounded-full ring-4 ring-primary/40 animate-ping" style={{ animationDuration: "1.5s" }} />
      )}
    </div>
  );
}

export function TutorAvatarSmall({ agentId }: { agentId: string }) {
  return <TutorAvatar agentId={agentId} size={36} />;
}
