"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Activity } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#stack", label: "Technology" },
  { href: "#evidence", label: "Research" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="glass-panel mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="brand-gradient-bg flex size-8 items-center justify-center rounded-lg text-white">
            <Activity className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-foreground">PharmaSignal</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link href="/sign-in" className={buttonVariants({ variant: "ghost" })}>
            Log in
          </Link>
          <Link href="/sign-up" className={buttonVariants({})}>
            Get started
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle navigation menu"
          className="flex items-center justify-center rounded-lg p-2 text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        className={cn(
          "glass-panel mx-4 mt-2 flex flex-col gap-1 rounded-2xl p-4 md:hidden",
          open ? "flex" : "hidden",
        )}
      >
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {link.label}
          </a>
        ))}
        <div className="mt-2 flex items-center gap-2 border-t border-border pt-3">
          <Link href="/sign-in" className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>
            Log in
          </Link>
          <Link href="/sign-up" className={cn(buttonVariants({}), "flex-1")}>
            Get started
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
