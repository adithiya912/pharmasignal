import { PageHeader } from "@/components/page-header";
import { NetworkView } from "@/components/doctor/network-view";

export default function AdminKnowledgeGraphPage() {
  return (
    <div>
      <PageHeader
        title="Knowledge graph"
        description="The full drug interaction graph backing every prediction — same data the GNN trains on."
      />
      <NetworkView />
    </div>
  );
}
