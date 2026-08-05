import { Brain, Network, FlaskConical, ShieldAlert, Users, FileSearch } from "lucide-react";
import { GlassCard } from "@/components/glass-card";

const features = [
  {
    icon: Brain,
    title: "BioBERT entity extraction",
    description:
      "Free-text patient reports are parsed for drugs, dosages, duration and symptoms using a biomedical NER model, not keyword matching.",
  },
  {
    icon: Network,
    title: "Graph neural network",
    description:
      "A GNN trained over a Neo4j drug-interaction graph predicts previously unseen interactions, alongside documented evidence tiers for known ones.",
  },
  {
    icon: FlaskConical,
    title: "Literature-verified evidence",
    description:
      "Every claim is checked against a retrieval corpus of PubMed, DrugBank and FDA sources — risk scores never ship without citations.",
  },
  {
    icon: ShieldAlert,
    title: "Explainable risk scoring",
    description:
      "Low/medium/high risk levels come with a plain-language explanation and the exact reports and sources that drove the score.",
  },
  {
    icon: Users,
    title: "Three dedicated portals",
    description:
      "Patients, doctors and safety administrators each get a purpose-built workspace — not one dashboard reskinned three times.",
  },
  {
    icon: FileSearch,
    title: "Emerging signal detection",
    description:
      "Reports are embedded and clustered to surface adverse-event patterns across patients before they'd otherwise be noticed.",
  },
];

export function Features() {
  return (
    <section id="features" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Built for evidence, not vibes</h2>
          <p className="mt-3 text-muted-foreground">
            Every stage of the pipeline is a real model or a real lookup — nothing here is a mocked
            response standing in for a claim about your health.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <GlassCard key={feature.title} className="flex flex-col gap-3 p-6">
              <div className="brand-gradient-bg flex size-10 items-center justify-center rounded-lg text-white">
                <feature.icon className="size-5" />
              </div>
              <h3 className="font-medium text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
