"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SignalLine, SignalNode } from "@/components/signal-line";
import { AssessmentDetail, RiskBadge, riskTone } from "@/components/assessment-detail";
import { runFullAssessment } from "@/lib/assess";
import { assessmentFromPersistedReport } from "@/lib/types";
import type { Assessment, ExtractResponse, PersistedReport } from "@/lib/types";

interface ReportEntry {
  id: string;
  reportText: string;
  submittedAt: Date;
  status: "loading" | "done" | "error";
  extracted?: ExtractResponse;
  assessment?: Assessment;
  error?: string;
  /** Loaded-from-history entries start collapsed (risk + date only);
   * freshly-submitted ones start expanded. Either can be toggled. */
  collapsed: boolean;
  /** True only for entries submitted this session — gates the spike
   * animation and the "saving to history" messaging, so reports
   * loaded from Supabase on page load don't replay the "detected"
   * moment or show save-status noise. */
  isFresh: boolean;
  saveError?: string;
}

function entryFromPersistedReport(row: PersistedReport): ReportEntry {
  return {
    id: row.id,
    reportText: row.report_text,
    submittedAt: new Date(row.created_at),
    status: "done",
    assessment: assessmentFromPersistedReport(row),
    collapsed: true,
    isFresh: false,
  };
}

export function ReportForm({ initialReports }: { initialReports: PersistedReport[] }) {
  const [reportText, setReportText] = useState("");
  const [entries, setEntries] = useState<ReportEntry[]>(() => initialReports.map(entryFromPersistedReport));
  const [submitting, setSubmitting] = useState(false);

  function toggleCollapsed(id: string) {
    setEntries((prev) => prev.map((it) => (it.id === id ? { ...it, collapsed: !it.collapsed } : it)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = reportText.trim();
    if (!text || submitting) return;

    const id = crypto.randomUUID();
    const entry: ReportEntry = {
      id,
      reportText: text,
      submittedAt: new Date(),
      status: "loading",
      collapsed: false,
      isFresh: true,
    };
    setEntries((prev) => [entry, ...prev]);
    setReportText("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_text: text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const extracted: ExtractResponse = await res.json();
      setEntries((prev) => prev.map((it) => (it.id === id ? { ...it, extracted } : it)));

      const assessment = await runFullAssessment(id, text, extracted);
      setEntries((prev) => prev.map((it) => (it.id === id ? { ...it, status: "done", assessment } : it)));

      const saveRes = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportText: text, assessment }),
      });
      if (!saveRes.ok) {
        setEntries((prev) =>
          prev.map((it) =>
            it.id === id ? { ...it, saveError: "This result wasn't saved to your history." } : it,
          ),
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setEntries((prev) => (prev.map((it) => (it.id === id ? { ...it, status: "error", error: message } : it))));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SignalLine>
      <SignalNode tone="sage">
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-hairline bg-card p-5 text-card-foreground shadow-lg shadow-black/20"
        >
          <h2 className="font-display text-lg italic text-card-foreground/70">New report</h2>
          <p className="mt-1 mb-4 text-sm text-card-foreground/60">
            Describe what happened in your own words — what you took, what you noticed, and when.
          </p>
          <Textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="e.g. I've been taking ibuprofen 400mg twice daily for my knee pain for about two weeks, and yesterday I started having severe stomach pain..."
            className="min-h-32 border-card-foreground/15 bg-background/40 font-body text-card-foreground placeholder:text-card-foreground/35"
            disabled={submitting}
          />
          <div className="mt-4 flex items-center justify-between gap-4">
            <span className="text-xs text-card-foreground/45">
              This sends your report for a full risk assessment and saves it to your history.
            </span>
            <Button type="submit" disabled={submitting || !reportText.trim()}>
              {submitting ? "Assessing…" : "Submit report"}
            </Button>
          </div>
        </form>
      </SignalNode>

      {entries.map((entry, i) => {
        const tone =
          entry.status === "error"
            ? "muted"
            : entry.status === "loading"
              ? "muted"
              : entry.assessment
                ? riskTone[entry.assessment.riskScore.risk_level]
                : "sage";
        const canToggle = entry.status === "done" && !!entry.assessment;

        return (
          <SignalNode
            key={entry.id}
            tone={tone}
            indent={i % 2 === 0 ? 1 : 0}
            spike={entry.isFresh && entry.status === "done"}
            className="animate-in fade-in slide-in-from-top-2 duration-500"
          >
            <div className="rounded-lg border border-hairline bg-card p-5 text-card-foreground shadow-lg shadow-black/20">
              {entry.collapsed && canToggle && entry.assessment ? (
                <button
                  type="button"
                  onClick={() => toggleCollapsed(entry.id)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <span className="flex items-center gap-3">
                    <RiskBadge level={entry.assessment.riskScore.risk_level} />
                    <span className="text-sm text-card-foreground/60">
                      {entry.submittedAt.toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </span>
                  <span aria-hidden className="text-xs text-card-foreground/40">
                    Show details ▾
                  </span>
                </button>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-display text-base italic text-card-foreground/70">
                      &ldquo;{entry.reportText}&rdquo;
                    </p>
                    {canToggle && (
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(entry.id)}
                        className="shrink-0 text-xs text-card-foreground/40 hover:text-card-foreground/70"
                      >
                        Collapse ▴
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-card-foreground/40">{entry.submittedAt.toLocaleString()}</p>

                  <div className="mt-4 border-t border-card-foreground/10 pt-4">
                    {entry.status === "loading" && (
                      <p className="text-sm text-card-foreground/60">
                        {entry.extracted ? "Assessing risk…" : "Extracting entities…"}
                      </p>
                    )}
                    {entry.status === "error" && <p className="text-sm text-signal-coral">{entry.error}</p>}
                    {entry.status === "done" && entry.assessment && (
                      <AssessmentDetail assessment={entry.assessment} />
                    )}
                    {entry.saveError && <p className="mt-3 text-xs text-signal-amber">{entry.saveError}</p>}
                  </div>
                </>
              )}
            </div>
          </SignalNode>
        );
      })}
    </SignalLine>
  );
}
