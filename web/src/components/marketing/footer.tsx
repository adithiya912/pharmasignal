import Link from "next/link";
import { Activity } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="brand-gradient-bg flex size-7 items-center justify-center rounded-lg text-white">
            <Activity className="size-3.5" />
          </span>
          <span className="text-sm font-medium text-foreground">PharmaSignal</span>
        </div>
        <p className="text-xs text-muted-foreground">
          A research prototype for AI-assisted pharmacovigilance. Not a substitute for medical advice.
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Link href="/sign-in" className="hover:text-foreground">
            Log in
          </Link>
          <Link href="/sign-up" className="hover:text-foreground">
            Get started
          </Link>
        </div>
      </div>
    </footer>
  );
}
