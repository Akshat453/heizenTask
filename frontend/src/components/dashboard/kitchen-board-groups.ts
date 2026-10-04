import type { KitchenBoardUnit, KitchenTimingState } from "@/lib/api";

/**
 * Presentation-only grouping of today's kitchen-board rows. States and
 * deadlines come from the API; nothing here classifies or recalculates them.
 */

export type StationLoad = { key: string; stationId: string | null; name: string; notStarted: number; started: number; done: number };

export function stationLoad(units: KitchenBoardUnit[]): StationLoad[] {
  const map = new Map<string, StationLoad>();
  for (const unit of units) {
    const key = unit.stationId ?? `snapshot:${unit.stationNameSnapshot}`;
    const row = map.get(key) ?? { key, stationId: unit.stationId, name: unit.stationNameSnapshot, notStarted: 0, started: 0, done: 0 };
    if (unit.prepState === "DONE") row.done++;
    else if (unit.prepState === "STARTED") row.started++;
    else row.notStarted++;
    map.set(key, row);
  }
  return [...map.values()].sort(
    (a, b) => b.notStarted + b.started - (a.notStarted + a.started) || a.name.localeCompare(b.name),
  );
}

export type OrderDeadline = {
  orderId: string;
  orderNumber: string;
  companyName: string;
  plannedKitchenReadyAt: string;
  timingState: KitchenTimingState;
  remainingUnits: number;
};

const URGENCY: Record<KitchenTimingState, number> = { LATE: 0, AT_RISK: 1, ON_TRACK: 2, COMPLETE: 3 };

/** Orders with unfinished units: late and at-risk first, then by planned kitchen-ready time. */
export function nextDeadlines(units: KitchenBoardUnit[], limit = 8): OrderDeadline[] {
  const map = new Map<string, OrderDeadline>();
  for (const unit of units) {
    if (unit.prepState === "DONE") continue;
    const existing = map.get(unit.orderId);
    if (existing) existing.remainingUnits++;
    else
      map.set(unit.orderId, {
        orderId: unit.orderId,
        orderNumber: unit.orderNumber,
        companyName: unit.companyName,
        plannedKitchenReadyAt: unit.plannedKitchenReadyAt,
        // Every unfinished unit of an order shares its deadline, so the API gives them one timing state.
        timingState: unit.timingState,
        remainingUnits: 1,
      });
  }
  return [...map.values()]
    .sort(
      (a, b) =>
        URGENCY[a.timingState] - URGENCY[b.timingState] ||
        new Date(a.plannedKitchenReadyAt).getTime() - new Date(b.plannedKitchenReadyAt).getTime(),
    )
    .slice(0, limit);
}

export type PrepTotal = { key: string; dish: string; options: string[]; quantity: number };

/** Identical dish + option combinations still to cook today, by total quantity. */
export function prepTotals(units: KitchenBoardUnit[], limit = 10): PrepTotal[] {
  const map = new Map<string, PrepTotal>();
  for (const unit of units) {
    if (unit.prepState === "DONE") continue;
    const options = unit.options.map((o) => (o.portionNameSnapshot ? `${o.optionNameSnapshot} (${o.portionNameSnapshot})` : o.optionNameSnapshot));
    const key = [unit.dishNameSnapshot, ...[...options].sort()].join(" · ");
    const row = map.get(key) ?? { key, dish: unit.dishNameSnapshot, options, quantity: 0 };
    row.quantity += unit.quantity;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity || a.key.localeCompare(b.key)).slice(0, limit);
}
