import { motion } from "framer-motion";
import { ExternalLink, Stethoscope, ListChecks } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { RiskBadge } from "@/components/risk-badge";
import { nextStepsFor, MEDICAL_DISCLAIMER } from "@/lib/report-copy";
import type { Assessment } from "@/lib/types";

function interactionSummary(pair: Assessment["checkedPairs"][number]) {
  const { drug_a, drug_b, result } = pair;
  if (result.evidence) return `${drug_a} + ${drug_b} — documented ${result.evidence} interaction`;
  if (result.interaction_predicted)
    return `${drug_a} + ${drug_b} — possible interaction (model-predicted, confidence ${result.confidence.toFixed(2)})`;
  return `${drug_a} + ${drug_b} — no known or predicted interaction`;
}

/**
 * A freshly-submitted assessment carries every checked pair; a report
 * reloaded from Supabase only has the single representative `interaction`
 * (assessmentFromPersistedReport in lib/types.ts doesn't persist
 * checkedPairs). Falling back to that single stored result — instead of
 * just saying "no pair checked" — keeps history detail accurate for the
 * common 2-drug case; it's a best-effort label for 3+ drugs since which
 * exact pair produced the stored result isn't recoverable from history.
 */
function displayedPairs(assessment: Assessment): Assessment["checkedPairs"] {
  if (assessment.checkedPairs.length > 0) return assessment.checkedPairs;
  const [drug_a, drug_b] = assessment.extracted.drugs;
  if (drug_a && drug_b) return [{ drug_a, drug_b, result: assessment.interaction }];
  return [];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-sm text-muted-foreground">None detected</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs text-foreground">
          {item}
        </span>
      ))}
    </div>
  );
}

/**
 * The final report — reused by both a fresh submission and "My Reports"
 * history detail, so the two never drift apart. Every field here is a
 * real backend output; "Suggested next steps" is the one section built
 * from static rule-based copy (lib/report-copy.ts) keyed off the real
 * risk_level, not an AI-generated recommendation.
 */
export function ReportResult({ assessment, saveError }: { assessment: Assessment; saveError?: string }) {
  const { extracted, classification, evidence, riskScore } = assessment;
  const pairs = displayedPairs(assessment);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4"
    >
      <GlassCard className="flex flex-col gap-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <RiskBadge level={riskScore.risk_level} className="text-sm" />
          <span className="font-mono text-xs text-muted-foreground">
            Detection confidence: {(classification.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <p className="text-[0.95rem] leading-relaxed text-foreground">{riskScore.explanation}</p>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <GlassCard className="p-6">
          <Section title="Detected drugs">
            <TagList items={extracted.drugs} />
          </Section>
        </GlassCard>
        <GlassCard className="p-6">
          <Section title="Detected symptoms">
            <TagList items={extracted.symptoms} />
          </Section>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <Section title="Possible drug interactions">
          {pairs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Fewer than two drugs were detected, so no pair was checked.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {pairs.map((pair, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <ListChecks className="size-3.5 shrink-0 text-muted-foreground" />
                  {interactionSummary(pair)}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </GlassCard>

      <GlassCard className="p-6">
        <Section title="Evidence & references">
          {evidence.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching literature was found for this report.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {evidence.sources.map((source, i) => (
                <li key={i}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm text-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground"
                  >
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                    {source.title}
                    <span className="font-mono text-xs text-muted-foreground">[{source.source}]</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <GlassCard className="flex flex-col gap-2 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ListChecks className="size-4 text-primary" />
            Suggested next step
          </div>
          <p className="text-sm text-muted-foreground">{nextStepsFor(riskScore.risk_level)}</p>
        </GlassCard>
        <GlassCard className="flex flex-col gap-2 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Stethoscope className="size-4 text-primary" />
            Doctor visibility
          </div>
          <p className="text-sm text-muted-foreground">
            This report is visible to doctors with review access on PharmaSignal. For personalized guidance, discuss
            it directly with your prescriber.
          </p>
        </GlassCard>
      </div>

      <details className="group rounded-2xl border border-border p-4">
        <summary className="cursor-pointer text-xs font-medium tracking-wide text-muted-foreground uppercase select-none">
          Extracted details (as understood by the AI)
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Section title="Dosages">
            <TagList items={extracted.dosages} />
          </Section>
          <Section title="Duration">
            <span className="font-mono text-sm text-foreground">{extracted.duration || "—"}</span>
          </Section>
          <Section title="Extracted severity">
            <span className="font-mono text-sm text-foreground capitalize">{extracted.severity}</span>
          </Section>
        </div>
      </details>

      {saveError && <p className="text-xs text-risk-medium">{saveError}</p>}
      <p className="text-xs text-muted-foreground">{MEDICAL_DISCLAIMER}</p>
    </motion.div>
  );
}
