import { useQuery } from "@tanstack/react-query";
import { addDays } from "@/components/app/date-range-filter";
import { businessTimeApi, type CutoffInfo } from "@/lib/api";

const WINDOW_DAYS = 10;

/**
 * Cut-off info from the backend for the next delivery dates (today .. today+9).
 * The UI only reads `passed` and `cutoffInstant`; the cut-off rule stays in the API.
 */
export function useCutoffWindow(today: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["cutoff-window", today],
    enabled: enabled && Boolean(today),
    refetchInterval: 60_000,
    queryFn: async (): Promise<CutoffInfo[]> =>
      Promise.all(Array.from({ length: WINDOW_DAYS }, (_, i) => businessTimeApi.cutoff(addDays(today!, i)))),
  });
}

/** First delivery date whose cut-off is still open, plus every date sharing that cut-off instant. */
export function nextCutoff(window: CutoffInfo[] | undefined) {
  const first = window?.find((info) => !info.passed);
  if (!window || !first) return null;
  return { cutoffInstant: first.cutoffInstant, deliveryDates: window.filter((i) => i.cutoffInstant === first.cutoffInstant).map((i) => i.deliveryDate) };
}

/** Latest delivery date (up to today+9) whose cut-off has passed: orders on or before it are due for processing. */
export function lastPassedDate(window: CutoffInfo[] | undefined, today: string): string {
  const passed = window?.filter((info) => info.passed).map((info) => info.deliveryDate) ?? [];
  return passed.length ? passed[passed.length - 1] : addDays(today, -1);
}
