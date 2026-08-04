import { UserButton } from "@clerk/nextjs";
import { InteractionChecker } from "@/components/interaction-checker";

export default function InteractionsPage() {
  return (
    <div className="flex-1 bg-navy">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-10 pb-4 sm:px-8">
        <div>
          <p className="font-display text-2xl text-foreground">PharmaSignal</p>
          <p className="text-sm text-muted-foreground">Check a drug interaction</p>
        </div>
        <UserButton />
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 sm:px-8">
        <InteractionChecker />
      </main>
    </div>
  );
}
