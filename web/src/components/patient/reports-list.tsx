"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { RiskBadge } from "@/components/risk-badge";
import { ReportResult } from "@/components/patient/report-result";
import { EmptyState } from "@/components/empty-state";
import { FileClock } from "lucide-react";
import { assessmentFromPersistedReport, type PersistedReport } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ReportsList({ reports }: { reports: PersistedReport[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={FileClock}
        title="No reports yet"
        description="Submit your first side-effect report to see your risk assessments here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reports.map((report) => {
        const open = openId === report.id;
        return (
          <GlassCard key={report.id} className="overflow-hidden p-0">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : report.id)}
              className="flex w-full items-center justify-between gap-4 p-5 text-left"
            >
              <div className="flex items-center gap-3">
                <RiskBadge level={report.risk_score.risk_level} />
                <span className="text-sm text-muted-foreground">
                  {new Date(report.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </button>
            {open && (
              <div className="border-t border-border p-5 pt-4">
                <p className="mb-4 text-sm text-muted-foreground italic">&ldquo;{report.report_text}&rdquo;</p>
                <ReportResult assessment={assessmentFromPersistedReport(report)} />
              </div>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}
