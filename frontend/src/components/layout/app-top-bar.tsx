"use client";

import { Leaf } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppBreadcrumbs } from "./app-breadcrumbs";
import { BusinessDayChip } from "./business-day-chip";
import { CommandPalette } from "./command-palette";
import { visibleNavGroups } from "./navigation";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

/** Routes a phone-only user (e.g. a driver) needs; with nothing else permitted the bar goes minimal. */
const PHONE_ROUTES = new Set(["/dashboard", "/driver"]);

export function AppTopBar() {
  const { can } = useAuth();
  const isMobile = useIsMobile();
  const navHrefs = visibleNavGroups(can).flatMap((g) => g.items.map((i) => i.href));
  const minimal = isMobile && navHrefs.every((href) => PHONE_ROUTES.has(href));

  if (minimal) {
    return (
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-sidebar px-4 text-sidebar-foreground">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-accent-foreground">
          <span className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Leaf className="size-4" />
          </span>
          Fernleaf
        </Link>
        <nav className="ml-auto flex items-center gap-1" aria-label="Driver navigation">
          <Link href="/driver" className="rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent">
            My route
          </Link>
          <UserMenu />
        </nav>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 md:px-6">
      <SidebarTrigger aria-label="Toggle navigation" />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <AppBreadcrumbs />
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <BusinessDayChip />
        <CommandPalette />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
