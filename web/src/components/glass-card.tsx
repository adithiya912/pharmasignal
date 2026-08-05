import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/**
 * Shared glass-panel treatment from docs/design-brief.md Revision 2 —
 * every portal's cards/panels render through this instead of redeclaring
 * backdrop-blur/border per component.
 */
export function GlassCard({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "glass-panel rounded-2xl shadow-[0_1px_0_0_var(--glass-border)_inset]",
        className,
      )}
      {...props}
    />
  );
}
