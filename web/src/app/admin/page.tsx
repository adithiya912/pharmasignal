import Link from "next/link";
import { FileText, Stethoscope, Users2, Activity, Cpu, ShieldCheck, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { GlassCard } from "@/components/glass-card";
import { RiskBadge } from "@/components/risk-badge";
import { EmptyState } from "@/components/empty-state";
import { listAllReportsForAdmin } from "@/lib/reports";
import { computeAdminStats, getModelInfo, isGraphReachable } from "@/lib/admin-insights";
import { listUsersForAdmin } from "@/lib/admin-users";

export default async function AdminDashboard() {
  const [reports, { users, totalCount: userTotalCount }, graphHealthy] = await Promise.all([
    listAllReportsForAdmin(),
    listUsersForAdmin(),
    isGraphReachable(),
  ]);
  const stats = computeAdminStats(reports);

  let modelInfo = null;
  let modelError: string | undefined;
  try {
    modelInfo = await getModelInfo();
  } catch (err) {
    modelError = err instanceof Error ? err.message : "Unknown error";
  }

  const doctorCount = users.filter((u) => u.role === "doctor").length;
  const patientCount = users.filter((u) => u.role === "patient").length;
  const recentReports = reports.slice(0, 6);
  const topDrugs = stats.drugLines.slice(0, 5).map((d) => ({ drug: d.drug, count: d.reports.length }));

  const accuracyLabel = modelInfo?.trained
    ? `${modelInfo.held_out_eval!.correct}/${modelInfo.held_out_eval!.test_size}`
    : modelInfo
      ? "Not trained"
      : "Unavailable";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="System overview"
        description="Platform-wide adverse-event trends, user counts, and AI model health."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total reports" icon={FileText} value={String(stats.totalReports)} />
        <StatTile
          label="Doctors registered"
          icon={Stethoscope}
          value={String(doctorCount)}
          hint={userTotalCount > users.length ? `of ${userTotalCount}+ total users` : undefined}
        />
        <StatTile label="Patients registered" icon={Users2} value={String(patientCount)} />
        <StatTile label="High-risk reports" icon={Activity} value={String(stats.riskCounts.high)} tone="high" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="flex flex-col gap-3 lg:col-span-2">
          <h2 className="text-sm font-medium text-foreground">Recent activity</h2>
          {recentReports.length === 0 ? (
            <EmptyState icon={FileText} title="No reports yet" description="New submissions will show up here." />
          ) : (
            <div className="flex flex-col gap-2">
              {recentReports.map((r) => (
                <GlassCard key={r.id} className="flex items-center justify-between gap-4 p-4">
                  <RiskBadge level={r.risk_score.risk_level} />
                  <span className="flex-1 truncate text-sm text-muted-foreground">
                    {r.extracted.drugs.join(", ") || "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </GlassCard>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground">Platform status</h2>
          <GlassCard className="flex flex-col divide-y divide-border p-0">
            <div className="flex items-center justify-between gap-3 p-4">
              <span className="flex items-center gap-2 text-sm text-foreground">
                <FileText className="size-4 text-muted-foreground" /> Database
              </span>
              <span className="flex items-center gap-1.5 text-xs text-risk-low">
                <ShieldCheck className="size-3.5" /> Operational
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <span className="flex items-center gap-2 text-sm text-foreground">
                <Activity className="size-4 text-muted-foreground" /> Knowledge graph (Neo4j)
              </span>
              {graphHealthy ? (
                <span className="flex items-center gap-1.5 text-xs text-risk-low">
                  <ShieldCheck className="size-3.5" /> Operational
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-risk-high">
                  <ShieldAlert className="size-3.5" /> Unreachable
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <Link href="/admin/model" className="flex items-center gap-2 text-sm text-foreground hover:underline">
                <Cpu className="size-4 text-muted-foreground" /> GNN held-out accuracy
              </Link>
              <span className="font-mono text-xs text-muted-foreground">{accuracyLabel}</span>
            </div>
          </GlassCard>
          {modelError && <p className="text-xs text-risk-medium">Model info unavailable: {modelError}</p>}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Most reported drugs</h2>
        {topDrugs.length === 0 ? (
          <EmptyState icon={FileText} title="No data yet" description="Drug trends will appear here." />
        ) : (
          <GlassCard className="flex flex-col gap-2 p-5">
            {topDrugs.map((d) => (
              <div key={d.drug} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate font-mono text-xs text-foreground">{d.drug}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full brand-gradient-bg"
                    style={{ width: `${(d.count / topDrugs[0].count) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </GlassCard>
        )}
      </section>
    </div>
  );
}
