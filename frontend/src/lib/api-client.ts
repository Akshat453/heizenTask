const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

type ApiErrorBody = {
  message?: string | string[];
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function errorMessage(body: ApiErrorBody | null, fallback: string): string {
  if (Array.isArray(body?.message)) {
    return body.message.join(" ");
  }

  return body?.message ?? fallback;
}

/** User-facing message for any thrown value (ApiError, Error, or unknown). */
export function describeError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * The single HTTP client for the NestJS API. Authentication is the HttpOnly
 * session cookie, sent via `credentials: "include"` (never read from JS).
 * JSON bodies get a JSON content type; FormData bodies are sent as-is so the
 * browser sets the multipart boundary.
 */
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body !== undefined && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      errorMessage(body, "Something went wrong. Please try again."),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
