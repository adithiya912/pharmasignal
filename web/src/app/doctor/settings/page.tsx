import { UserProfile } from "@clerk/nextjs";
import { Moon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GlassCard } from "@/components/glass-card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DoctorSettingsPage() {
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

      <UserProfile
        routing="hash"
        appearance={{
          variables: { colorPrimary: "oklch(0.6 0.19 280)", fontFamily: "var(--font-body)", borderRadius: "0.75rem" },
          elements: { rootBox: "w-full", cardBox: "w-full shadow-none" },
        }}
      />
    </div>
  );
}
