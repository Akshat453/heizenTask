"use client";

import { ErrorState } from "@/components/app/error-state";

/** Route-level boundary for unexpected render errors inside the app shell. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="p-4 md:p-6">
      <ErrorState error={error} title="This page hit an unexpected problem" onRetry={reset} />
    </main>
  );
}
