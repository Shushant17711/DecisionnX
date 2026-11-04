"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * The Chamber: the council table seen from above, one seat per expert.
 *
 * It is the one image DecisionnX is built around. On the home page the seats
 * fill in as the panel size changes. While a panel deliberates, a lamp ring
 * passes from seat to seat and answered seats take their stance colour. On
 * the results page each seat moves toward the middle of the table in
 * proportion to its score, so the room shows where the panel leaned before
 * you read a word. The board score sits in the centre.
 */

export type SeatStance = "empty" | "waiting" | "go" | "caution" | "nogo" | "failed";

export interface Seat {
  key: string;
  label?: string;
  stance: SeatStance;
  /** 1-10. Pulls the seat toward the centre of the table. */
  score?: number | null;
}

const STANCE_FILL: Record<SeatStance, string> = {
  empty: "transparent",
  waiting: "oklch(46% 0.04 110)",
  go: "var(--patina)",
  caution: "var(--sulphur)",
  nogo: "var(--vermilion)",
  failed: "var(--text-muted)",
};

export function stanceFromVerdict(verdict?: string | null): SeatStance {
  const v = verdict?.toLowerCase();
  if (v === "go" || v === "bullish") return "go";
  if (v === "no-go" || v === "bearish") return "nogo";
  if (!v) return "waiting";
  return "caution";
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

export function Chamber({
  seats,
  centre,
  caption,
  speaking = false,
  className = "",
  onSeat,
}: {
  seats: Seat[];
  /** Big number in the middle of the table (board score). */
  centre?: React.ReactNode;
  caption?: string;
  /** A lamp ring travels across the seats still waiting. */
  speaking?: boolean;
  className?: string;
  onSeat?: (key: string) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);
  const waiting = seats
    .map((s, i) => (s.stance === "waiting" ? i : -1))
    .filter((i) => i >= 0);

  useEffect(() => {
    if (!speaking || reduced || waiting.length === 0) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 900);
    return () => window.clearInterval(id);
  }, [speaking, reduced, waiting.length]);

  const speaker = speaking && waiting.length ? waiting[tick % waiting.length] : -1;

  // Geometry: an oval table, seats on an outer ellipse.
  const W = 640;
  const H = 400;
  const cx = W / 2;
  const cy = H / 2;
  const tableRx = 210;
  const tableRy = 118;
  const seatRx = 270;
  const seatRy = 160;
  const n = Math.max(seats.length, 1);
  const r = n > 20 ? 11 : n > 12 ? 14 : 18;

  return (
    <figure className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label={caption ?? `A council table with ${seats.length} seats`}
      >
        <defs>
          <radialGradient id="chamber-lamp" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="oklch(92% 0.07 97)" stopOpacity="0.2" />
            <stop offset="55%" stopColor="oklch(92% 0.07 97)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="oklch(92% 0.07 97)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="chamber-baize" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="oklch(38% 0.06 135)" />
            <stop offset="100%" stopColor="oklch(27% 0.045 138)" />
          </radialGradient>
        </defs>

        {/* lamp pool */}
        <ellipse cx={cx} cy={cy} rx={W * 0.48} ry={H * 0.5} fill="url(#chamber-lamp)" />
        {/* table rim, then baize */}
        <ellipse cx={cx} cy={cy + 6} rx={tableRx + 14} ry={tableRy + 14} fill="oklch(14% 0.025 140 / 0.6)" />
        <ellipse cx={cx} cy={cy} rx={tableRx + 12} ry={tableRy + 12} fill="oklch(30% 0.045 70)" />
        <ellipse cx={cx} cy={cy} rx={tableRx + 12} ry={tableRy + 12} fill="none" stroke="oklch(92% 0.07 97 / 0.25)" strokeWidth="1" />
        <ellipse cx={cx} cy={cy} rx={tableRx} ry={tableRy} fill="url(#chamber-baize)" />
        <ellipse cx={cx} cy={cy} rx={tableRx * 0.62} ry={tableRy * 0.62} fill="none" stroke="oklch(92% 0.07 97 / 0.12)" strokeDasharray="2 6" />

        {seats.map((seat, i) => {
          const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
          // Higher score pulls the seat in toward the table centre.
          const pull =
            typeof seat.score === "number" && Number.isFinite(seat.score)
              ? Math.max(0, Math.min(1, seat.score / 10)) * 0.42
              : 0;
          const k = 1 - pull;
          const x = cx + Math.cos(a) * seatRx * k;
          const y = cy + Math.sin(a) * seatRy * k;
          const fill = STANCE_FILL[seat.stance];
          const isSpeaker = i === speaker;
          const interactive = !!onSeat && seat.stance !== "empty";
          return (
            <g
              key={seat.key}
              style={{
                transform: `translate(${x}px, ${y}px)`,
                transition: reduced ? undefined : "transform 0.9s var(--ease-spring)",
                transitionDelay: reduced ? undefined : `${i * 18}ms`,
                cursor: interactive ? "pointer" : undefined,
              }}
              onClick={interactive ? () => onSeat?.(seat.key) : undefined}
            >
              {seat.label && <title>{seat.label}</title>}
              {isSpeaker && (
                <circle r={r + 9} fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.9">
                  <animate attributeName="r" values={`${r + 4};${r + 12};${r + 4}`} dur="0.9s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0.2;0.9" dur="0.9s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                r={r}
                fill={fill}
                stroke={
                  seat.stance === "empty"
                    ? "oklch(92% 0.05 100 / 0.22)"
                    : seat.stance === "waiting"
                      ? "oklch(92% 0.06 100 / 0.55)"
                      : "oklch(14% 0.03 140 / 0.5)"
                }
                strokeWidth={seat.stance === "empty" ? 1 : 1.5}
                strokeDasharray={seat.stance === "empty" ? "3 4" : undefined}
                style={{ transition: "fill 0.5s var(--ease-out)" }}
              />
              {seat.stance !== "empty" && seat.stance !== "waiting" && (
                <circle r={r * 0.32} cx={-r * 0.28} cy={-r * 0.3} fill="oklch(100% 0 0 / 0.35)" />
              )}
            </g>
          );
        })}

        {centre !== undefined && (
          <foreignObject x={cx - 120} y={cy - 60} width={240} height={120}>
            <div className="flex h-full w-full flex-col items-center justify-center text-center">
              {centre}
            </div>
          </foreignObject>
        )}
      </svg>
      {caption && (
        <figcaption className="mt-3 text-center text-[0.8125rem] text-[var(--text-muted)]">{caption}</figcaption>
      )}
    </figure>
  );
}
