import { PageHeader } from "@/components/page-header";
import { EvidenceExplorer } from "@/components/doctor/evidence-explorer";

export default function EvidenceExplorerPage() {
  return (
    <div>
      <PageHeader
        title="Evidence explorer"
        description="Search the retrieval corpus directly — PubMed, DrugBank, and FDA/DailyMed."
      />
      <EvidenceExplorer />
    </div>
  );
}
