"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { RiskBadge } from "@/components/risk-badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import type { PersistedReport, RiskLevel } from "@/lib/types";

const riskRank: Record<RiskLevel, number> = { high: 2, medium: 1, low: 0 };

function patientLabel(patientUserId: string): string {
  const tail = patientUserId.replace(/^user_/, "").slice(-6).toUpperCase();
  return `Patient ${tail}`;
}

function summarize(items: string[], max = 3): string {
  if (items.length === 0) return "—";
  const shown = items.slice(0, max).join(", ");
  return items.length > max ? `${shown}, +${items.length - max} more` : shown;
}

function matches(row: PersistedReport, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    row.extracted.drugs.some((d) => d.toLowerCase().includes(q)) ||
    row.extracted.symptoms.some((s) => s.toLowerCase().includes(q))
  );
}

interface ReportsTableProps {
  reports: PersistedReport[];
  /** Wraps each row in a Link to `${basePath}/${report.id}`. Omit for a
   * read-only view (e.g. admin, which has no per-report detail page). */
  basePath?: string;
}

export function ReportsTable({ reports, basePath }: ReportsTableProps) {
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () =>
      [...reports].sort((a, b) => {
        const rankDiff = riskRank[b.risk_score.risk_level] - riskRank[a.risk_score.risk_level];
        if (rankDiff !== 0) return rankDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [reports],
  );
  const filtered = useMemo(() => sorted.filter((row) => matches(row, query)), [sorted, query]);

  if (sorted.length === 0) {
    return <EmptyState icon={Search} title="No reports yet" description="Patient reports will appear here once submitted." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by drug or symptom…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description={`No reports match "${query}".`} />
      ) : (
        <GlassCard className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Drugs</th>
                <th className="px-4 py-3 font-medium">Symptoms</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const href = basePath ? `${basePath}/${row.id}` : undefined;
                const cell = (className: string, content: React.ReactNode) =>
                  href ? (
                    <Link href={href} className={className}>
                      {content}
                    </Link>
                  ) : (
                    <span className={className}>{content}</span>
                  );
                return (
                  <tr
                    key={row.id}
                    className={cn("border-b border-border last:border-0", href && "hover:bg-muted/40")}
                  >
                    <td className="px-4 py-3">{cell("", <RiskBadge level={row.risk_score.risk_level} />)}</td>
                    <td className="px-4 py-3">{cell("font-mono text-xs text-foreground", patientLabel(row.patient_user_id))}</td>
                    <td className="px-4 py-3">{cell("text-foreground", summarize(row.extracted.drugs))}</td>
                    <td className="px-4 py-3">{cell("text-muted-foreground", summarize(row.extracted.symptoms))}</td>
                    <td className="px-4 py-3">
                      {cell("text-xs text-muted-foreground capitalize", row.review_status ?? "pending")}
                    </td>
                    <td className="px-4 py-3">
                      {cell(
                        "text-xs text-muted-foreground",
                        new Date(row.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }),
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </GlassCard>
      )}
    </div>
  );
}
