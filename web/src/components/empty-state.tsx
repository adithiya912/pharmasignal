import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { GlassCard } from "@/components/glass-card";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Per docs/design-brief.md's writing tone: explain what's missing and
 * what to do next. Never a placeholder for data we don't actually have —
 * used instead of fabricating rows/numbers (e.g. admin Hospitals/geo
 * pages, which have no backing data model yet).
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <GlassCard className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </GlassCard>
  );
}
