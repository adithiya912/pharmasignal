"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SignalLine, SignalNode } from "@/components/signal-line";
import type { ExtractResponse } from "@/lib/types";

interface ReportEntry {
  id: string;
  reportText: string;
  submittedAt: Date;
  status: "loading" | "done" | "error";
  result?: ExtractResponse;
  error?: string;
}

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

      const result: ExtractResponse = await res.json();
      setEntries((prev) => (prev.map((it) => (it.id === id ? { ...it, status: "done", result } : it))));
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
              This sends your report to the extraction service. Nothing is diagnosed yet.
            </span>
            <Button type="submit" disabled={submitting || !reportText.trim()}>
              {submitting ? "Processing…" : "Submit report"}
            </Button>
          </div>
        </form>
      </SignalNode>

      {entries.map((entry, i) => (
        <SignalNode
          key={entry.id}
          tone={entry.status === "error" ? "coral" : entry.status === "loading" ? "muted" : "sage"}
          indent={i % 2 === 0 ? 1 : 0}
          className="animate-in fade-in slide-in-from-top-2 duration-500"
        >
          <div className="rounded-lg border border-hairline bg-card p-5 text-card-foreground shadow-lg shadow-black/20">
            <p className="font-display text-base italic text-card-foreground/70">
              &ldquo;{entry.reportText}&rdquo;
            </p>
            <p className="mt-1 text-xs text-card-foreground/40">{entry.submittedAt.toLocaleString()}</p>

            <div className="mt-4 flex flex-col gap-3 border-t border-card-foreground/10 pt-4">
              {entry.status === "loading" && (
                <p className="text-sm text-card-foreground/60">Extracting entities…</p>
              )}
              {entry.status === "error" && <p className="text-sm text-signal-coral">{entry.error}</p>}
              {entry.status === "done" && entry.result && (
                <>
                  <Field label="Drugs">
                    <EntityList items={entry.result.drugs} />
                  </Field>
                  <Field label="Symptoms">
                    <EntityList items={entry.result.symptoms} />
                  </Field>
                  <Field label="Dosages">
                    <EntityList items={entry.result.dosages} />
                  </Field>
                  <Field label="Duration">
                    <span className="font-data text-sm">{entry.result.duration || "—"}</span>
                  </Field>
                  <Field label="Severity">
                    <span className="font-data text-sm capitalize">{entry.result.severity}</span>
                  </Field>
                </>
              )}
            </div>
          </div>
        </SignalNode>
      ))}
    </SignalLine>
  );
}
