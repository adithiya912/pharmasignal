import { PageHeader } from "@/components/page-header";
import { NetworkView } from "@/components/doctor/network-view";

export default function DrugInteractionNetworkPage() {
  return (
    <div>
      <PageHeader
        title="Drug interaction network"
        description="Every documented interaction in the graph. Click a drug to see its connections and supporting studies."
      />
      <NetworkView />
    </div>
  );
}
