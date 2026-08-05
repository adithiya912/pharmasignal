import { GlassCard } from "@/components/glass-card";
import { BookText, Microscope, GraduationCap } from "lucide-react";

const points = [
  {
    icon: BookText,
    title: "Sourced, not scraped blind",
    description:
      "Every entry in the evidence corpus (PubMed case reports, DrugBank interaction pages, FDA/DailyMed labels) was independently verified against the live source before being indexed — no invented citations.",
  },
  {
    icon: Microscope,
    title: "Honest about scale",
    description:
      "This is a research prototype: the interaction graph and evidence corpus currently cover a small seed set of drugs, and the GNN's held-out accuracy is reported as-is, including where it underperforms — see docs/features.md.",
  },
  {
    icon: GraduationCap,
    title: "Built for extension",
    description:
      "The architecture (BioBERT extraction → GNN interaction prediction → RAG verification → fused risk score) is designed to scale to a full DrugBank-size interaction set and a production literature index.",
  },
];

/**
 * Replaces a generic marketing "testimonials" section with something
 * that's actually true of this project at its current stage — CLAUDE.md's
 * no-fabrication rule extends to not inventing fake user quotes.
 */
export function EvidenceBase() {
  return (
    <section id="evidence" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Research &amp; evidence base</h2>
          <p className="mt-3 text-muted-foreground">
            No testimonials — this is a research system. Here&apos;s what&apos;s actually true about it.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {points.map((p) => (
            <GlassCard key={p.title} className="flex flex-col gap-3 p-6">
              <p.icon className="size-5 text-primary" />
              <h3 className="font-medium text-foreground">{p.title}</h3>
              <p className="text-sm text-muted-foreground">{p.description}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
