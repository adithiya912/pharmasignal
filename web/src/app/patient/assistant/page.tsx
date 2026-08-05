import { PageHeader } from "@/components/page-header";
import { AssistantChat } from "@/components/patient/assistant-chat";

export default function AiAssistantPage() {
  return (
    <div>
      <PageHeader
        title="AI Health Assistant"
        description="Evidence-based answers to medicine questions, with citations."
      />
      <AssistantChat />
    </div>
  );
}
