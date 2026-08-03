import { SignalLine, SignalNode } from "@/components/signal-line";
import type { ReportCluster } from "@/lib/admin-insights";

/** A second, independent signal line for the doctor queue — reuses the
 * same SignalLine/SignalNode primitives (and the same tone/indent-by-
 * size idea as the admin dashboard's cluster line) so a doctor can
 * spot a rising symptom cluster without reading every report. */

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

export function TrendingClusters({ clusters, error }: { clusters: ReportCluster[] | null; error?: string }) {
  if (error) {
    return (
      <p className="text-sm text-signal-amber">
        Could not compute trending clusters: {error}. Is ml-services running?
      </p>
    );
  }

  if (!clusters || clusters.length === 0) {
    return <p className="text-sm text-foreground/50">No trending clusters yet.</p>;
  }

  return (
    <SignalLine>
      {[...clusters]
        .sort((a, b) => b.size - a.size)
        .map((c) => (
          <SignalNode
            key={c.cluster_id}
            tone={clusterTone(c.size)}
            indent={clusterIndent(c.size)}
            spike={c.size >= 3}
            maxWidth="max-w-xl"
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
  );
}
