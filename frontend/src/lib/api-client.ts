const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

type ApiErrorBody = {
  message?: string | string[];
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Individual validation messages when the backend returned an array (400). */
    public readonly messages: string[] = [message],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const CONFLICT_MESSAGE = "Someone else already updated this. Showing the latest.";

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status);
}

/** User-facing message for any thrown value (ApiError, Error, or unknown). */
export function describeError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (isApiError(error, 409)) return error.message || CONFLICT_MESSAGE;
  if (error instanceof TypeError) return "Could not reach the server. Check your connection and try again.";
  return error instanceof Error && error.message ? error.message : fallback;
}

async function send(path: string, init: RequestInit): Promise<Response> {
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
    const messages = Array.isArray(body?.message)
      ? body.message
      : [body?.message ?? "Something went wrong. Please try again."];
    throw new ApiError(response.status, messages.join(" "), messages);
  }
  return response;
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
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
  return parse<T>(await send(path, init));
}

/**
 * Like apiRequest, but also returns the server's `Date` header when the browser
 * exposes it (cross-origin it is only readable if the API lists it in
 * Access-Control-Expose-Headers; otherwise `serverDate` is null).
 */
export async function apiRequestWithMeta<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; serverDate: Date | null }> {
  const response = await send(path, init);
  const header = response.headers.get("Date");
  const serverDate = header ? new Date(header) : null;
  return {
    data: await parse<T>(response),
    serverDate: serverDate && !Number.isNaN(serverDate.getTime()) ? serverDate : null,
  };
}
