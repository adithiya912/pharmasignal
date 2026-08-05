import { redirect } from "next/navigation";
import { getCurrentUserRole, roleHomePath } from "@/lib/roles";
import { AppShell } from "@/components/shell/app-shell";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const role = await getCurrentUserRole();
  if (role === null) redirect("/onboarding/role");
  if (role !== "patient") redirect(roleHomePath(role));

  return (
    <AppShell portalLabel="Patient" role="patient">
      {children}
    </AppShell>
  );
}
