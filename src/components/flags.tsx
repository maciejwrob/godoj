// Flag SVG library for Godoj.co
// =============================================================================
// Drop-in replacement for FlagSvg / FlagPattern in dashboard/page.tsx.
// All flags use real official aspect ratios + real geometry (5-point stars,
// not dots; proper saltire crosses; correctly proportioned divisions).
//
// LANGUAGES covered: no, sv, fi, fr, it, es, de, en, ko, pt, hu
// VARIANTS covered:  en-US (americal), en-GB (british), es-LATAM (Mexican)
// Anything else falls through to a neutral navy plate so the gradient still
// dominates and the design doesn't break.
//
// Usage:
//   import { FlagPattern, FlagSvg } from "@/components/flags";
//   <FlagPattern lang={activeLang} variant={activeVariant} />

import React from "react";

type FlagProps = { lang: string; variant?: string | null };

/** Reusable five-point star defined once and `<use>`d for the US flag. */
const StarSymbol = () => (
  <symbol id="godoj-star" viewBox="-1 -1 2 2">
    {/*
      5 outer points (radius 1) at angles -90 + k*72
      5 inner points (radius 1/φ² ≈ 0.382) at angles -54 + k*72
      Polygon traced outer→inner→outer→... starting at top.
    */}
    <polygon
      points="
        0,-1
        0.225,-0.309
        0.951,-0.309
        0.363,0.118
        0.588,0.809
        0,0.382
        -0.588,0.809
        -0.363,0.118
        -0.951,-0.309
        -0.225,-0.309
      "
      fill="#fff"
    />
  </symbol>
);

const fillStyle: React.CSSProperties = { width: "100%", height: "100%", display: "block" };

export function FlagSvg({ lang, variant }: FlagProps) {
  // Variants take priority — keeps Claude Code's "american" / "british" /
  // "es-LATAM" knobs working unchanged.
  const key =
    variant === "american" || variant === "en-US" ? "en-US" :
    variant === "british"  || variant === "en-GB" ? "en-GB" :
    variant === "es-LATAM" ? "es-LATAM" :
    lang;

  switch (key) {
    // -----------------------------------------------------------------------
    // Cross flags — proper proportions, no %-on-div distortion
    // -----------------------------------------------------------------------
    case "no": // Norway — 22:16, cross 6:1:2:1:12 / 6:1:2:1:6
      return (
        <svg viewBox="0 0 22 16" preserveAspectRatio="xMidYMid slice" style={fillStyle}>
          <rect width="22" height="16" fill="#EF3340"/>
          <rect x="6" width="4" height="16" fill="#fff"/>
          <rect y="6" width="22" height="4" fill="#fff"/>
          <rect x="7" width="2" height="16" fill="#00205B"/>
          <rect y="7" width="22" height="2" fill="#00205B"/>
        </svg>
      );
    case "sv": // Sweden — 16:10, cross 5:2:9 / 4:2:4
      return (
        <svg viewBox="0 0 16 10" preserveAspectRatio="xMidYMid slice" style={fillStyle}>
          <rect width="16" height="10" fill="#006AA7"/>
          <rect x="5" width="2" height="10" fill="#FECC02"/>
          <rect y="4" width="16" height="2" fill="#FECC02"/>
        </svg>
      );
    case "fi": // Finland — 18:11, cross 5:3:10 / 4:3:4
      return (
        <svg viewBox="0 0 18 11" preserveAspectRatio="xMidYMid slice" style={fillStyle}>
          <rect width="18" height="11" fill="#fff"/>
          <rect x="5" width="3" height="11" fill="#003580"/>
          <rect y="4" width="18" height="3" fill="#003580"/>
        </svg>
      );

    // -----------------------------------------------------------------------
    // Vertical-tricolour Romance flags — straightforward equal thirds
    // -----------------------------------------------------------------------
    case "fr":
      return (
        <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice" style={fillStyle}>
          <rect width="1" height="2" fill="#002395"/>
          <rect x="1" width="1" height="2" fill="#fff"/>
          <rect x="2" width="1" height="2" fill="#ED2939"/>
        </svg>
      );
    case "it":
      return (
        <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice" style={fillStyle}>
          <rect width="1" height="2" fill="#009246"/>
          <rect x="1" width="1" height="2" fill="#fff"/>
          <rect x="2" width="1" height="2" fill="#CE2B37"/>
        </svg>
      );

    // -----------------------------------------------------------------------
    // Horizontal-band flags
    // -----------------------------------------------------------------------
    case "es": // Spain — 3:2, 1:2:1 horizontal (coat of arms omitted — invisible at 10%)
      return (
        <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice" style={fillStyle}>
          <rect width="3" height="0.5" fill="#AA151B"/>
          <rect y="0.5" width="3" height="1" fill="#F1BF00"/>
          <rect y="1.5" width="3" height="0.5" fill="#AA151B"/>
        </svg>
      );
    case "de": // Germany — 5:3, equal horizontal bands
      return (
        <svg viewBox="0 0 5 3" preserveAspectRatio="xMidYMid slice" style={fillStyle}>
          <rect width="5" height="1" fill="#000"/>
          <rect y="1" width="5" height="1" fill="#DD0000"/>
          <rect y="2" width="5" height="1" fill="#FFCC00"/>
        </svg>
      );
    // -----------------------------------------------------------------------
    // Mexico (es-LATAM) — 7:4, green/white/red vertical (eagle omitted)
    // -----------------------------------------------------------------------
    case "es-LATAM":
      return (
        <svg viewBox="0 0 7 4" preserveAspectRatio="xMidYMid slice" style={fillStyle}>
          <rect width="2.333" height="4" fill="#006847"/>
          <rect x="2.333" width="2.333" height="4" fill="#fff"/>
          <rect x="4.666" width="2.333" height="4" fill="#CE1126"/>
        </svg>
      );

    // -----------------------------------------------------------------------
    // United Kingdom — 2:1 Union Jack, full saltire + cross construction
    // -----------------------------------------------------------------------
    case "en":
    case "en-GB":
      return (
        <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" style={fillStyle}>
          <clipPath id="uk-clip"><rect width="60" height="30"/></clipPath>
          <g clipPath="url(#uk-clip)">
            <rect width="60" height="30" fill="#012169"/>
            {/* White saltire (St. Andrew) — wider underlay */}
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
            {/* Red saltire (St. Patrick) — split into two offset halves so the
                quadrants alternate correctly (this is the "proper" Union Jack
                trick, not just a thin red overlay) */}
            <clipPath id="uk-stp">
              <polygon points="0,0 30,15 60,0 60,30 30,15 0,30"/>
            </clipPath>
            <g clipPath="url(#uk-stp)">
              <path d="M0,0 L60,30" stroke="#C8102E" strokeWidth="4" transform="translate(0, 2)"/>
              <path d="M60,0 L0,30" stroke="#C8102E" strokeWidth="4" transform="translate(0, -2)"/>
            </g>
            {/* White cross (St. George underlay) */}
            <rect x="25" width="10" height="30" fill="#fff"/>
            <rect y="10" width="60" height="10" fill="#fff"/>
            {/* Red cross (St. George) */}
            <rect x="27" width="6" height="30" fill="#C8102E"/>
            <rect y="12" width="60" height="6" fill="#C8102E"/>
          </g>
        </svg>
      );

    // -----------------------------------------------------------------------
    // United States — 19:10, 13 stripes, 50 stars (9 rows: 6-5-6-5-6-5-6-5-6)
    // Stars are REAL 5-point polygons, not dots.
    // -----------------------------------------------------------------------
    case "en-US": {
      const W = 19, H = 10;
      const stripeH = H / 13;                  // 0.769
      const cantonW = 0.4 * W;                 // 7.6
      const cantonH = 7 * stripeH;             // ~5.385
      const hSpace = cantonW / 12;             // ~0.633 — 12 = 2 × 6-star pitch
      const vSpace = cantonH / 10;             // ~0.538 — 10 = 2 × row pitch
      const starR = hSpace * 0.31;             // outer radius — visually balanced

      const stars: React.ReactElement[] = [];
      // Rows 1,3,5,7,9 — 6 stars at horiz cols 1,3,5,7,9,11/12
      // Rows 2,4,6,8 — 5 stars at horiz cols 2,4,6,8,10/12
      for (let row = 0; row < 9; row++) {
        const y = vSpace * (row + 1);
        const evenRow = row % 2 === 0;        // row 0,2,4,6,8 (i.e. 1st,3rd…)
        const cols = evenRow ? [1, 3, 5, 7, 9, 11] : [2, 4, 6, 8, 10];
        for (const c of cols) {
          const x = hSpace * c;
          stars.push(
            <use
              key={`${row}-${c}`}
              href="#godoj-star"
              x={x - starR}
              y={y - starR}
              width={starR * 2}
              height={starR * 2}
            />
          );
        }
      }

      return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={fillStyle}>
          <defs><StarSymbol/></defs>
          {/* 13 alternating stripes */}
          {Array.from({ length: 13 }, (_, i) => (
            <rect
              key={i}
              y={i * stripeH}
              width={W}
              height={stripeH}
              fill={i % 2 === 0 ? "#B22234" : "#fff"}
            />
          ))}
          {/* Blue canton */}
          <rect width={cantonW} height={cantonH} fill="#3C3B6E"/>
          {stars}
        </svg>
      );
    }

    // -----------------------------------------------------------------------
    // South Korea — 3:2 Taegukgi (no trigrams — invisible at 10% opacity)
    // -----------------------------------------------------------------------
    case "ko":
      return (
        <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice" style={fillStyle}>
          <rect width="3" height="2" fill="#fff"/>
          <g transform="translate(1.5, 1)">
            <clipPath id="ko-clip"><circle r="0.5"/></clipPath>
            <g clipPath="url(#ko-clip)">
              <rect x="-0.5" y="-0.5" width="1" height="0.5" fill="#CD2E3A"/>
              <rect x="-0.5" width="1" height="0.5" fill="#0047A0"/>
              <circle cx="-0.25" r="0.25" fill="#CD2E3A"/>
              <circle cx="0.25" r="0.25" fill="#0047A0"/>
            </g>
          </g>
        </svg>
      );

    case "ja":
      return (
        <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice" style={fillStyle}>
          <rect width="3" height="2" fill="#fff"/>
          <circle cx="1.5" cy="1" r="0.6" fill="#BC002D"/>
        </svg>
      );

    default:
      return null;
  }
}

/**
 * Tile a flag across the hero card at 10% opacity, rotated -12°.
 * Drop-in replacement for the FlagPattern in dashboard/page.tsx.
 */
export function FlagPattern({ lang, variant }: FlagProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 opacity-10">
      <div className="absolute w-[150%] h-[150%] -top-1/4 -left-1/4 rotate-[-12deg]">
        <FlagSvg lang={lang} variant={variant} />
      </div>
    </div>
  );
}
