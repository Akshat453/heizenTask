"use client";

import { useMemo } from "react";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { DropListQuery } from "@/lib/api";

const parsers = {
  date: parseAsString,
  q: parseAsString.withDefault(""),
  driver: parseAsString,
  view: parseAsStringLiteral(["board", "table"] as const).withDefault("board"),
  drop: parseAsString,
  page: parseAsInteger.withDefault(1),
};

export function useDispatchParams(today: string | null) {
  const [params, setParams] = useQueryStates(parsers, { history: "replace" });
  const date = params.date ?? today;
  const { q, driver, page } = params;
  /** Filtered, paginated server query for the board/table. */
  const query = useMemo<DropListQuery | null>(
    () => (date ? { date, search: q || undefined, driverId: driver ?? undefined, page, pageSize: 100 } : null),
    [date, q, driver, page],
  );
  /** Unfiltered day for the summary strip (same request as `query` when no filter is set). */
  const dayQuery = useMemo<DropListQuery | null>(() => (date ? { date, page: 1, pageSize: 100 } : null), [date]);
  return { params, setParams, date, query, dayQuery };
}
