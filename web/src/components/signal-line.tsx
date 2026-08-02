import type { ReactNode } from "react";

/**
 * The spine described in docs/design-brief.md: a continuous vertical
 * line offset to one side (not a centered timeline, not a card grid).
 * Nodes attach to it and their panels branch off to the right at
 * varying widths/indents so the page reads as a case file, not a
 * column layout.
 */
export function SignalLine({ children }: { children: ReactNode }) {
  return (
    <div className="relative pl-10 sm:pl-14">
      <div
        aria-hidden
        className="absolute top-1 bottom-1 left-3 w-px bg-linear-to-b from-signal-sage/70 via-signal-sage/40 to-signal-sage/10 sm:left-5"
      />
      <div className="flex flex-col gap-10">{children}</div>
    </div>
  );
}

type MarkerTone = "sage" | "amber" | "coral" | "muted";

const markerToneClass: Record<MarkerTone, string> = {
  sage: "size-2.5 bg-signal-sage shadow-[0_0_0_4px_rgba(122,155,118,0.18)]",
  amber: "size-3.5 bg-signal-amber shadow-[0_0_0_5px_rgba(232,163,61,0.25)]",
  coral: "size-4 bg-signal-coral shadow-[0_0_0_5px_rgba(212,106,106,0.28)]",
  muted: "size-2.5 bg-muted-foreground/50",
};

const pulseRingClass: Record<MarkerTone, string> = {
  sage: "",
  amber: "bg-signal-amber/70",
  coral: "bg-signal-coral/70",
  muted: "",
};

interface SignalNodeProps {
  tone?: MarkerTone;
  indent?: 0 | 1 | 2;
  /** Plays a single pulse-then-settle animation on the marker — the
   * "line reacts to an anomaly" moment from design-brief.md. Only
   * meaningful for amber/coral; pass true once, when the risk result
   * first lands, not on every re-render. */
  spike?: boolean;
  children: ReactNode;
  className?: string;
}

/** One entry on the line: a marker dot plus a panel that branches off it. */
export function SignalNode({
  tone = "sage",
  indent = 0,
  spike = false,
  children,
  className = "",
}: SignalNodeProps) {
  const indentClass = indent === 2 ? "sm:ml-10" : indent === 1 ? "sm:ml-4" : "";
  const canSpike = spike && (tone === "amber" || tone === "coral");
  return (
    <div className="relative">
      <span className="absolute -left-9 top-1.5 flex size-4 items-center justify-center sm:-left-11">
        {canSpike && (
          <span
            aria-hidden
            className={`absolute inset-0 animate-signal-pulse rounded-full ${pulseRingClass[tone]}`}
          />
        )}
        <span aria-hidden className={`relative rounded-full ${markerToneClass[tone]}`} />
      </span>
      <div className={`max-w-2xl ${indentClass} ${className}`}>{children}</div>
    </div>
  );
}
