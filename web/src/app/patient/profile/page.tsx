import { UserProfile } from "@clerk/nextjs";
import { PageHeader } from "@/components/page-header";

export default function PatientProfilePage() {
  return (
    <div>
      <PageHeader title="Profile" description="Manage your account details, email, and security." />
      <UserProfile
        routing="hash"
        appearance={{
          variables: { colorPrimary: "oklch(0.6 0.19 280)", fontFamily: "var(--font-body)", borderRadius: "0.75rem" },
          elements: { rootBox: "w-full", cardBox: "w-full shadow-none" },
        }}
      />
    </div>
  );
}
