"use client";

import { useMemo } from "react";
import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { KitchenPrepState, KitchenTimingState } from "@/lib/api";
import type { BoardFilters } from "./board-model";

const STATES = ["NOT_STARTED", "STARTED", "DONE"] as const satisfies readonly KitchenPrepState[];
const TIMINGS = ["LATE", "AT_RISK", "ON_TRACK"] as const satisfies readonly KitchenTimingState[];

const parsers = {
  date: parseAsString,
  station: parseAsString,
  state: parseAsStringLiteral(STATES),
  timing: parseAsStringLiteral(TIMINGS),
  q: parseAsString.withDefault(""),
  view: parseAsStringLiteral(["units", "totals"] as const).withDefault("units"),
  combo: parseAsString,
  wall: parseAsBoolean.withDefault(false),
};

/** Kitchen board state in the URL so a wall tablet can be bookmarked to one station. */
export function useKitchenParams(today: string | null) {
  const [params, setParams] = useQueryStates(parsers, { history: "replace" });
  const date = params.date ?? today;
  const { station, state, timing, q, combo } = params;
  // Stable identity so the board's memoized filtering only reruns when a filter changes.
  const filters = useMemo<BoardFilters>(() => ({ station, state, timing, q, combo }), [station, state, timing, q, combo]);
  return { params, setParams, date, filters };
}
