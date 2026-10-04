"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AccessDenied } from "@/components/app/access-denied";
import { useAuth } from "@/components/auth/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { loginUrl } from "@/lib/query-client";
import { AppSidebar } from "./app-sidebar";
import { AppTopBar } from "./app-top-bar";
import { DriverTopBar } from "./driver-top-bar";
import { isNavItemAllowed, isPhoneOnlyUser, navItemForPath } from "./navigation";

type ProtectedShellProps = { children: ReactNode; defaultSidebarOpen: boolean };

/**
 * Authenticated app frame: sidebar + sticky top bar. Unauthenticated users go to
 * /login?next=<path>. A URL whose nav item the user may not open renders
 * AccessDenied (UX only; the API enforces permissions on every request).
 */
export function ProtectedShell({ children, defaultSidebarOpen }: ProtectedShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, can } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(loginUrl(`${window.location.pathname}${window.location.search}`));
    }
  }, [router, status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen" aria-busy="true" aria-label="Checking your session">
        <div className="hidden w-64 bg-sidebar md:block" />
        <div className="flex flex-1 flex-col gap-6 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !user) {
    return null;
  }

  const navItem = navItemForPath(pathname);
  const allowed = !navItem || isNavItemAllowed(navItem, can);

  const content = allowed ? children : <AccessDenied className="py-24" />;
  if (isPhoneOnlyUser(can))
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <DriverTopBar />
        <div className="flex-1">{content}</div>
      </div>
    );

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <AppTopBar />
        <div className="flex-1">{content}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
