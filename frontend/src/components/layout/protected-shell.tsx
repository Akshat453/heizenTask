"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

type NavigationItem = {
  label: string;
  href: string;
  requiredPermissions?: string[];
};

const navigation: NavigationItem[] = [
  { label: "Home", href: "/" },
  { label: "Catalogue", href: "/catalogue", requiredPermissions: ["catalogue.read"] },
  { label: "Menu", href: "/menu", requiredPermissions: ["catalogue.read"] },
  { label: "Pricing", href: "/pricing", requiredPermissions: ["catalogue.read"] },
  { label: "Companies", href: "/companies", requiredPermissions: ["companies.read"] },
  { label: "Employees", href: "/employees", requiredPermissions: ["employees.read"] },
  { label: "Ref. Data", href: "/reference-data", requiredPermissions: ["catalogue.manage"] },
  { label: "Settings", href: "/settings", requiredPermissions: ["settings.read"] },
];

export function ProtectedShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, logout, can } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const visibleNavigation = useMemo(
    () =>
      navigation.filter(
        ({ requiredPermissions }) =>
          !requiredPermissions?.length || requiredPermissions.every(can),
      ),
    [can],
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  async function handleLogout() {
    setLogoutError(null);
    try {
      await logout();
      router.replace("/login");
    } catch {
      setLogoutError("Could not sign out. Please try again.");
    }
  }

  if (status === "loading") {
    return (
      <main
        className="grid min-h-screen place-items-center bg-stone-50"
        aria-busy="true"
      >
        <p className="text-sm text-muted-foreground">Checking your session…</p>
      </main>
    );
  }

  if (status === "unauthenticated" || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-2.5" href="/">
            <span className="grid size-8 place-items-center rounded-md bg-emerald-950 text-sm font-semibold text-lime-300">
              H
            </span>
            <span className="hidden text-sm font-semibold tracking-wide sm:inline">
              Fernleaf Kitchen
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="flex flex-1 gap-1">
            {visibleNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground aria-[current=page]:bg-emerald-50 aria-[current=page]:text-emerald-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-5">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut data-icon="inline-start" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
        {logoutError && (
          <p
            role="alert"
            className="border-t border-destructive/20 bg-destructive/5 px-4 py-2 text-center text-sm text-destructive"
          >
            {logoutError}
          </p>
        )}
      </header>
      {children}
    </div>
  );
}
