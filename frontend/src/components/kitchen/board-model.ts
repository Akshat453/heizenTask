import type { KitchenBoardUnit, KitchenPrepState, KitchenTimingState } from "@/lib/api";

/**
 * Presentation-only shaping of GET /kitchen rows: filtering, column split,
 * ordering and counting. prepState and timingState come from the API as-is.
 */

export const UNASSIGNED = "unassigned";
export type StationTab = { key: string; name: string; remaining: number };
export type BoardFilters = {
  station: string | null;
  state: KitchenPrepState | null;
  timing: KitchenTimingState | null;
  q: string;
  combo: string | null;
};

const URGENCY: Record<KitchenTimingState, number> = { LATE: 0, AT_RISK: 1, ON_TRACK: 2, COMPLETE: 3 };

export const stationKey = (unit: KitchenBoardUnit) => unit.stationId ?? UNASSIGNED;

export function optionText(unit: KitchenBoardUnit): string[] {
  return unit.options.map((o) => (o.portionNameSnapshot ? `${o.optionNameSnapshot} · ${o.portionNameSnapshot}` : o.optionNameSnapshot));
}

/** Identical dish + options (order-independent), the prep-totals grouping key. */
export function comboKey(unit: KitchenBoardUnit): string {
  return [unit.dishNameSnapshot, ...optionText(unit).sort()].join(" | ");
}

export function stationTabs(units: KitchenBoardUnit[]): StationTab[] {
  const map = new Map<string, StationTab>();
  for (const unit of units) {
    const key = stationKey(unit);
    const tab = map.get(key) ?? { key, name: unit.stationId ? unit.stationNameSnapshot : "Unassigned", remaining: 0 };
    if (unit.prepState !== "DONE") tab.remaining++;
    map.set(key, tab);
  }
  return [...map.values()].sort((a, b) => (a.key === UNASSIGNED ? 1 : b.key === UNASSIGNED ? -1 : a.name.localeCompare(b.name)));
}

export function filterUnits(units: KitchenBoardUnit[], f: BoardFilters): KitchenBoardUnit[] {
  const q = f.q.trim().toLowerCase();
  return units.filter(
    (u) =>
      (!f.station || stationKey(u) === f.station) &&
      (!f.state || u.prepState === f.state) &&
      (!f.timing || u.timingState === f.timing) &&
      (!f.combo || comboKey(u) === f.combo) &&
      (!q || u.orderNumber.toLowerCase().includes(q) || u.companyName.toLowerCase().includes(q) || u.dishNameSnapshot.toLowerCase().includes(q)),
  );
}

const byUrgency = (a: KitchenBoardUnit, b: KitchenBoardUnit) =>
  URGENCY[a.timingState] - URGENCY[b.timingState] ||
  new Date(a.plannedKitchenReadyAt).getTime() - new Date(b.plannedKitchenReadyAt).getTime() ||
  a.orderNumber.localeCompare(b.orderNumber);

export function splitColumns(units: KitchenBoardUnit[]) {
  const notStarted: KitchenBoardUnit[] = [];
  const inProgress: KitchenBoardUnit[] = [];
  const done: KitchenBoardUnit[] = [];
  for (const unit of units) (unit.prepState === "DONE" ? done : unit.prepState === "STARTED" ? inProgress : notStarted).push(unit);
  notStarted.sort(byUrgency);
  inProgress.sort(byUrgency);
  done.sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
  return { notStarted, inProgress, done };
}

export function boardTotals(units: KitchenBoardUnit[]) {
  let done = 0, inProgress = 0, late = 0, atRisk = 0;
  let next: KitchenBoardUnit | null = null;
  for (const unit of units) {
    if (unit.prepState === "DONE") done++;
    else {
      if (unit.prepState === "STARTED") inProgress++;
      if (unit.timingState === "LATE") late++;
      if (unit.timingState === "AT_RISK") atRisk++;
      if (!next || unit.plannedKitchenReadyAt < next.plannedKitchenReadyAt) next = unit;
    }
  }
  return { total: units.length, done, inProgress, late, atRisk, next };
}

export type PrepTotalRow = {
  key: string; dish: string; options: string[]; quantity: number; orders: number;
  notStarted: number; inProgress: number; done: number; earliestReadyBy: string;
};

/** Identical combinations: quantities per state, distinct orders, earliest ready-by. Counting only. */
export function prepTotalRows(units: KitchenBoardUnit[]): PrepTotalRow[] {
  const map = new Map<string, PrepTotalRow & { orderIds: Set<string> }>();
  for (const unit of units) {
    const key = comboKey(unit);
    const row =
      map.get(key) ??
      { key, dish: unit.dishNameSnapshot, options: optionText(unit), quantity: 0, orders: 0, notStarted: 0, inProgress: 0, done: 0, earliestReadyBy: unit.plannedKitchenReadyAt, orderIds: new Set<string>() };
    row.quantity += unit.quantity;
    row.orderIds.add(unit.orderId);
    if (unit.prepState === "DONE") row.done += unit.quantity;
    else if (unit.prepState === "STARTED") row.inProgress += unit.quantity;
    else row.notStarted += unit.quantity;
    if (unit.plannedKitchenReadyAt < row.earliestReadyBy) row.earliestReadyBy = unit.plannedKitchenReadyAt;
    map.set(key, row);
  }
  return [...map.values()]
    .map(({ orderIds, ...row }) => ({ ...row, orders: orderIds.size }))
    .sort((a, b) => a.earliestReadyBy.localeCompare(b.earliestReadyBy) || b.quantity - a.quantity);
}
