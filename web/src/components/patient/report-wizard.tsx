"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileCheck2 } from "lucide-react";
import { StepperWizard, type WizardStep } from "@/components/stepper-wizard";
import { TagInput } from "@/components/patient/tag-input";
import { AiAnalysis } from "@/components/patient/ai-analysis";
import { ReportResult } from "@/components/patient/report-result";
import { PageHeader } from "@/components/page-header";
import { GlassCard } from "@/components/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SEED_DRUGS, COMMON_SYMPTOMS } from "@/lib/seed-drugs";
import { composeReportText, type WizardAnswers } from "@/lib/report-copy";
import { cn } from "@/lib/utils";
import type { Assessment } from "@/lib/types";

const STEPS: WizardStep[] = [
  { id: "drugs", label: "Drugs" },
  { id: "dosage", label: "Dosage & duration" },
  { id: "symptoms", label: "Symptoms" },
  { id: "severity", label: "Severity" },
  { id: "comments", label: "Comments" },
  { id: "upload", label: "Attachment" },
  { id: "review", label: "Review & submit" },
];

const SEVERITIES: Array<{ id: WizardAnswers["severity"]; label: string }> = [
  { id: "low", label: "Low — mild, manageable" },
  { id: "medium", label: "Medium — noticeably affecting me" },
  { id: "high", label: "High — severe or worsening" },
  { id: "unknown", label: "Not sure" },
];

type Phase = "wizard" | "analyzing" | "result" | "error";

const emptyAnswers: WizardAnswers = {
  drugs: [],
  dosage: "",
  duration: "",
  symptoms: [],
  severity: "unknown",
  comments: "",
  attachmentName: undefined,
};

export function ReportWizardFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("wizard");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>(emptyAnswers);
  const [reportText, setReportText] = useState("");
  const [result, setResult] = useState<{ assessment: Assessment; saveError?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  function update<K extends keyof WizardAnswers>(key: K, value: WizardAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  const currentStepId = STEPS[stepIndex].id;
  const isLastStep = stepIndex === STEPS.length - 1;

  const canAdvance =
    currentStepId === "drugs" ? answers.drugs.length > 0 : currentStepId === "symptoms" ? answers.symptoms.length > 0 : true;

  function handleNext() {
    if (isLastStep) {
      const text = composeReportText(answers);
      setReportText(text);
      setPhase("analyzing");
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function handleBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  const handleComplete = useCallback((assessment: Assessment, saveError?: string) => {
    setResult({ assessment, saveError });
    setPhase("result");
  }, []);

  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
    setPhase("error");
  }, []);

  function startOver() {
    setAnswers(emptyAnswers);
    setStepIndex(0);
    setResult(null);
    setErrorMessage("");
    setPhase("wizard");
  }

  if (phase === "analyzing") {
    return (
      <div>
        <PageHeader title="Analyzing your report" description="Running the real AI pipeline — this takes a few seconds." />
        <AiAnalysis reportText={reportText} onComplete={handleComplete} onError={handleError} />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div>
        <PageHeader title="Something went wrong" />
        <GlassCard className="flex flex-col gap-4 p-6">
          <p className="text-sm text-risk-high">{errorMessage}</p>
          <Button variant="outline" className="w-fit" onClick={startOver}>
            Try again
          </Button>
        </GlassCard>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div>
        <PageHeader
          title="Your risk assessment"
          actions={
            <>
              <Button variant="outline" onClick={startOver}>
                Report another
              </Button>
              <Button onClick={() => router.push("/patient/reports")}>View all reports</Button>
            </>
          }
        />
        <ReportResult assessment={result.assessment} saveError={result.saveError} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Report a side effect"
        description="A few short steps — describe what happened in your own words where it helps."
      />
      <StepperWizard
        steps={STEPS}
        currentIndex={stepIndex}
        onBack={handleBack}
        onNext={handleNext}
        nextDisabled={!canAdvance}
        nextLabel={isLastStep ? "Submit report" : undefined}
      >
        {currentStepId === "drugs" && (
          <div className="flex flex-col gap-2">
            <Label>Which drug(s) are involved?</Label>
            <TagInput
              value={answers.drugs}
              onChange={(v) => update("drugs", v)}
              placeholder="Type a drug name and press Enter…"
              suggestions={SEED_DRUGS}
            />
          </div>
        )}

        {currentStepId === "dosage" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dosage">Dosage (optional)</Label>
              <Input
                id="dosage"
                value={answers.dosage}
                onChange={(e) => update("dosage", e.target.value)}
                placeholder="e.g. 400mg twice daily"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="duration">How long have you been taking it? (optional)</Label>
              <Input
                id="duration"
                value={answers.duration}
                onChange={(e) => update("duration", e.target.value)}
                placeholder="e.g. 2 weeks"
              />
            </div>
          </div>
        )}

        {currentStepId === "symptoms" && (
          <div className="flex flex-col gap-2">
            <Label>What symptoms did you experience?</Label>
            <TagInput
              value={answers.symptoms}
              onChange={(v) => update("symptoms", v)}
              placeholder="Type a symptom and press Enter…"
              suggestions={COMMON_SYMPTOMS}
            />
          </div>
        )}

        {currentStepId === "severity" && (
          <div className="flex flex-col gap-2">
            <Label>How severe would you say it was?</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {SEVERITIES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => update("severity", s.id)}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition-colors",
                    answers.severity === s.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStepId === "comments" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="comments">Anything else worth mentioning? (optional)</Label>
            <Textarea
              id="comments"
              value={answers.comments}
              onChange={(e) => update("comments", e.target.value)}
              placeholder="e.g. it started the morning after I doubled my dose…"
              className="min-h-32"
            />
          </div>
        )}

        {currentStepId === "upload" && (
          <div className="flex flex-col gap-3">
            <Label htmlFor="attachment">Upload a prescription or medical report (optional)</Label>
            <label
              htmlFor="attachment"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center hover:border-primary/40"
            >
              {answers.attachmentName ? (
                <>
                  <FileCheck2 className="size-6 text-primary" />
                  <span className="text-sm text-foreground">{answers.attachmentName}</span>
                </>
              ) : (
                <>
                  <Upload className="size-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to choose a file</span>
                </>
              )}
              <input
                id="attachment"
                type="file"
                className="hidden"
                onChange={(e) => update("attachmentName", e.target.files?.[0]?.name)}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Attachment storage isn&apos;t wired up in this build yet — the file name is noted for your records, but
              the file itself isn&apos;t uploaded or sent anywhere.
            </p>
          </div>
        )}

        {currentStepId === "review" && (
          <div className="flex flex-col gap-4">
            <Label>Review before submitting</Label>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Drugs</dt>
                <dd className="text-right text-foreground">{answers.drugs.join(", ") || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Dosage / duration</dt>
                <dd className="text-right text-foreground">
                  {[answers.dosage, answers.duration].filter(Boolean).join(" · ") || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Symptoms</dt>
                <dd className="text-right text-foreground">{answers.symptoms.join(", ") || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Severity</dt>
                <dd className="text-right text-foreground capitalize">{answers.severity}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Attachment</dt>
                <dd className="text-right text-foreground">{answers.attachmentName ?? "None"}</dd>
              </div>
            </dl>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Sent to the AI pipeline as
              </p>
              <p className="mt-1 text-sm text-foreground">{composeReportText(answers) || "—"}</p>
            </div>
          </div>
        )}
      </StepperWizard>
    </div>
  );
}
