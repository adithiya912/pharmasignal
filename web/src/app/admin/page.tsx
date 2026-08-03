import { UserButton } from "@clerk/nextjs";
import { AdminDashboard } from "@/components/admin-dashboard";
import { clusterReports, computeAdminStats } from "@/lib/admin-insights";
import { listAllReportsForAdmin } from "@/lib/reports";

export default async function AdminPage() {
  const reports = await listAllReportsForAdmin();
  const stats = computeAdminStats(reports);

  let clusters = null;
  let clusterError: string | undefined;
  try {
    clusters = await clusterReports(reports);
  } catch (err) {
    clusterError = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <div className="flex-1 bg-navy">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-10 pb-4 sm:px-8">
        <div>
          <p className="font-display text-2xl text-foreground">PharmaSignal</p>
          <p className="text-sm text-muted-foreground">Trend dashboard — all reports</p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/api/admin/export"
            className="rounded-md border border-hairline px-3 py-1.5 text-sm text-foreground/80 hover:bg-foreground/5"
          >
            Export CSV
          </a>
          <UserButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 sm:px-8">
        <AdminDashboard stats={stats} clusters={clusters} clusterError={clusterError} />
      </main>
    </div>
  );
}
