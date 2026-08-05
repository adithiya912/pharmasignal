import { PageHeader } from "@/components/page-header";
import { InteractionPanel } from "@/components/patient/interaction-panel";

export default function PatientInteractionsPage() {
  return (
    <div>
      <PageHeader
        title="Drug interaction checker"
        description="Enter two drugs to check for a known or model-predicted interaction — no report needed."
      />
      <InteractionPanel />
    </div>
  );
}
