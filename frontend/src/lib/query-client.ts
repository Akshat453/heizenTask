import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/api-client";

/** Statuses where retrying cannot help: bad input, auth, missing, or a state conflict. */
const NO_RETRY_STATUSES = new Set([400, 401, 403, 404, 409]);

export function createQueryClient(onUnauthorized: () => void): QueryClient {
  const handle = (error: unknown) => {
    if (isApiError(error, 401)) onUnauthorized();
  };
  return new QueryClient({
    queryCache: new QueryCache({ onError: handle }),
    mutationCache: new MutationCache({ onError: handle }),
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) =>
          failureCount < 1 && !(isApiError(error) && NO_RETRY_STATUSES.has(error.status)),
      },
      mutations: { retry: false },
    },
  });
}

/** Login URL that returns the user to `path` afterwards. */
export function loginUrl(path: string): string {
  return path && path !== "/" && !path.startsWith("/login")
    ? `/login?next=${encodeURIComponent(path)}`
    : "/login";
}

/** Only same-origin absolute paths are accepted as a post-login destination. */
export function safeNextPath(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")
    ? next
    : "/dashboard";
}
