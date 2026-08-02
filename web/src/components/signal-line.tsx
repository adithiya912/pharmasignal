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
  sage: "bg-signal-sage shadow-[0_0_0_4px_rgba(122,155,118,0.18)]",
  amber: "bg-signal-amber shadow-[0_0_0_4px_rgba(232,163,61,0.2)]",
  coral: "bg-signal-coral shadow-[0_0_0_4px_rgba(212,106,106,0.22)]",
  muted: "bg-muted-foreground/50",
};

interface SignalNodeProps {
  tone?: MarkerTone;
  indent?: 0 | 1 | 2;
  children: ReactNode;
  className?: string;
}

/** One entry on the line: a marker dot plus a panel that branches off it. */
export function SignalNode({ tone = "sage", indent = 0, children, className = "" }: SignalNodeProps) {
  const indentClass = indent === 2 ? "sm:ml-10" : indent === 1 ? "sm:ml-4" : "";
  return (
    <div className="relative">
      <span
        aria-hidden
        className={`absolute -left-8.5 top-2 size-2.5 rounded-full sm:-left-10.5 ${markerToneClass[tone]}`}
      />
      <div className={`max-w-2xl ${indentClass} ${className}`}>{children}</div>
    </div>
  );
}
