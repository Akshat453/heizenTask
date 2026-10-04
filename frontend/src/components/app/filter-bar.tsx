"use client";

import { ListFilter, Search, X } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export type FilterOption = { value: string; label: string; render?: ReactNode };
export type FilterDef = { key: string; label: string; options: FilterOption[] };
/** A chip for a filter the page renders itself (e.g. a DateRangeFilter). */
export type ExtraChip = { key: string; label: string; onRemove: () => void };

type FilterBarProps = {
  /** URL key for the search box; omit to hide search. */
  searchKey?: string;
  searchPlaceholder?: string;
  filters?: FilterDef[];
  /** Custom controls placed after the visible filters. */
  extra?: ReactNode;
  extraChips?: ExtraChip[];
  /** URL key reset to page 1 whenever a filter changes. */
  pageKey?: string;
};

const ALL = "__all";
const MAX_VISIBLE = 4;

/** Debounced search, up to 4 filters plus "More filters", removable chips; all state lives in the URL (nuqs). */
export function FilterBar({
  searchKey,
  searchPlaceholder = "Search…",
  filters = [],
  extra,
  extraChips = [],
  pageKey = "page",
}: FilterBarProps) {
  const parsers = useMemo(
    () =>
      Object.fromEntries(
        [...(searchKey ? [searchKey] : []), ...filters.map((f) => f.key), pageKey].map((key) => [key, parseAsString]),
      ),
    [filters, pageKey, searchKey],
  );
  const [params, setParams] = useQueryStates(parsers, { history: "replace" });

  const urlSearch = searchKey ? (params[searchKey] ?? "") : "";
  const [text, setText] = useState(urlSearch);
  const [syncedSearch, setSyncedSearch] = useState(urlSearch);
  if (urlSearch !== syncedSearch) {
    // URL changed from outside (Back, Clear all): adopt it.
    setSyncedSearch(urlSearch);
    setText(urlSearch);
  }
  const debounced = useDebouncedValue(text, 300);
  useEffect(() => {
    if (!searchKey || debounced.trim() === urlSearch) return;
    void setParams({ [searchKey]: debounced.trim() || null, [pageKey]: null });
  }, [debounced, pageKey, searchKey, setParams, urlSearch]);

  const setFilter = (key: string, value: string | null) => void setParams({ [key]: value, [pageKey]: null });

  const visible = filters.slice(0, MAX_VISIBLE);
  const more = filters.slice(MAX_VISIBLE);
  const activeMore = more.filter((f) => params[f.key]).length;

  const chips: ExtraChip[] = [
    ...(searchKey && urlSearch
      ? [{ key: searchKey, label: `Search: ${urlSearch}`, onRemove: () => setFilter(searchKey, null) }]
      : []),
    ...filters.flatMap((f) => {
      const value = params[f.key];
      if (!value) return [];
      const option = f.options.find((o) => o.value === value);
      return [{ key: f.key, label: `${f.label}: ${option?.label ?? value}`, onRemove: () => setFilter(f.key, null) }];
    }),
    ...extraChips,
  ];

  const clearAll = () => {
    void setParams(Object.fromEntries(Object.keys(parsers).map((key) => [key, null])));
    extraChips.forEach((chip) => chip.onRemove());
  };

  const renderSelect = (f: FilterDef) => (
    <Select key={f.key} value={params[f.key] ?? ALL} onValueChange={(value) => setFilter(f.key, !value || value === ALL ? null : value)}>
      <SelectTrigger aria-label={f.label} className="min-w-36">
        <span className="text-muted-foreground">{f.label}:</span>
        <SelectValue>{(value: string) => (value === ALL ? "All" : (f.options.find((o) => o.value === value)?.label ?? value))}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All</SelectItem>
        {f.options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.render ?? o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {searchKey && (
          <div className="relative w-full sm:w-64">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="pl-8"
            />
          </div>
        )}
        {visible.map(renderSelect)}
        {extra}
        {more.length > 0 && (
          <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>
              <ListFilter data-icon="inline-start" />
              More filters{activeMore > 0 && <span className="num">({activeMore})</span>}
            </PopoverTrigger>
            <PopoverContent align="start" className="flex w-72 flex-col gap-2 shadow-soft">
              {more.map(renderSelect)}
            </PopoverContent>
          </Popover>
        )}
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
          {chips.map((chip) => (
            <span key={chip.key} className="inline-flex h-6 items-center gap-1 rounded-md border bg-secondary pr-0.5 pl-2 text-xs text-secondary-foreground">
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove filter ${chip.label}`}
                className="grid size-5 place-items-center rounded-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <Button variant="link" size="xs" onClick={clearAll}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
