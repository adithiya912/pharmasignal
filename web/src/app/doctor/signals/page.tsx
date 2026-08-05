import { PageHeader } from "@/components/page-header";
import { SignalsView } from "@/components/doctor/signals-view";
import { listAllReportsForDoctor } from "@/lib/reports";
import { clusterReports } from "@/lib/admin-insights";

export default async function EmergingSignalsPage() {
  const reports = await listAllReportsForDoctor();

  let clusters = null;
  let clusterError: string | undefined;
  try {
    clusters = await clusterReports(reports);
  } catch (err) {
    clusterError = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <div>
      <PageHeader
        title="Emerging safety signals"
        description="Clusters, trends, and co-occurrence across every report on file."
      />
      <SignalsView reports={reports} clusters={clusters} clusterError={clusterError} />
    </div>
  );
}
