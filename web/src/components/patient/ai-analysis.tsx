"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { cn } from "@/lib/utils";
import { runFullAssessment, type AssessCallId } from "@/lib/assess";
import type { Assessment } from "@/lib/types";

type GroupId = AssessCallId | "save";
type GroupStatus = "pending" | "active" | "done";

/**
 * Each row here is backed by one of the 6 real network calls the
 * pipeline actually makes (see lib/assess.ts) — rows sharing a `group`
 * share that call's real start/done timing. Per docs/design-brief.md's
 * motion rule, a row only ever flips to "done" when its real call
 * resolves; nothing here is a fixed timer standing in for work that
 * isn't happening. "Clustering" is deliberately not listed — it's a
 * cross-report admin/doctor feature, not part of a single submission.
 */
const STAGES: Array<{ id: string; group: GroupId; label: string }> = [
  { id: "preprocess", group: "extract", label: "Preprocessing your report text" },
  { id: "biobert", group: "extract", label: "BioBERT reading the biomedical language" },
  { id: "ner", group: "extract", label: "Extracting drugs, symptoms, dosage & duration" },
  { id: "classify", group: "classify", label: "Classifying for a genuine adverse-event pattern" },
  { id: "kg", group: "interaction", label: "Looking up known interactions in the drug graph" },
  { id: "gnn", group: "interaction", label: "Running the graph neural network prediction" },
  { id: "embed", group: "evidence", label: "Generating an embedding for similarity search" },
  { id: "evidence", group: "evidence", label: "Searching PubMed, DrugBank & FDA evidence" },
  { id: "risk", group: "risk", label: "Fusing everything into an explainable risk score" },
  { id: "save", group: "save", label: "Saving to your case history" },
];

interface AiAnalysisProps {
  reportText: string;
  onComplete: (assessment: Assessment, saveError?: string) => void;
  onError: (message: string) => void;
}

export function AiAnalysis({ reportText, onComplete, onError }: AiAnalysisProps) {
  const [groupStatus, setGroupStatus] = useState<Record<GroupId, GroupStatus>>({
    extract: "pending",
    classify: "pending",
    interaction: "pending",
    evidence: "pending",
    risk: "pending",
    save: "pending",
  });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function run() {
      try {
        const assessment = await runFullAssessment(reportText, (event) => {
          setGroupStatus((prev) => ({ ...prev, [event.call]: event.status === "start" ? "active" : "done" }));
        });

        setGroupStatus((prev) => ({ ...prev, save: "active" }));
        let saveError: string | undefined;
        try {
          const saveRes = await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reportText, assessment }),
          });
          if (!saveRes.ok) saveError = "This result wasn't saved to your history.";
        } catch {
          saveError = "This result wasn't saved to your history.";
        }
        setGroupStatus((prev) => ({ ...prev, save: "done" }));

        onComplete(assessment, saveError);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Something went wrong during analysis.");
      }
    }
    run();
  }, [reportText, onComplete, onError]);

  return (
    <GlassCard className="mx-auto flex max-w-xl flex-col gap-0.5 p-8">
      {STAGES.map((stage, i) => {
        const status = groupStatus[stage.group];
        return (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            className="flex items-center gap-3 py-2"
          >
            <span className="flex size-5 shrink-0 items-center justify-center">
              {status === "done" ? (
                <Check className="size-4 text-risk-low" />
              ) : status === "active" ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <span className="size-2 rounded-full bg-muted-foreground/30" />
              )}
            </span>
            <span
              className={cn(
                "text-sm",
                status === "pending" && "text-muted-foreground/60",
                status === "active" && "font-medium text-foreground",
                status === "done" && "text-muted-foreground",
              )}
            >
              {stage.label}
            </span>
          </motion.div>
        );
      })}
    </GlassCard>
  );
}
