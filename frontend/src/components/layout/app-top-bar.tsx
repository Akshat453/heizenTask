"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppBreadcrumbs } from "./app-breadcrumbs";
import { BusinessDayChip } from "./business-day-chip";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function AppTopBar() {
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
