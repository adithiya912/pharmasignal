import type { PersistedReport, RiskLevel } from "@/lib/types";

export interface DrugSignalLine {
  drug: string;
  reports: Array<{ id: string; risk_level: RiskLevel; created_at: string }>;
}

export interface AdminStats {
  totalReports: number;
  riskCounts: Record<RiskLevel, number>;
  topSymptoms: Array<{ name: string; count: number }>;
  drugLines: DrugSignalLine[];
  /** Distinct drugs beyond the top MAX_DRUG_LINES — surfaced in the UI
   * rather than silently dropped. */
  truncatedDrugCount: number;
}

export interface ReportCluster {
  cluster_id: string;
  report_ids: string[];
  label: string;
  size: number;
}

const MAX_DRUG_LINES = 6;

function countBy(items: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const raw of items) {
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Pure aggregation over already-fetched reports — no ml-services
 * calls, safe to run even if ml-services is down. */
export function computeAdminStats(reports: PersistedReport[]): AdminStats {
  const riskCounts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };
  for (const r of reports) {
    riskCounts[r.risk_score.risk_level] += 1;
  }

  const drugCounts = countBy(reports.flatMap((r) => r.extracted.drugs));
  const symptomCounts = countBy(reports.flatMap((r) => r.extracted.symptoms));

  const topDrugNames = [...drugCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_DRUG_LINES)
    .map(([name]) => name);

  const drugLines: DrugSignalLine[] = topDrugNames.map((drug) => ({
    drug,
    reports: reports
      .filter((r) => r.extracted.drugs.some((d) => d.trim().toLowerCase() === drug))
      .map((r) => ({ id: r.id, risk_level: r.risk_score.risk_level, created_at: r.created_at }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  }));

  const topSymptoms = [...symptomCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  return {
    totalReports: reports.length,
    riskCounts,
    topSymptoms,
    drugLines,
    truncatedDrugCount: Math.max(0, drugCounts.size - topDrugNames.length),
  };
}

function mlServiceUrl(): string {
  return process.env.ML_SERVICE_URL ?? "http://127.0.0.1:8000";
}

async function embedText(text: string): Promise<number[]> {
  const res = await fetch(`${mlServiceUrl()}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report_text: text }),
  });
  if (!res.ok) {
    throw new Error(`ml-services /embed returned ${res.status}`);
  }
  const data = await res.json();
  return data.embedding;
}

/**
 * Calls the real /embed then /cluster ml-services endpoints (never
 * invents cluster data) — throws on any ml-services failure so the
 * caller can render an honest error state instead of a fabricated
 * clustering result.
 */
export async function clusterReports(reports: PersistedReport[]): Promise<ReportCluster[]> {
  if (reports.length === 0) return [];

  const embeddings = await Promise.all(
    reports.map(async (r) => ({ id: r.id, embedding: await embedText(r.report_text) })),
  );

  const res = await fetch(`${mlServiceUrl()}/cluster`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reports: embeddings }),
  });
  if (!res.ok) {
    throw new Error(`ml-services /cluster returned ${res.status}`);
  }
  const data = await res.json();
  return data.clusters;
}
