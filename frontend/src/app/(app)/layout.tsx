import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { AppProviders } from "@/components/providers/app-providers";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  // UI preference cookie written by the shadcn Sidebar (not the auth cookie).
  const sidebarState = (await cookies()).get("sidebar_state")?.value;
  return (
    <AppProviders>
      <ProtectedShell defaultSidebarOpen={sidebarState !== "false"}>{children}</ProtectedShell>
    </AppProviders>
  );
}
