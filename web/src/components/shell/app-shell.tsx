"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import type { LucideIcon } from "lucide-react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { navByRole } from "@/lib/nav";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface AppShellProps {
  /** Short portal label shown under the wordmark, e.g. "Patient", "Doctor". */
  portalLabel: string;
  role: keyof typeof navByRole;
  children: ReactNode;
}

/**
 * One shared chrome for all three portals (docs/design-brief.md Revision 2):
 * collapsible sidebar + topbar. Takes `role` (a plain string) rather than
 * a `nav` array — nav items hold Lucide icon component references, which
 * the server-component layouts that render AppShell can't pass down as a
 * prop (React Server Components only allow plain serializable data across
 * that boundary). AppShell looks its own nav up client-side instead.
 */
export function AppShell({ portalLabel, role, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = navByRole[role];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const navList = (onNavigate?: () => void) => (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "brand-gradient-bg text-white"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-svh w-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
          <span className="brand-gradient-bg size-7 rounded-lg" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground">PharmaSignal</p>
            <p className="text-xs text-muted-foreground">{portalLabel}</p>
          </div>
        </div>
        {navList()}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
            <span className="brand-gradient-bg size-7 rounded-lg" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-sidebar-foreground">PharmaSignal</p>
              <p className="text-xs text-muted-foreground">{portalLabel}</p>
            </div>
          </div>
          {navList(() => setMobileOpen(false))}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
