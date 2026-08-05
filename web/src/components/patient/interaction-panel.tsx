"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ExternalLink, FlaskConical } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SEED_DRUGS } from "@/lib/seed-drugs";
import type { EvidenceResponse, PredictInteractionResponse } from "@/lib/types";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error ?? `Request to ${path} failed (${res.status})`);
  }
  return res.json();
}

type Tone = "low" | "medium" | "high";

const toneClass: Record<Tone, string> = {
  low: "bg-risk-low/15 text-risk-low border-risk-low/30",
  medium: "bg-risk-medium/15 text-risk-medium border-risk-medium/30",
  high: "bg-risk-high/15 text-risk-high border-risk-high/40",
};

function interactionTone(interaction: PredictInteractionResponse): Tone {
  if (interaction.evidence === "major") return "high";
  if (interaction.evidence === "moderate" || interaction.evidence === "weak") return "medium";
  if (interaction.interaction_predicted) return "medium";
  return "low";
}

function interactionLabel(interaction: PredictInteractionResponse): string {
  if (interaction.evidence) return `${interaction.evidence} evidence interaction`;
  if (interaction.interaction_predicted) return "possible interaction (model-inferred)";
  return "no known interaction";
}

/** Mirrors ml-services/app/risk_score.py's honest-language conventions
 * (evidence tier is the primary signal, GNN confidence is a caveated
 * fallback only for pairs with no direct graph edge) as UI copy, without
 * re-implementing the scoring logic itself. */
function explanationFor(interaction: PredictInteractionResponse, drugA: string, drugB: string): string {
  const path = interaction.graph_path.length > 0 ? interaction.graph_path.join(" → ") : "no graph path found";

  if (interaction.evidence === "major") {
    return `Documented major interaction between ${drugA} and ${drugB} (${path}).`;
  }
  if (interaction.evidence === "moderate" || interaction.evidence === "weak") {
    return `Documented ${interaction.evidence}-evidence interaction between ${drugA} and ${drugB} (${path}).`;
  }
  if (interaction.interaction_predicted) {
    return (
      `No documented interaction in the drug graph, but the trained model flagged a possible ` +
      `structural link (${path}, model confidence ${interaction.confidence.toFixed(2)}) — not a ` +
      `confirmed interaction. This model is a proof-of-concept trained on a 9-edge seed graph; ` +
      `treat this signal with caution, not certainty.`
    );
  }
  return `No documented or model-predicted interaction found between ${drugA} and ${drugB}.`;
}

interface CheckState {
  status: "idle" | "loading" | "done" | "error";
  drugA?: string;
  drugB?: string;
  interaction?: PredictInteractionResponse;
  evidence?: EvidenceResponse;
  error?: string;
}

export function InteractionPanel() {
  const [drugA, setDrugA] = useState(SEED_DRUGS[0]);
  const [drugB, setDrugB] = useState(SEED_DRUGS[1]);
  const [state, setState] = useState<CheckState>({ status: "idle" });

  async function handleCheck(e: FormEvent) {
    e.preventDefault();
    if (drugA === drugB) {
      setState({ status: "error", error: "Choose two different drugs." });
      return;
    }
    setState({ status: "loading" });
    try {
      const interaction = await postJson<PredictInteractionResponse>("/api/predict-interaction", {
        drug_a: drugA,
        drug_b: drugB,
      });
      const evidence = await postJson<EvidenceResponse>("/api/retrieve-evidence", {
        query: `${drugA} ${drugB}`,
      });
      setState({ status: "done", drugA, drugB, interaction, evidence });
    } catch (err) {
      setState({ status: "error", error: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <GlassCard className="p-6">
        <form onSubmit={handleCheck} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FlaskConical className="size-4 text-primary" />
            Check two drugs for a known or predicted interaction
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label>Drug A</Label>
              <Select value={drugA} onValueChange={(v) => v && setDrugA(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEED_DRUGS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Drug B</Label>
              <Select value={drugB} onValueChange={(v) => v && setDrugB(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEED_DRUGS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={state.status === "loading"}>
              {state.status === "loading" ? "Checking…" : "Check interaction"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Limited to the {SEED_DRUGS.length} drugs currently seeded in the interaction graph — this is a research
            prototype, not a full drug database.
          </p>
          {state.status === "error" && <p className="text-sm text-risk-high">{state.error}</p>}
        </form>
      </GlassCard>

      {state.status === "done" && state.interaction && state.evidence && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <GlassCard className="flex flex-col gap-4 p-6">
            <span
              className={cn(
                "inline-block w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase",
                toneClass[interactionTone(state.interaction)],
              )}
            >
              {interactionLabel(state.interaction)}
            </span>
            <p className="text-[0.95rem] leading-relaxed text-foreground">
              {explanationFor(state.interaction, state.drugA!, state.drugB!)}
            </p>

            {state.evidence.sources.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Evidence</h3>
                <ul className="flex flex-col gap-1.5">
                  {state.evidence.sources.map((s, i) => (
                    <li key={i}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm text-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground"
                      >
                        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                        {s.title} <span className="font-mono text-xs text-muted-foreground">[{s.source}]</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
