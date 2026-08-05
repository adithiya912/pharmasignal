import { Construction } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

/**
 * Placeholder for nav routes wired up ahead of their content module, so
 * sidebar links resolve instead of 404ing between checkpoints of the
 * frontend redesign. Each caller names the module that replaces it.
 */
export function ComingSoon({ title, module }: { title: string; module: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState
        icon={Construction}
        title="Not built yet"
        description={`This page lands in ${module} of the frontend redesign.`}
      />
    </div>
  );
}
