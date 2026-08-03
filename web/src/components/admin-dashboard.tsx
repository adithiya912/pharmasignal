import { SignalLine, SignalNode } from "@/components/signal-line";
import { riskTone } from "@/components/assessment-detail";
import type { AdminStats, ReportCluster } from "@/lib/admin-insights";

/** design-brief.md: "multiple signal lines side by side (one per drug
 * class or region), NOT a grid of stat cards." One vertical SignalLine
 * per top drug, laid out in a horizontal row instead of stacked cards. */

function clusterTone(size: number): "coral" | "amber" | "sage" {
  if (size >= 3) return "coral";
  if (size === 2) return "amber";
  return "sage";
}

function clusterIndent(size: number): 0 | 1 | 2 {
  if (size >= 3) return 0;
  if (size === 2) return 1;
  return 2;
}

export function AdminDashboard({
  stats,
  clusters,
  clusterError,
}: {
  stats: AdminStats;
  clusters: ReportCluster[] | null;
  clusterError?: string;
}) {
  if (stats.totalReports === 0) {
    return (
      <div className="rounded-lg border border-hairline bg-card p-6 text-card-foreground shadow-lg shadow-black/20">
        <p className="text-sm text-card-foreground/60">
          No patient reports yet. Once patients submit reports, aggregate trends will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1 font-body text-sm text-foreground/80">
        <p>
          <span className="font-data">{stats.totalReports}</span> report{stats.totalReports === 1 ? "" : "s"} on
          file — <span className="text-signal-coral">{stats.riskCounts.high} high</span>,{" "}
          <span className="text-signal-amber">{stats.riskCounts.medium} medium</span>,{" "}
          <span className="text-signal-sage">{stats.riskCounts.low} low</span>
        </p>
        {stats.topSymptoms.length > 0 && (
          <p className="text-foreground/60">
            Most reported symptoms:{" "}
            {stats.topSymptoms.map((s, i) => (
              <span key={s.name}>
                {i > 0 && ", "}
                <span className="font-data">{s.name}</span> ({s.count})
              </span>
            ))}
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-4 font-display text-lg italic text-foreground/70">Signal lines by drug</h2>
        <div className="flex gap-8 overflow-x-auto pb-2">
          {stats.drugLines.map((line) => (
            <div key={line.drug} className="w-48 shrink-0">
              <p className="mb-3 truncate font-data text-sm text-foreground/70">{line.drug}</p>
              <SignalLine>
                {line.reports.map((r) => (
                  <SignalNode key={r.id} tone={riskTone[r.risk_level]} maxWidth="max-w-[9rem]">
                    <div className="rounded-md border border-hairline bg-card px-3 py-2 text-xs text-card-foreground shadow shadow-black/20">
                      <p className="font-medium tracking-wide uppercase">{r.risk_level}</p>
                      <p className="mt-0.5 text-card-foreground/50">
                        {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </SignalNode>
                ))}
              </SignalLine>
            </div>
          ))}
        </div>
        {stats.truncatedDrugCount > 0 && (
          <p className="mt-2 text-xs text-foreground/40">
            +{stats.truncatedDrugCount} more drug{stats.truncatedDrugCount === 1 ? "" : "s"} not shown here.
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-4 font-display text-lg italic text-foreground/70">Symptom clusters</h2>
        {clusterError ? (
          <p className="text-sm text-signal-amber">
            Could not compute clusters: {clusterError}. Is ml-services running?
          </p>
        ) : !clusters || clusters.length === 0 ? (
          <p className="text-sm text-foreground/50">No clusters detected yet.</p>
        ) : (
          <SignalLine>
            {[...clusters]
              .sort((a, b) => b.size - a.size)
              .map((c) => (
                <SignalNode
                  key={c.cluster_id}
                  tone={clusterTone(c.size)}
                  indent={clusterIndent(c.size)}
                  spike={c.size >= 3}
                >
                  <div className="rounded-lg border border-hairline bg-card p-4 text-card-foreground shadow-lg shadow-black/20">
                    <p className="font-display text-base italic text-card-foreground/80">{c.label}</p>
                    <p className="mt-1 text-xs text-card-foreground/50">
                      {c.size} report{c.size === 1 ? "" : "s"}
                    </p>
                  </div>
                </SignalNode>
              ))}
          </SignalLine>
        )}
      </div>
    </div>
  );
}
