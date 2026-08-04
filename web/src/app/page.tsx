import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { ReportForm } from "@/components/report-form";
import { listReportsForUser } from "@/lib/reports";

export default async function Home() {
  const user = await currentUser();
  const initialReports = user ? await listReportsForUser(user.id) : [];

  return (
    <div className="flex-1 bg-navy">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-10 pb-4 sm:px-8">
        <div>
          <p className="font-display text-2xl text-foreground">PharmaSignal</p>
          <p className="text-sm text-muted-foreground">
            {user?.firstName ? `Case history — ${user.firstName}` : "Your case history"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/interactions"
            className="rounded-md border border-hairline px-3 py-1.5 text-sm text-foreground/80 hover:bg-foreground/5"
          >
            Check an interaction
          </a>
          <UserButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 sm:px-8">
        <ReportForm initialReports={initialReports} />
      </main>
    </div>
  );
}
