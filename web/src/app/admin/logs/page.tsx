import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function SystemLogsPage() {
  return (
    <div>
      <PageHeader title="System logs" description="Audit trail of platform activity." />
      <EmptyState
        icon={ScrollText}
        title="No log persistence yet"
        description="PharmaSignal doesn't have a logging pipeline wired up — requests aren't currently recorded to a queryable store. This page will populate once one exists, rather than show fabricated entries."
      />
    </div>
  );
}
