"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SignalLine, SignalNode } from "@/components/signal-line";
import { runFullAssessment } from "@/lib/assess";
import type { Assessment, ExtractResponse, RiskLevel } from "@/lib/types";

interface ReportEntry {
  id: string;
  reportText: string;
  submittedAt: Date;
  status: "loading" | "done" | "error";
  extracted?: ExtractResponse;
  assessment?: Assessment;
  error?: string;
}

const riskTone: Record<RiskLevel, "sage" | "amber" | "coral"> = {
  low: "sage",
  medium: "amber",
  high: "coral",
};

const riskBadgeClass: Record<RiskLevel, string> = {
  low: "bg-signal-sage/15 text-signal-sage border-signal-sage/30",
  medium: "bg-signal-amber/15 text-signal-amber border-signal-amber/30",
  high: "bg-signal-coral/15 text-signal-coral border-signal-coral/40",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-4">
      <span className="w-24 shrink-0 pt-0.5 text-xs tracking-wide text-card-foreground/50 uppercase">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function EntityList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <span className="font-data text-sm text-card-foreground/35">none detected</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="rounded border border-card-foreground/15 bg-card-foreground/5 px-1.5 py-0.5 font-data text-sm"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/** ml-services formats contributing_sources as "Title [Source] url" —
 * split it back apart so the URL can be a real link. */
function parseSource(raw: string): { title: string; sourceType: string; url: string } | null {
  const match = raw.match(/^(.*)\s\[(.+)\]\s(\S+)$/);
  if (!match) return null;
  return { title: match[1], sourceType: match[2], url: match[3] };
}

function AssessmentDetail({ assessment }: { assessment: Assessment }) {
  const { riskScore, extracted } = assessment;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <span
          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${riskBadgeClass[riskScore.risk_level]}`}
        >
          {riskScore.risk_level} risk
        </span>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-card-foreground">{riskScore.explanation}</p>
      </div>

      {riskScore.contributing_reports.length > 0 && (
        <Field label="Basis">
          <EntityList items={riskScore.contributing_reports} />
        </Field>
      )}

      {riskScore.contributing_sources.length > 0 && (
        <Field label="Evidence">
          <ul className="flex flex-col gap-1">
            {riskScore.contributing_sources.map((raw, i) => {
              const parsed = parseSource(raw);
              return (
                <li key={i} className="text-sm">
                  {parsed ? (
                    <a
                      href={parsed.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-card-foreground underline decoration-card-foreground/30 underline-offset-2 hover:decoration-card-foreground"
                    >
                      {parsed.title}{" "}
                      <span className="font-data text-xs text-card-foreground/50">[{parsed.sourceType}]</span>
                    </a>
                  ) : (
                    <span>{raw}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Field>
      )}

      <details className="group mt-1 border-t border-card-foreground/10 pt-3">
        <summary className="cursor-pointer text-xs tracking-wide text-card-foreground/50 uppercase select-none">
          Extracted details
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <Field label="Drugs">
            <EntityList items={extracted.drugs} />
          </Field>
          <Field label="Symptoms">
            <EntityList items={extracted.symptoms} />
          </Field>
          <Field label="Dosages">
            <EntityList items={extracted.dosages} />
          </Field>
          <Field label="Duration">
            <span className="font-data text-sm">{extracted.duration || "—"}</span>
          </Field>
          <Field label="Severity (extracted)">
            <span className="font-data text-sm capitalize">{extracted.severity}</span>
          </Field>
        </div>
      </details>
    </div>
  );
}

export function ReportForm() {
  const [reportText, setReportText] = useState("");
  const [entries, setEntries] = useState<ReportEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = reportText.trim();
    if (!text || submitting) return;

    const id = crypto.randomUUID();
    const entry: ReportEntry = { id, reportText: text, submittedAt: new Date(), status: "loading" };
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
      setEntries((prev) => (prev.map((it) => (it.id === id ? { ...it, status: "done", assessment } : it))));
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
              This sends your report for a full risk assessment.
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

        return (
          <SignalNode
            key={entry.id}
            tone={tone}
            indent={i % 2 === 0 ? 1 : 0}
            spike={entry.status === "done"}
            className="animate-in fade-in slide-in-from-top-2 duration-500"
          >
            <div className="rounded-lg border border-hairline bg-card p-5 text-card-foreground shadow-lg shadow-black/20">
              <p className="font-display text-base italic text-card-foreground/70">
                &ldquo;{entry.reportText}&rdquo;
              </p>
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
              </div>
            </div>
          </SignalNode>
        );
      })}
    </SignalLine>
  );
}
