import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "Is this used for real clinical decisions?",
    a: "No. PharmaSignal is a research prototype (see the project's current phase in docs/features.md). Risk scores are explainable and evidence-backed, but the underlying interaction graph and GNN are trained on a small seed dataset and are not validated for clinical use.",
  },
  {
    q: "Where does the evidence come from?",
    a: "Retrieved passages are drawn from a corpus of PubMed case reports, DrugBank interaction pages, and FDA/DailyMed labels. Every source shown alongside a risk score is a real, clickable link — nothing is generated without a citation.",
  },
  {
    q: "How does the drug interaction prediction work?",
    a: "A graph neural network is trained over a Neo4j graph of documented drug-drug interactions. For pairs with a direct documented edge, the risk score uses that edge's evidence tier directly; for unseen pairs, it falls back to the GNN's prediction, capped at medium risk given the model's current training scale.",
  },
  {
    q: "Who can see a patient's reports?",
    a: "Only the patient themselves, and users granted the Doctor or Administrator role. Role checks are enforced independently in both the page and the underlying API route, not just hidden navigation.",
  },
  {
    q: "What happens if the ML service is down?",
    a: "The app fails honestly — you'll see an explicit error state, never a fabricated risk score or interaction result standing in for a real one.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked</h2>
        </div>
        <Accordion className="mt-10">
          {faqs.map((item, i) => (
            <AccordionItem key={item.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
