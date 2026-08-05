"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Stethoscope, User, ShieldCheck, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/roles";

const roles: Array<{ id: UserRole; title: string; description: string; icon: typeof User }> = [
  {
    id: "patient",
    title: "Patient",
    description: "Report side effects, check drug interactions, and track your own risk history.",
    icon: User,
  },
  {
    id: "doctor",
    title: "Doctor",
    description: "Review incoming patient reports, explore the interaction network, and monitor emerging signals.",
    icon: Stethoscope,
  },
  {
    id: "admin",
    title: "Administrator",
    description: "Monitor the platform, manage users, and oversee model and system health.",
    icon: ShieldCheck,
  },
];

export default function RolePickerPage() {
  const router = useRouter();
  const { user } = useUser();
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selected }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not set your role.");
      }
      await user?.reload();
      router.push(`/${selected}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center gap-10 px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">How will you use PharmaSignal?</h1>
        <p className="mt-2 text-muted-foreground">Pick a role to set up your workspace. You can change this later.</p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-3">
        {roles.map((role) => {
          const Icon = role.icon;
          const active = selected === role.id;
          return (
            <motion.button
              key={role.id}
              type="button"
              onClick={() => setSelected(role.id)}
              whileTap={{ scale: 0.98 }}
              className="text-left"
            >
              <GlassCard
                className={cn(
                  "flex h-full flex-col gap-3 p-6 transition-colors",
                  active ? "border-primary ring-2 ring-primary/50" : "hover:border-primary/40",
                )}
              >
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg",
                    active ? "brand-gradient-bg text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <h2 className="font-medium text-foreground">{role.title}</h2>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </GlassCard>
            </motion.button>
          );
        })}
      </div>

      {error && <p className="text-sm text-risk-high">{error}</p>}

      <Button size="lg" disabled={!selected || submitting} onClick={confirm}>
        {submitting ? "Setting up your workspace…" : "Continue"} <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
