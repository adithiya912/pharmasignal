import { PageHeader } from "@/components/page-header";
import { AnalyticsView } from "@/components/doctor/analytics-view";
import { listAllReportsForAdmin } from "@/lib/reports";
import { computeAdminStats } from "@/lib/admin-insights";

export default async function AdminAnalyticsPage() {
  const reports = await listAllReportsForAdmin();
  const stats = computeAdminStats(reports);

  return (
    <div>
      <PageHeader title="Analytics" description="Risk distribution and top drugs/symptoms across all reports." />
      <AnalyticsView stats={stats} />
    </div>
  );
}
