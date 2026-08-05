import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { FilePlus2, FlaskConical, MessageCircle, ShieldCheck, FileClock, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { GlassCard } from "@/components/glass-card";
import { RiskBadge } from "@/components/risk-badge";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { listReportsForUser } from "@/lib/reports";
import { computePatientSummary } from "@/lib/patient-insights";
import { cn } from "@/lib/utils";

const quickActions = [
  { href: "/patient/report/new", label: "Report a side effect", icon: FilePlus2 },
  { href: "/patient/interactions", label: "Check an interaction", icon: FlaskConical },
  { href: "/patient/assistant", label: "Ask the AI assistant", icon: MessageCircle },
];

export default async function PatientDashboard() {
  const user = await currentUser();
  const reports = user ? await listReportsForUser(user.id) : [];
  const summary = computePatientSummary(reports);
  const recent = reports.slice(0, 4);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={user?.firstName ? `Welcome back, ${user.firstName}` : "Welcome"}
        description="Your health summary, drug safety score, and recent activity."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Drug safety score"
          icon={ShieldCheck}
          value={summary.safetyScore === null ? "—" : String(summary.safetyScore)}
          hint={summary.safetyScore === null ? "Submit a report to see this" : "Out of 100, based on your reports"}
          tone={summary.safetyScore === null ? "default" : summary.safetyScore < 60 ? "high" : summary.safetyScore < 85 ? "medium" : "low"}
        />
        <StatTile label="Reports submitted" icon={FileClock} value={String(summary.totalReports)} />
        <StatTile
          label="Active alerts"
          icon={AlertTriangle}
          value={String(summary.riskCounts.medium + summary.riskCounts.high)}
          tone={summary.riskCounts.high > 0 ? "high" : summary.riskCounts.medium > 0 ? "medium" : "low"}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
            <action.icon className="size-4" />
            {action.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Recent submissions</h2>
            <Link href="/patient/reports" className="text-xs text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              icon={FileClock}
              title="No reports yet"
              description="Your submitted reports will show up here."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((r) => (
                <GlassCard key={r.id} className="flex items-center justify-between gap-4 p-4">
                  <RiskBadge level={r.risk_score.risk_level} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                </GlassCard>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground">Recent alerts</h2>
          {summary.recentAlerts.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No active alerts"
              description="Medium or high risk reports will appear here."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {summary.recentAlerts.map((r) => (
                <GlassCard key={r.id} className="flex flex-col gap-1 p-4">
                  <RiskBadge level={r.risk_score.risk_level} />
                  <p className="text-sm text-muted-foreground">{r.risk_score.explanation}</p>
                </GlassCard>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
