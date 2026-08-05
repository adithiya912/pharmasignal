import { AlertTriangle, Cpu, Waypoints } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GlassCard } from "@/components/glass-card";
import { StatTile } from "@/components/stat-tile";
import { EmptyState } from "@/components/empty-state";
import { getModelInfo } from "@/lib/admin-insights";

export default async function AiModelMonitoringPage() {
  let modelInfo = null;
  let error: string | undefined;
  try {
    modelInfo = await getModelInfo();
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI model monitoring"
        description="The link-prediction GNN's actual last training run — not a polished summary metric."
      />

      {error ? (
        <EmptyState icon={Cpu} title="Could not reach ml-services" description={error} />
      ) : !modelInfo?.trained ? (
        <EmptyState
          icon={Cpu}
          title="No trained model yet"
          description="Run `python -m scripts.train_gnn` in ml-services/ to train the GNN and populate this page."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Graph size" icon={Waypoints} value={`${modelInfo.graph_nodes} nodes`} hint={`${modelInfo.graph_edges} edges`} />
            <StatTile
              label="Held-out accuracy"
              icon={Cpu}
              value={`${modelInfo.held_out_eval!.correct}/${modelInfo.held_out_eval!.test_size}`}
              tone="medium"
              hint="at or below chance — see caveat below"
            />
            <StatTile label="Best epoch" value={String(modelInfo.held_out_eval!.best_epoch)} hint="of 300, by held-out val loss" />
            <StatTile label="Best val loss" value={modelInfo.held_out_eval!.best_val_loss.toFixed(4)} />
          </div>

          <GlassCard className="flex gap-3 border-risk-medium/30 bg-risk-medium/5 p-5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-risk-medium" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Read before trusting this model</p>
              <p className="text-sm text-muted-foreground">{modelInfo.caveat}</p>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="mb-1 text-sm font-medium text-foreground">Architecture</h3>
            <p className="mb-4 text-sm text-muted-foreground">{modelInfo.architecture}</p>
            <p className="text-xs text-muted-foreground">
              Last trained {new Date(modelInfo.trained_at!).toLocaleString()}
            </p>
          </GlassCard>

          <GlassCard className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">Drug pair</th>
                  <th className="px-4 py-3 font-medium">Predicted probability</th>
                  <th className="px-4 py-3 font-medium">Ground truth</th>
                  <th className="px-4 py-3 font-medium">Correct?</th>
                </tr>
              </thead>
              <tbody>
                {modelInfo.held_out_eval!.predictions.map((p, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {p.drug_a} ↔ {p.drug_b}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.probability.toFixed(3)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{p.true_label}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${p.predicted_correctly ? "text-risk-low" : "text-risk-high"}`}>
                        {p.predicted_correctly ? "Correct" : "Incorrect"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </>
      )}
    </div>
  );
}
