"use client";

import { useState } from "react";
import { SignalLine, SignalNode } from "@/components/signal-line";
import { AssessmentDetail, RiskBadge, riskTone } from "@/components/assessment-detail";
import { assessmentFromPersistedReport } from "@/lib/types";
import type { PersistedReport, RiskLevel } from "@/lib/types";

// design-brief.md: "the line becomes a triage queue — urgent nodes
// pull slightly left/forward, routine ones sit back and smaller."
// indent 0 = closest to the spine ("forward"); higher indent = pushed
// back. maxWidth shrinks alongside it for "smaller."
const riskRank: Record<RiskLevel, number> = { high: 2, medium: 1, low: 0 };
const riskIndent: Record<RiskLevel, 0 | 1 | 2> = { high: 0, medium: 1, low: 2 };
const riskMaxWidth: Record<RiskLevel, string> = {
  high: "max-w-2xl",
  medium: "max-w-xl",
  low: "max-w-lg",
};

function patientLabel(patientUserId: string): string {
  const tail = patientUserId.replace(/^user_/, "").slice(-6).toUpperCase();
  return `Patient ${tail}`;
}

function summarize(items: string[], max = 3): string {
  if (items.length === 0) return "—";
  const shown = items.slice(0, max).join(", ");
  return items.length > max ? `${shown}, +${items.length - max} more` : shown;
}

export function DoctorQueue({ reports }: { reports: PersistedReport[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Primary sort: risk tier, urgent first (the point of a triage
  // queue). Secondary, within a tier: reverse chronological.
  const sorted = [...reports].sort((a, b) => {
    const rankDiff = riskRank[b.risk_score.risk_level] - riskRank[a.risk_score.risk_level];
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (sorted.length === 0) {
    return (
      <SignalLine>
        <SignalNode tone="sage">
          <div className="rounded-lg border border-hairline bg-card p-5 text-card-foreground shadow-lg shadow-black/20">
            <p className="text-sm text-card-foreground/60">No reports in the queue yet.</p>
          </div>
        </SignalNode>
      </SignalLine>
    );
  }

  return (
    <SignalLine>
      {sorted.map((row) => {
        const level = row.risk_score.risk_level;
        const isOpen = expanded.has(row.id);

        return (
          <SignalNode key={row.id} tone={riskTone[level]} indent={riskIndent[level]} maxWidth={riskMaxWidth[level]}>
            <div className="rounded-lg border border-hairline bg-card p-5 text-card-foreground shadow-lg shadow-black/20">
              <button
                type="button"
                onClick={() => toggle(row.id)}
                className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 text-left"
              >
                <span className="flex flex-wrap items-center gap-3">
                  <RiskBadge level={level} />
                  <span className="font-data text-xs text-card-foreground/60">
                    {patientLabel(row.patient_user_id)}
                  </span>
                  <span className="text-sm text-card-foreground/70">
                    {summarize(row.extracted.drugs)} — {summarize(row.extracted.symptoms)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-card-foreground/40">
                    {new Date(row.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span aria-hidden className="text-xs text-card-foreground/40">
                    {isOpen ? "Hide details ▴" : "Show details ▾"}
                  </span>
                </span>
              </button>

              {isOpen && (
                <div className="mt-4 border-t border-card-foreground/10 pt-4">
                  <p className="mb-3 font-display text-base italic text-card-foreground/70">
                    &ldquo;{row.report_text}&rdquo;
                  </p>
                  <AssessmentDetail assessment={assessmentFromPersistedReport(row)} />
                </div>
              )}
            </div>
          </SignalNode>
        );
      })}
    </SignalLine>
  );
}
