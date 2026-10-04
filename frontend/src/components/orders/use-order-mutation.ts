"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { invalidateOrders } from "./queries";

/**
 * Order mutation with the shared conventions: past-tense toast, invalidate the
 * order/list/dashboards, and on 409 the conflict message plus the server's reason.
 * `inline` errors (400) are left to the caller's form.
 */
export function useOrderMutation<TVars>(
  orderId: string | undefined,
  fn: (vars: TVars) => Promise<unknown>,
  successText: string,
  options: { inline?: boolean; onDone?: () => void } = {},
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(successText);
      invalidateOrders(queryClient, orderId);
      options.onDone?.();
    },
    onError: (error) => {
      if (isApiError(error, 409)) {
        toast.error(CONFLICT_MESSAGE, { description: error.message });
        invalidateOrders(queryClient, orderId);
        options.onDone?.();
      } else if (!options.inline || !isApiError(error, 400)) {
        toast.error(describeError(error));
      }
    },
  });
}
