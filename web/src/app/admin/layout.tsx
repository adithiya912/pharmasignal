import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/roles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authorized = await isCurrentUserAdmin();
  if (!authorized) {
    redirect("/");
  }

  return <>{children}</>;
}
