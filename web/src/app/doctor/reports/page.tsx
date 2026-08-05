import { PageHeader } from "@/components/page-header";
import { ReportsTable } from "@/components/doctor/reports-table";
import { listAllReportsForDoctor } from "@/lib/reports";

export default async function DoctorReportsPage() {
  const reports = await listAllReportsForDoctor();

  return (
    <div>
      <PageHeader title="Patient reports" description="Every report across all patients, most urgent first." />
      <ReportsTable reports={reports} basePath="/doctor/reports" />
    </div>
  );
}
