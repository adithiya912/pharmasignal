"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, X, Waypoints } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GlassCard } from "@/components/glass-card";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReportResult } from "@/components/patient/report-result";
import { InteractionGraph } from "@/components/doctor/interaction-graph";
import { assessmentFromPersistedReport } from "@/lib/types";
import type { GraphResponse, PersistedReport, ReviewStatus } from "@/lib/types";

interface ReportDetailProps {
  report: PersistedReport;
  clusterLabel: string | null;
  clusterSize: number | null;
  clusterError?: string;
}

async function fetchGraph(): Promise<GraphResponse> {
  const res = await fetch("/api/graph");
  if (!res.ok) throw new Error("Could not load the interaction graph");
  return res.json();
}

function patientLabel(patientUserId: string): string {
  const tail = patientUserId.replace(/^user_/, "").slice(-6).toUpperCase();
  return `Patient ${tail}`;
}

export function ReportDetail({ report, clusterLabel, clusterSize, clusterError }: ReportDetailProps) {
  const [notes, setNotes] = useState(report.doctor_notes ?? "");
  const [status, setStatus] = useState<ReviewStatus>(report.review_status ?? "pending");
  const [reviewedAt, setReviewedAt] = useState(report.reviewed_at ?? null);
  const [saving, setSaving] = useState<ReviewStatus | "notes" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: graph } = useQuery({ queryKey: ["graph"], queryFn: fetchGraph });

  async function save(next: { doctor_notes?: string; review_status?: ReviewStatus }, kind: ReviewStatus | "notes") {
    setSaving(kind);
    setSaveError(null);
    try {
      const res = await fetch(`/api/doctor/reports/${report.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to save");
      if (next.review_status) setStatus(next.review_status);
      setReviewedAt(data?.reviewed_at ?? new Date().toISOString());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/doctor/reports" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to reports
      </Link>

      <PageHeader
        title={patientLabel(report.patient_user_id)}
        description={new Date(report.created_at).toLocaleString()}
        actions={<RiskBadge level={report.risk_score.risk_level} className="text-sm" />}
      />

      <GlassCard className="p-6">
        <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Original patient narrative
        </h3>
        <p className="text-[0.95rem] leading-relaxed text-foreground italic">&ldquo;{report.report_text}&rdquo;</p>
      </GlassCard>

      <ReportResult assessment={assessmentFromPersistedReport(report)} />

      <GlassCard className="p-6">
        <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Cluster information
        </h3>
        {clusterError ? (
          <p className="text-sm text-risk-medium">Could not compute clusters: {clusterError}.</p>
        ) : clusterLabel ? (
          <p className="text-sm text-foreground">
            Part of a <span className="font-medium">{clusterLabel}</span> cluster with {clusterSize} report
            {clusterSize === 1 ? "" : "s"}.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            This report doesn&apos;t currently belong to a multi-report cluster.
          </p>
        )}
      </GlassCard>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <Waypoints className="size-3.5" />
          Knowledge graph — this patient&apos;s drugs highlighted
        </h3>
        {graph ? (
          <InteractionGraph graph={graph} highlightDrugs={report.extracted.drugs} compact />
        ) : (
          <GlassCard className="flex h-72 items-center justify-center p-6">
            <p className="text-sm text-muted-foreground">Loading graph…</p>
          </GlassCard>
        )}
      </div>

      <GlassCard className="p-6">
        <h3 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Timeline</h3>
        <ol className="flex flex-col gap-2 text-sm">
          <li className="flex items-center gap-2 text-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Report submitted — {new Date(report.created_at).toLocaleString()}
          </li>
          {reviewedAt && (
            <li className="flex items-center gap-2 text-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              Reviewed ({status}) — {new Date(reviewedAt).toLocaleString()}
            </li>
          )}
        </ol>
      </GlassCard>

      <GlassCard className="flex flex-col gap-4 p-6">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Doctor notes &amp; review
        </h3>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note for this case…"
          className="min-h-24"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled={saving === "notes"} onClick={() => save({ doctor_notes: notes }, "notes")}>
            {saving === "notes" ? "Saving…" : "Save comment"}
          </Button>
          <Button
            variant={status === "approved" ? "default" : "outline"}
            disabled={saving === "approved"}
            onClick={() => save({ review_status: "approved", doctor_notes: notes }, "approved")}
          >
            <Check className="size-4" /> {saving === "approved" ? "Saving…" : "Approve"}
          </Button>
          <Button
            variant={status === "rejected" ? "destructive" : "outline"}
            disabled={saving === "rejected"}
            onClick={() => save({ review_status: "rejected", doctor_notes: notes }, "rejected")}
          >
            <X className="size-4" /> {saving === "rejected" ? "Saving…" : "Reject"}
          </Button>
          <span className="text-xs text-muted-foreground capitalize">Current status: {status}</span>
        </div>
        {saveError && (
          <p className="text-xs text-risk-high">
            {saveError} — has supabase/migrations/0002_add_report_review_fields.sql been run?
          </p>
        )}
      </GlassCard>
    </div>
  );
}
