"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describeError, isApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { AccessDenied } from "./access-denied";
import { EmptyState } from "./empty-state";

type ErrorStateProps = {
  error: unknown;
  /** What failed, e.g. "Could not load orders". */
  title?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
};

/** Actionable error with Retry. A 403 renders AccessDenied; a 404 says the item no longer exists. */
export function ErrorState({ error, title = "Something went wrong", onRetry, isRetrying, className }: ErrorStateProps) {
  if (isApiError(error, 403)) return <AccessDenied className={className} />;
  const notFound = isApiError(error, 404);
  return (
    <div role="alert" className={cn("rounded-lg border border-danger/20 bg-danger-soft/40", className)}>
      <EmptyState
        icon={TriangleAlert}
        title={notFound ? "Not found" : title}
        description={notFound ? "It may have been removed, or the link is wrong." : describeError(error)}
        action={
          onRetry && !notFound ? (
            <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
              <RotateCw data-icon="inline-start" className={cn(isRetrying && "animate-spin")} />
              Retry
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
