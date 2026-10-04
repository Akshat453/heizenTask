"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { settingsApi } from "@/lib/api";
import { CONFLICT_MESSAGE, isApiError } from "@/lib/api-client";

export const settingsKey = ["settings"] as const;

export const useSettings = () => useQuery({ queryKey: settingsKey, queryFn: settingsApi.get });

/** Everything derived from settings: cut-offs, kitchen timing, dashboards and the business clock. */
export function useInvalidateSettings() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [settingsKey, ["cutoff"], ["cutoff-window"], ["cutoff-preview"], ["kitchen"], ["dashboard"], ["business-clock"]])
      void queryClient.invalidateQueries({ queryKey: key });
  };
}

type SettingsPatch = Parameters<typeof settingsApi.update>[0];

/** PUT /settings with one section's fields. */
export function useSaveSettings(success: string) {
  const invalidate = useInvalidateSettings();
  return useMutation({
    mutationFn: (body: SettingsPatch) => settingsApi.update(body),
    onSuccess: () => toast.success(success),
    onError: (error) => {
      if (isApiError(error, 409)) toast.error(CONFLICT_MESSAGE);
    },
    onSettled: invalidate,
  });
}
