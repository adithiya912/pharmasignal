import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";

const toneClass: Record<RiskLevel, string> = {
  low: "bg-risk-low/15 text-risk-low border-risk-low/30",
  medium: "bg-risk-medium/15 text-risk-medium border-risk-medium/30",
  high: "bg-risk-high/15 text-risk-high border-risk-high/30",
};

const label: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

/**
 * The one place risk_level renders as color+text. Reused by every portal
 * so a risk level always looks the same wherever it appears — per
 * docs/design-brief.md, these three colors are reserved for risk
 * signaling only, never decorative.
 */
export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        toneClass[level],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label[level]}
    </span>
  );
}
