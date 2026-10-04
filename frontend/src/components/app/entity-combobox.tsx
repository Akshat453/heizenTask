"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

export type ComboboxItem = { id: string; label: string; description?: ReactNode };

type EntityComboboxProps = {
  /** Cache key prefix, e.g. "companies". */
  queryKey: string;
  /** Server search (debounced 300 ms); return at most ~10 items. */
  search: (term: string) => Promise<ComboboxItem[]>;
  value: ComboboxItem | null;
  onChange: (item: ComboboxItem | null) => void;
  placeholder: string;
  label: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
};

/** Searchable, server-backed single select (Popover + Command). */
export function EntityCombobox({ queryKey, search, value, onChange, placeholder, label, disabled, clearable, className }: EntityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term.trim(), 300);
  const results = useQuery({
    queryKey: ["combobox", queryKey, debounced],
    queryFn: () => search(debounced),
    enabled: open,
    staleTime: 30_000,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative", className)}>
        <PopoverTrigger
          render={<Button variant="outline" role="combobox" aria-label={label} aria-expanded={open} disabled={disabled} />}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>{value?.label ?? placeholder}</span>
          <ChevronsUpDown className="opacity-50" />
        </PopoverTrigger>
        {clearable && value && !disabled && (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={() => onChange(null)}
            className="absolute top-1/2 right-8 grid size-5 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-72 p-0 shadow-soft">
        <Command shouldFilter={false}>
          <CommandInput value={term} onValueChange={setTerm} placeholder={`Search ${label.toLowerCase()}…`} />
          <CommandList>
            {results.isFetching && !results.data ? (
              <p className="p-3 text-sm text-muted-foreground">Searching…</p>
            ) : results.error ? (
              <p className="p-3 text-sm text-danger">Search failed. Try again.</p>
            ) : (
              <CommandEmpty>No matches.</CommandEmpty>
            )}
            <CommandGroup>
              {results.data?.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4", value?.id === item.id ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0">
                    <p className="truncate">{item.label}</p>
                    {item.description && <p className="truncate text-xs text-muted-foreground">{item.description}</p>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
