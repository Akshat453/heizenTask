"use client";

import { Leaf } from "lucide-react";
import Link from "next/link";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { formatBusinessDate } from "@/lib/format";
import { UserMenu } from "./user-menu";

/** Minimal bar for phone-only roles (driver): wordmark, today, account. */
export function DriverTopBar() {
  const { businessDate } = useBusinessClock();
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-sidebar px-4 text-sidebar-foreground">
      <Link href="/driver" className="flex min-h-11 items-center gap-2 font-semibold text-sidebar-accent-foreground">
        <span className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Leaf className="size-4" />
        </span>
        Fernleaf
      </Link>
      <span className="num ml-auto text-sm">Today · {businessDate ? formatBusinessDate(businessDate) : "…"}</span>
      <UserMenu triggerClassName="size-11 rounded-full" />
    </header>
  );
}
