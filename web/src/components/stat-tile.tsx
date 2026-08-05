import type { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "low" | "medium" | "high";
  className?: string;
}

const toneClass: Record<NonNullable<StatTileProps["tone"]>, string> = {
  default: "text-foreground",
  low: "text-risk-low",
  medium: "text-risk-medium",
  high: "text-risk-high",
};

/**
 * A single focal number, not a grid cell — used inside a KPI row, never
 * substituted for the portal's primary chart/list per design-brief.md's
 * "cards support the focal element, they don't replace it" rule.
 */
export function StatTile({ label, value, hint, icon: Icon, tone = "default", className }: StatTileProps) {
  return (
    <GlassCard className={cn("flex flex-col gap-2 p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <p className={cn("font-mono text-3xl font-medium tracking-tight", toneClass[tone])}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </GlassCard>
  );
}
