import type { PersistedReport, RiskLevel } from "@/lib/types";

export interface PatientSummary {
  totalReports: number;
  riskCounts: Record<RiskLevel, number>;
  /** A simple weighted average of risk levels across the patient's own
   * reports (low=100, medium=60, high=20 points, then averaged) — not a
   * clinical score, just a legible summary of their own report history.
   * Null when they have no reports yet, never a fabricated default. */
  safetyScore: number | null;
  recentAlerts: PersistedReport[];
}

const POINTS: Record<RiskLevel, number> = { low: 100, medium: 60, high: 20 };

export function computePatientSummary(reports: PersistedReport[]): PatientSummary {
  const riskCounts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };
  for (const r of reports) riskCounts[r.risk_score.risk_level] += 1;

  const safetyScore =
    reports.length === 0
      ? null
      : Math.round(reports.reduce((sum, r) => sum + POINTS[r.risk_score.risk_level], 0) / reports.length);

  const recentAlerts = reports
    .filter((r) => r.risk_score.risk_level === "medium" || r.risk_score.risk_level === "high")
    .slice(0, 5);

  return { totalReports: reports.length, riskCounts, safetyScore, recentAlerts };
}
