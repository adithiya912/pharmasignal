"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";

export interface WizardStep {
  id: string;
  label: string;
}

interface StepperWizardProps {
  steps: WizardStep[];
  currentIndex: number;
  children: ReactNode;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  isSubmitting?: boolean;
}

/**
 * Generic multi-step wizard shell — built for the patient report form's
 * 7 steps but not specific to it, so any future multi-step flow reuses
 * this instead of hand-rolling stepper state again.
 */
export function StepperWizard({
  steps,
  currentIndex,
  children,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  backDisabled,
  isSubmitting,
}: StepperWizardProps) {
  const isLast = currentIndex === steps.length - 1;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <ol className="flex items-center gap-1.5">
        {steps.map((step, index) => {
          const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
          return (
            <li key={step.id} className="flex flex-1 flex-col gap-2">
              <div
                className={cn(
                  "h-1 rounded-full transition-colors",
                  state === "upcoming" ? "bg-muted" : "brand-gradient-bg",
                )}
              />
              <span
                className={cn(
                  "hidden text-xs sm:flex sm:items-center sm:gap-1",
                  state === "current" ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {state === "done" && <Check className="size-3" />}
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <GlassCard className="min-h-80 p-6 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={steps[currentIndex]?.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </GlassCard>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} disabled={currentIndex === 0 || backDisabled}>
          Back
        </Button>
        <Button onClick={onNext} disabled={nextDisabled || isSubmitting}>
          {isSubmitting ? "Submitting…" : nextLabel ?? (isLast ? "Review & submit" : "Continue")}
        </Button>
      </div>
    </div>
  );
}
