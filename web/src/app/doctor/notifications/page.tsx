import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GlassCard } from "@/components/glass-card";
import { RiskBadge } from "@/components/risk-badge";
import { EmptyState } from "@/components/empty-state";
import { listAllReportsForDoctor } from "@/lib/reports";

export default async function DoctorNotificationsPage() {
  const reports = await listAllReportsForDoctor();
  const alerts = reports.filter((r) => r.risk_score.risk_level === "medium" || r.risk_score.risk_level === "high");

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Medium and high risk reports across every patient — nothing else generates a notification yet."
      />
      {alerts.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No notifications" description="Elevated-risk reports will appear here." />
      ) : (
        <div className="flex flex-col gap-3">
          {alerts.map((r) => (
            <Link key={r.id} href={`/doctor/reports/${r.id}`}>
              <GlassCard className="flex flex-col gap-2 p-5">
                <div className="flex items-center justify-between gap-4">
                  <RiskBadge level={r.risk_score.risk_level} />
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-muted-foreground">{r.risk_score.explanation}</p>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
