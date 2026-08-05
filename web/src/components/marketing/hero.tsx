"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { HeroIllustration } from "@/components/marketing/hero-illustration";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
      <div
        aria-hidden
        className="brand-gradient-bg pointer-events-none absolute -top-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col gap-6"
        >
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Explainable AI pharmacovigilance
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Every side effect report,{" "}
            <span className="brand-gradient-text">turned into evidence</span>
          </h1>
          <p className="max-w-lg text-base text-muted-foreground sm:text-lg">
            Patients report what happened. BioBERT and a graph neural network extract entities,
            predict drug interactions, and verify every claim against PubMed, DrugBank and FDA
            literature — so doctors and regulators see a risk score they can actually trust,
            with the evidence attached.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
              Get started <ArrowRight className="size-4" />
            </Link>
            <Link href="/sign-in" className={buttonVariants({ size: "lg", variant: "outline" })}>
              Log in
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        >
          <HeroIllustration />
        </motion.div>
      </div>
    </section>
  );
}
