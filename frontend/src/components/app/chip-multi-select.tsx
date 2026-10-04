"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  options: { id: string; name: string; isActive?: boolean }[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  tone?: "neutral" | "warning";
};

/** Toggle chips for small reference lists (allergens, dietary tags). Inactive entries show only when selected. */
export function ChipMultiSelect({ label, options, value, onChange, disabled, tone = "neutral" }: Props) {
  const selected = new Set(value);
  const visible = options.filter((o) => o.isActive !== false || selected.has(o.id));
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {visible.length === 0 && <p className="text-sm text-muted-foreground">None set up yet.</p>}
        {visible.map((option) => {
          const on = selected.has(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((id) => id !== option.id) : [...value, option.id])}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-sm disabled:opacity-60",
                on ? (tone === "warning" ? "border-warning/40 bg-warning-soft text-warning" : "border-primary/40 bg-accent text-accent-foreground") : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {on && <Check className="size-3.5" aria-hidden />}
              {option.name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
