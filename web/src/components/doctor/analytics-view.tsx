"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { GlassCard } from "@/components/glass-card";
import { EmptyState } from "@/components/empty-state";
import { BarChart3 } from "lucide-react";
import type { AdminStats } from "@/lib/admin-insights";
import type { RiskLevel } from "@/lib/types";

const riskColor: Record<RiskLevel, string> = {
  low: "var(--risk-low)",
  medium: "var(--risk-medium)",
  high: "var(--risk-high)",
};

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--foreground)",
};

export function AnalyticsView({ stats }: { stats: AdminStats }) {
  if (stats.totalReports === 0) {
    return (
      <EmptyState icon={BarChart3} title="No data yet" description="Analytics will populate once reports come in." />
    );
  }

  const riskData = (["low", "medium", "high"] as RiskLevel[]).map((level) => ({
    level,
    count: stats.riskCounts[level],
  }));

  const drugData = stats.drugLines
    .map((d) => ({ drug: d.drug, count: d.reports.length }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <GlassCard className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">Risk level distribution</h3>
          <div className="flex items-center gap-3">
            {riskData.map((d) => (
              <span key={d.level} className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                <span aria-hidden className="size-2 rounded-full" style={{ background: riskColor[d.level] }} />
                {d.level} ({d.count})
              </span>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={riskData} dataKey="count" nameKey="level" innerRadius={60} outerRadius={90} paddingAngle={2}>
              {riskData.map((d) => (
                <Cell key={d.level} fill={riskColor[d.level]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="mb-4 text-sm font-medium text-foreground">
          Most reported drugs {stats.truncatedDrugCount > 0 && `(+${stats.truncatedDrugCount} more not shown)`}
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={drugData} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis type="category" dataKey="drug" width={100} stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="count" fill="var(--brand-start)" radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      <GlassCard className="p-6 lg:col-span-2">
        <h3 className="mb-4 text-sm font-medium text-foreground">Most common symptoms</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={stats.topSymptoms} margin={{ bottom: 24 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} angle={-30} textAnchor="end" interval={0} />
            <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="count" fill="var(--brand-end)" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}
