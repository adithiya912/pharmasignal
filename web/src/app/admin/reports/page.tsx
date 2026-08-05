import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { ReportsTable } from "@/components/doctor/reports-table";
import { listAllReportsForAdmin } from "@/lib/reports";
import { cn } from "@/lib/utils";

export default async function AdminReportsPage() {
  const reports = await listAllReportsForAdmin();

  return (
    <div>
      <PageHeader
        title="Drug safety reports"
        description="Every report across all patients — read-only. Export to CSV for offline analysis."
        actions={
          <a href="/api/admin/export" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
            <Download className="size-4" /> Export CSV
          </a>
        }
      />
      <ReportsTable reports={reports} />
    </div>
  );
}
