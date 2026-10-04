const MINUTE_MS = 60 * 1000;

/** When the Order must leave the Kitchen for delivery: deliveryAt − snapshotted delivery lead. */
export function calculatePlannedDispatchReadyAt(
  deliveryAt: Date,
  deliveryLeadMinutesSnapshot: number,
): Date {
  return new Date(
    deliveryAt.getTime() - deliveryLeadMinutesSnapshot * MINUTE_MS,
  );
}

/** When Kitchen work must be done: plannedDispatchReadyAt − configured Kitchen buffer. */
export function calculatePlannedKitchenReadyAt(
  deliveryAt: Date,
  deliveryLeadMinutesSnapshot: number,
  kitchenReadyBufferMinutes: number,
): Date {
  const plannedDispatchReadyAt = calculatePlannedDispatchReadyAt(
    deliveryAt,
    deliveryLeadMinutesSnapshot,
  );
  return new Date(
    plannedDispatchReadyAt.getTime() - kitchenReadyBufferMinutes * MINUTE_MS,
  );
}

export type KitchenTimingState = 'ON_TRACK' | 'AT_RISK' | 'LATE' | 'COMPLETE';

/**
 * Shared Kitchen timing classification (Kitchen board and dashboards):
 *   COMPLETE: work is finished (never becomes late/at-risk afterwards);
 *   LATE:     now >= plannedKitchenReadyAt (the exact deadline is late);
 *   AT_RISK:  now >= plannedKitchenReadyAt − atRiskWindowMinutes (0 is a valid window);
 *   ON_TRACK: otherwise.
 */
export function classifyKitchenTiming(input: {
  plannedKitchenReadyAt: Date;
  now: Date;
  atRiskWindowMinutes: number;
  complete: boolean;
}): KitchenTimingState {
  if (input.complete) return 'COMPLETE';
  const deadline = input.plannedKitchenReadyAt.getTime();
  const now = input.now.getTime();
  if (now >= deadline) return 'LATE';
  if (now >= deadline - input.atRiskWindowMinutes * MINUTE_MS) return 'AT_RISK';
  return 'ON_TRACK';
}
