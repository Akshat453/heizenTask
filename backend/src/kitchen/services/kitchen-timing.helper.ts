export function calculatePlannedKitchenReadyAt(
  deliveryAt: Date,
  deliveryLeadMinutesSnapshot: number,
  kitchenReadyBufferMinutes: number,
): Date {
  return new Date(
    deliveryAt.getTime() -
      (deliveryLeadMinutesSnapshot + kitchenReadyBufferMinutes) * 60 * 1000,
  );
}
