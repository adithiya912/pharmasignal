"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { SignalLine, SignalNode } from "@/components/signal-line";
import { Field } from "@/components/assessment-detail";
import type { EvidenceResponse, PredictInteractionResponse } from "@/lib/types";

/** The 9 drugs currently seeded in Neo4j (ml-services/scripts/seed_graph.py's
 * DRUGS list) — a dropdown avoids typos/name-mismatches against the exact
 * node names /predict-interaction looks up. Static on purpose: this is a UI
 * convenience list, not read from Neo4j at request time, so it needs a
 * manual update if the seed graph ever changes. */
const SEED_DRUGS = [
  "amoxicillin",
  "aspirin",
  "ciprofloxacin",
  "fluconazole",
  "ibuprofen",
  "metformin",
  "omeprazole",
  "sulfamethoxazole-trimethoprim",
  "warfarin",
];

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

type Tone = "sage" | "amber" | "coral";

const toneBadgeClass: Record<Tone, string> = {
  sage: "bg-signal-sage/15 text-signal-sage border-signal-sage/30",
  amber: "bg-signal-amber/15 text-signal-amber border-signal-amber/30",
  coral: "bg-signal-coral/15 text-signal-coral border-signal-coral/40",
};

function interactionTone(interaction: PredictInteractionResponse): Tone {
  if (interaction.evidence === "major") return "coral";
  if (interaction.evidence === "moderate" || interaction.evidence === "weak") return "amber";
  if (interaction.interaction_predicted) return "amber";
  return "sage";
}

function interactionLabel(interaction: PredictInteractionResponse): string {
  if (interaction.evidence) return `${interaction.evidence} evidence interaction`;
  if (interaction.interaction_predicted) return "possible interaction (model-inferred)";
  return "no known interaction";
}

/** Mirrors risk_score.py's honest-language conventions (evidence tier is
 * the primary signal, GNN confidence is a caveated fallback only for pairs
 * with no direct graph edge) without importing any ml-services code —
 * this is UI copy, not a re-implementation of the scoring logic. */
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

export function InteractionChecker() {
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
    <SignalLine>
      <SignalNode tone="sage">
        <form
          onSubmit={handleCheck}
          className="rounded-lg border border-hairline bg-card p-5 text-card-foreground shadow-lg shadow-black/20"
        >
          <h2 className="font-display text-lg italic text-card-foreground/70">Check an interaction</h2>
          <p className="mt-1 mb-4 text-sm text-card-foreground/60">
            Pick two drugs to check for a known or model-predicted interaction — no report needed.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-xs tracking-wide text-card-foreground/50 uppercase">Drug A</span>
              <select
                value={drugA}
                onChange={(e) => setDrugA(e.target.value)}
                className="w-full rounded-md border border-card-foreground/15 bg-background/40 px-2.5 py-1.5 font-data text-sm text-card-foreground"
              >
                {SEED_DRUGS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-xs tracking-wide text-card-foreground/50 uppercase">Drug B</span>
              <select
                value={drugB}
                onChange={(e) => setDrugB(e.target.value)}
                className="w-full rounded-md border border-card-foreground/15 bg-background/40 px-2.5 py-1.5 font-data text-sm text-card-foreground"
              >
                {SEED_DRUGS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={state.status === "loading"}>
              {state.status === "loading" ? "Checking…" : "Check interaction"}
            </Button>
          </div>
          {state.status === "error" && <p className="mt-3 text-sm text-signal-coral">{state.error}</p>}
        </form>
      </SignalNode>

      {state.status === "done" && state.interaction && state.evidence && (
        <SignalNode tone={interactionTone(state.interaction)} spike>
          <div className="rounded-lg border border-hairline bg-card p-5 text-card-foreground shadow-lg shadow-black/20">
            <span
              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${toneBadgeClass[interactionTone(state.interaction)]}`}
            >
              {interactionLabel(state.interaction)}
            </span>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-card-foreground">
              {explanationFor(state.interaction, state.drugA!, state.drugB!)}
            </p>

            {state.evidence.sources.length > 0 && (
              <Field label="Evidence">
                <ul className="mt-1 flex flex-col gap-1">
                  {state.evidence.sources.map((s, i) => (
                    <li key={i} className="text-sm">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-card-foreground underline decoration-card-foreground/30 underline-offset-2 hover:decoration-card-foreground"
                      >
                        {s.title} <span className="font-data text-xs text-card-foreground/50">[{s.source}]</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </Field>
            )}
          </div>
        </SignalNode>
      )}
    </SignalLine>
  );
}
