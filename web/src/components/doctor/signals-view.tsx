"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import { GlassCard } from "@/components/glass-card";
import { EmptyState } from "@/components/empty-state";
import { Activity } from "lucide-react";
import type { ReportCluster } from "@/lib/admin-insights";
import type { PersistedReport, RiskLevel } from "@/lib/types";

const riskColor: Record<RiskLevel, string> = {
  low: "var(--risk-low)",
  medium: "var(--risk-medium)",
  high: "var(--risk-high)",
};
const riskY: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--foreground)",
};

function topN<T>(counts: Map<T, number>, n: number): T[] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

export function SignalsView({
  reports,
  clusters,
  clusterError,
}: {
  reports: PersistedReport[];
  clusters: ReportCluster[] | null;
  clusterError?: string;
}) {
  const clusterChartData = useMemo(
    () =>
      (clusters ?? [])
        .slice()
        .sort((a, b) => b.size - a.size)
        .map((c) => ({ label: c.label, size: c.size })),
    [clusters],
  );

  const timelineData = useMemo(
    () =>
      reports.map((r) => ({
        date: new Date(r.created_at).getTime(),
        y: riskY[r.risk_score.risk_level],
        level: r.risk_score.risk_level,
      })),
    [reports],
  );

  const { drugs, symptoms, matrix, maxCount } = useMemo(() => {
    const drugCounts = new Map<string, number>();
    const symptomCounts = new Map<string, number>();
    for (const r of reports) {
      for (const d of r.extracted.drugs) drugCounts.set(d, (drugCounts.get(d) ?? 0) + 1);
      for (const s of r.extracted.symptoms) symptomCounts.set(s, (symptomCounts.get(s) ?? 0) + 1);
    }
    const topDrugs = topN(drugCounts, 6);
    const topSymptoms = topN(symptomCounts, 6);
    const grid = new Map<string, number>();
    for (const r of reports) {
      for (const d of r.extracted.drugs) {
        if (!topDrugs.includes(d)) continue;
        for (const s of r.extracted.symptoms) {
          if (!topSymptoms.includes(s)) continue;
          const key = `${d}|${s}`;
          grid.set(key, (grid.get(key) ?? 0) + 1);
        }
      }
    }
    const max = Math.max(1, ...grid.values());
    return { drugs: topDrugs, symptoms: topSymptoms, matrix: grid, maxCount: max };
  }, [reports]);

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No signals yet"
        description="Trends and clusters will appear once reports come in."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <GlassCard className="p-6">
        <h3 className="mb-4 text-sm font-medium text-foreground">Emerging clusters by size</h3>
        {clusterError ? (
          <p className="text-sm text-risk-medium">Could not compute clusters: {clusterError}.</p>
        ) : clusterChartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No multi-report clusters yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, clusterChartData.length * 44)}>
            <BarChart data={clusterChartData} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis
                type="category"
                dataKey="label"
                width={160}
                stroke="var(--muted-foreground)"
                fontSize={11}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="size" name="Reports" fill="var(--brand-start)" radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">Reports over time, by risk level</h3>
          <div className="flex items-center gap-3">
            {(["low", "medium", "high"] as RiskLevel[]).map((level) => (
              <span key={level} className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                <span aria-hidden className="size-2 rounded-full" style={{ background: riskColor[level] }} />
                {level}
              </span>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{ left: 8, right: 24, bottom: 8 }}>
            <CartesianGrid stroke="var(--border)" />
            <XAxis
              dataKey="date"
              type="number"
              domain={["auto", "auto"]}
              tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              stroke="var(--muted-foreground)"
              fontSize={11}
            />
            <YAxis
              dataKey="y"
              type="number"
              domain={[-0.5, 2.5]}
              ticks={[0, 1, 2]}
              tickFormatter={(v) => (["Low", "Medium", "High"] as const)[v] ?? ""}
              stroke="var(--muted-foreground)"
              fontSize={11}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ strokeDasharray: "3 3", stroke: "var(--muted-foreground)" }}
              labelFormatter={(v) => new Date(v as number).toLocaleString()}
              formatter={(_value, _name, item) => [item.payload.level, "Risk"]}
            />
            {(["low", "medium", "high"] as RiskLevel[]).map((level) => (
              <Scatter
                key={level}
                name={level}
                data={timelineData.filter((d) => d.level === level)}
                fill={riskColor[level]}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="mb-4 text-sm font-medium text-foreground">Drug × symptom co-occurrence</h3>
        {drugs.length === 0 || symptoms.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough extracted entities yet to build a heatmap.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-1" />
                  {symptoms.map((s) => (
                    <th key={s} className="p-1 font-normal text-muted-foreground" style={{ writingMode: "vertical-rl" }}>
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drugs.map((d) => (
                  <tr key={d}>
                    <td className="p-1 pr-2 text-right font-mono text-muted-foreground">{d}</td>
                    {symptoms.map((s) => {
                      const count = matrix.get(`${d}|${s}`) ?? 0;
                      const opacity = count === 0 ? 0 : 0.15 + 0.75 * (count / maxCount);
                      return (
                        <td key={s} className="p-1" title={`${d} + ${s}: ${count}`}>
                          <div
                            className="flex size-8 items-center justify-center rounded"
                            style={{ background: `color-mix(in oklch, var(--brand-start) ${opacity * 100}%, transparent)` }}
                          >
                            {count > 0 && <span className="text-[10px] text-foreground">{count}</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
