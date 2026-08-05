import { redirect } from "next/navigation";
import { getCurrentUserRole, roleHomePath } from "@/lib/roles";
import { AppShell } from "@/components/shell/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getCurrentUserRole();
  if (role === null) redirect("/onboarding/role");
  if (role !== "admin") redirect(roleHomePath(role));

  return (
    <AppShell portalLabel="Administrator" role="admin">
      {children}
    </AppShell>
  );
}
