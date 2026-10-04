import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { describeError, isApiError } from "@/lib/api-client";

/**
 * Maps a backend 400 (class-validator messages such as "deliveryTime must be HH:mm")
 * onto react-hook-form fields whose name starts the message. Anything that cannot be
 * matched is returned for FormErrorAlert. Nested paths ("lines.0.quantity ...") are
 * matched on their full dotted name.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
): string[] {
  if (!isApiError(error) || error.status !== 400) return [describeError(error)];
  const unmatched: string[] = [];
  const byLength = [...fields].sort((a, b) => b.length - a.length);
  for (const message of error.messages) {
    const field = byLength.find((name) => message === name || message.startsWith(`${name} `));
    if (field) setError(field, { type: "server", message });
    else unmatched.push(message);
  }
  return unmatched;
}
