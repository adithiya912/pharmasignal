"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Search } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import type { EvidenceResponse, EvidenceSourceType } from "@/lib/types";

const sourceTone: Record<EvidenceSourceType, string> = {
  PubMed: "bg-risk-low/15 text-risk-low",
  DrugBank: "bg-primary/15 text-primary",
  FDA: "bg-risk-medium/15 text-risk-medium",
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; query: string; result: EvidenceResponse }
  | { status: "error"; message: string };

export function EvidenceExplorer() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/retrieve-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Search failed");
      setState({ status: "done", query, result: data });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Search failed" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a drug, disease, or symptom — e.g. warfarin bleeding risk"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={state.status === "loading" || !query.trim()}>
          {state.status === "loading" ? "Searching…" : "Search"}
        </Button>
      </form>

      {state.status === "error" && (
        <EmptyState icon={Search} title="Search failed" description={state.message} />
      )}

      {state.status === "done" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {state.result.sources.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matches"
              description={`No literature in the corpus matched "${state.query}".`}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {state.result.sources.map((s, i) => (
                <GlassCard key={i} className="flex flex-col gap-2 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sourceTone[s.source]}`}>
                      {s.source}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      relevance {s.relevance.toFixed(2)}
                    </span>
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm font-medium text-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground"
                  >
                    <ExternalLink className="size-3.5 shrink-0" />
                    {s.title}
                  </a>
                </GlassCard>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {state.status === "idle" && (
        <p className="text-sm text-muted-foreground">
          Searches a corpus of PubMed case reports, DrugBank interaction pages, and FDA/DailyMed
          labels — a research prototype covering ibuprofen, metformin, warfarin, and amoxicillin
          most thoroughly. See docs/features.md for the full known-coverage note.
        </p>
      )}
    </div>
  );
}
