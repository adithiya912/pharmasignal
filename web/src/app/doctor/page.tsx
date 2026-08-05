import Link from "next/link";
import { FileClock, AlertTriangle, ClipboardCheck, Activity } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { GlassCard } from "@/components/glass-card";
import { RiskBadge } from "@/components/risk-badge";
import { EmptyState } from "@/components/empty-state";
import { listAllReportsForDoctor } from "@/lib/reports";
import { computeAdminStats, clusterReports } from "@/lib/admin-insights";

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export default async function DoctorDashboard() {
  const reports = await listAllReportsForDoctor();
  const stats = computeAdminStats(reports);

  let clusters = null;
  let clusterError: string | undefined;
  try {
    clusters = await clusterReports(reports);
  } catch (err) {
    clusterError = err instanceof Error ? err.message : "Unknown error";
  }

  const todayCount = reports.filter((r) => isToday(r.created_at)).length;
  const pendingCount = reports.filter((r) => (r.review_status ?? "pending") === "pending").length;
  const highRiskClusterCount = (clusters ?? []).filter((c) => c.size >= 3).length;
  const recentReports = reports.slice(0, 5);
  const topDrugs = stats.drugLines.slice(0, 5).map((d) => ({ drug: d.drug, count: d.reports.length }));
  const findings = reports.filter((r) => r.risk_score.risk_level !== "low").slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Clinical dashboard" description="Today's reports, critical cases, and drug trend charts." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Today's reports" icon={FileClock} value={String(todayCount)} />
        <StatTile label="Critical cases" icon={AlertTriangle} value={String(stats.riskCounts.high)} tone="high" />
        <StatTile label="Pending reviews" icon={ClipboardCheck} value={String(pendingCount)} tone="medium" />
        <StatTile label="High-risk signals" icon={Activity} value={String(highRiskClusterCount)} tone="high" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground">Recent patient reports</h2>
          {recentReports.length === 0 ? (
            <EmptyState icon={FileClock} title="No reports yet" description="New submissions will show up here." />
          ) : (
            <div className="flex flex-col gap-2">
              {recentReports.map((r) => (
                <Link key={r.id} href={`/doctor/reports/${r.id}`}>
                  <GlassCard className="flex items-center justify-between gap-4 p-4">
                    <RiskBadge level={r.risk_score.risk_level} />
                    <span className="flex-1 truncate text-sm text-muted-foreground">
                      {r.extracted.drugs.join(", ") || "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </GlassCard>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground">Cluster overview</h2>
          {clusterError ? (
            <p className="text-sm text-risk-medium">Could not compute clusters: {clusterError}.</p>
          ) : !clusters || clusters.length === 0 ? (
            <EmptyState icon={Activity} title="No clusters yet" description="Trending symptom clusters will appear here." />
          ) : (
            <div className="flex flex-col gap-2">
              {[...clusters]
                .sort((a, b) => b.size - a.size)
                .slice(0, 5)
                .map((c) => (
                  <GlassCard key={c.cluster_id} className="flex items-center justify-between gap-4 p-4">
                    <span className="text-sm text-foreground">{c.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">{c.size} reports</span>
                  </GlassCard>
                ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground">Top drugs by report count</h2>
          {topDrugs.length === 0 ? (
            <EmptyState icon={FileClock} title="No data yet" description="Drug trends will appear here." />
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

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground">Recent AI findings</h2>
          {findings.length === 0 ? (
            <EmptyState icon={Activity} title="No findings" description="Medium/high risk reports will appear here." />
          ) : (
            <div className="flex flex-col gap-2">
              {findings.map((r) => (
                <Link key={r.id} href={`/doctor/reports/${r.id}`}>
                  <GlassCard className="flex flex-col gap-1.5 p-4">
                    <RiskBadge level={r.risk_score.risk_level} />
                    <p className="text-sm text-muted-foreground">{r.risk_score.explanation}</p>
                  </GlassCard>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
