import { UserButton } from "@clerk/nextjs";
import { DoctorQueue } from "@/components/doctor-queue";
import { listAllReportsForDoctor } from "@/lib/reports";

export default async function DoctorPage() {
  const reports = await listAllReportsForDoctor();

  return (
    <div className="flex-1 bg-navy">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-10 pb-4 sm:px-8">
        <div>
          <p className="font-display text-2xl text-foreground">PharmaSignal</p>
          <p className="text-sm text-muted-foreground">Triage queue — all patients</p>
        </div>
        <UserButton />
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 sm:px-8">
        <DoctorQueue reports={reports} />
      </main>
    </div>
  );
}
