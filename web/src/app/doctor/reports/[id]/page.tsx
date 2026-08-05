import { notFound } from "next/navigation";
import { listAllReportsForDoctor } from "@/lib/reports";
import { clusterReports } from "@/lib/admin-insights";
import { ReportDetail } from "@/components/doctor/report-detail";

export default async function DoctorReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reports = await listAllReportsForDoctor();
  const report = reports.find((r) => r.id === id);
  if (!report) notFound();

  let clusterLabel: string | null = null;
  let clusterSize: number | null = null;
  let clusterError: string | undefined;
  try {
    const clusters = await clusterReports(reports);
    const owning = clusters.find((c) => c.report_ids.includes(id));
    if (owning) {
      clusterLabel = owning.label;
      clusterSize = owning.size;
    }
  } catch (err) {
    clusterError = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <ReportDetail
      report={report}
      clusterLabel={clusterLabel}
      clusterSize={clusterSize}
      clusterError={clusterError}
    />
  );
}
