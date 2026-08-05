import Link from "next/link";
import { Moon, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GlassCard } from "@/components/glass-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PatientSettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Settings" />

      <GlassCard className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <Moon className="size-4 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Appearance</p>
            <p className="text-xs text-muted-foreground">Switch between light and dark mode.</p>
          </div>
        </div>
        <ThemeToggle />
      </GlassCard>

      <GlassCard className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-4 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Account & security</p>
            <p className="text-xs text-muted-foreground">Password, email, and connected accounts.</p>
          </div>
        </div>
        <Link href="/patient/profile" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Manage
        </Link>
      </GlassCard>
    </div>
  );
}
