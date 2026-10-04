"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { createQueryClient, loginUrl } from "@/lib/query-client";

function redirectToLogin() {
  const { pathname, search } = window.location;
  if (pathname.startsWith("/login")) return;
  window.location.assign(loginUrl(`${pathname}${search}`));
}

/** Providers for the authenticated app shell. Theme and auth live in the root layout. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient(redirectToLogin));
  const isMobile = useIsMobile();

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <TooltipProvider delay={300}>
          {children}
          <Toaster position={isMobile ? "top-center" : "bottom-right"} richColors={false} closeButton />
        </TooltipProvider>
      </NuqsAdapter>
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools buttonPosition="bottom-left" />}
    </QueryClientProvider>
  );
}
