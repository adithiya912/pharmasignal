import { redirect } from "next/navigation";
import { isCurrentUserDoctor } from "@/lib/roles";

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const authorized = await isCurrentUserDoctor();
  if (!authorized) {
    redirect("/");
  }

  return <>{children}</>;
}
