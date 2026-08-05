import { GlassCard } from "@/components/glass-card";

const steps = [
  {
    step: "01",
    title: "Patient reports a side effect",
    description: "A free-text description of what happened, plus optional dosage/duration detail.",
  },
  {
    step: "02",
    title: "BioBERT extracts entities",
    description: "Drugs, symptoms, dosages and duration are pulled out of the raw text (POST /extract).",
  },
  {
    step: "03",
    title: "Adverse event classification",
    description: "The extracted entities are checked for a genuine adverse-event pattern (POST /classify).",
  },
  {
    step: "04",
    title: "GNN interaction prediction",
    description:
      "A graph neural network over the Neo4j drug graph flags known and previously-unseen interactions (POST /predict-interaction).",
  },
  {
    step: "05",
    title: "Literature retrieval",
    description: "Relevant PubMed, DrugBank and FDA sources are retrieved to support or contradict the finding (POST /retrieve-evidence).",
  },
  {
    step: "06",
    title: "Explainable risk score",
    description: "Everything fuses into a low/medium/high risk level with a plain-language explanation (POST /risk-score) — visible to the patient and, on review, their doctor.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mt-3 text-muted-foreground">
            The same six calls run on every report, in this order — nothing skipped, nothing invented.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s) => (
            <GlassCard key={s.step} className="flex flex-col gap-3 p-6">
              <span className="brand-gradient-text font-mono text-sm font-medium">{s.step}</span>
              <h3 className="font-medium text-foreground">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.description}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
