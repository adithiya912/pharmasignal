import { auth } from "@clerk/nextjs/server";
import { PageHeader } from "@/components/page-header";
import { ReportsList } from "@/components/patient/reports-list";
import { listReportsForUser } from "@/lib/reports";

export default async function MyReportsPage() {
  const { userId } = await auth();
  const reports = userId ? await listReportsForUser(userId) : [];

  return (
    <div>
      <PageHeader title="My reports" description="Every report you've submitted, most recent first." />
      <ReportsList reports={reports} />
    </div>
  );
}
