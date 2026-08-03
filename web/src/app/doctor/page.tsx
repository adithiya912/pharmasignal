import { UserButton } from "@clerk/nextjs";
import { DoctorQueue } from "@/components/doctor-queue";
import { TrendingClusters } from "@/components/trending-clusters";
import { clusterReports } from "@/lib/admin-insights";
import { listAllReportsForDoctor } from "@/lib/reports";

export default async function DoctorPage() {
  const reports = await listAllReportsForDoctor();

  let clusters = null;
  let clusterError: string | undefined;
  try {
    clusters = await clusterReports(reports);
  } catch (err) {
    clusterError = err instanceof Error ? err.message : "Unknown error";
  }

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
        <section className="mb-10">
          <h2 className="mb-4 font-display text-lg italic text-foreground/70">Trending</h2>
          <TrendingClusters clusters={clusters} error={clusterError} />
        </section>

        <DoctorQueue reports={reports} />
      </main>
    </div>
  );
}
