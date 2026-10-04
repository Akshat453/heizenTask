"use client";

import type { KeyboardEvent } from "react";
import { StatusBadge } from "@/components/app/status-badge";
import { Input } from "@/components/ui/input";
import type { TierEditorRow } from "@/lib/api";
import { centsToInput, parseMoneyToCents } from "@/lib/decimal-input";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type GridRow = { key: string; kind: "dish" | "option"; item: TierEditorRow };

type Props = {
  title: string;
  rows: GridRow[];
  edits: Map<string, string>;
  errors: Map<string, string>;
  readOnly: boolean;
  onEdit: (key: string, value: string | null) => void;
};

export const sourceOf = (item: TierEditorRow) => (item.priceCents === null ? "MISSING" : item.source === "OVERRIDE" ? "OVERRIDE" : "DERIVED");

/** Is the typed value different from the saved override? (invalid input counts as a change.) */
export function isChanged(item: TierEditorRow, text: string | undefined): boolean {
  if (text === undefined) return false;
  const cents = parseMoneyToCents(text);
  return Number.isNaN(cents) || cents !== item.overridePriceCents;
}

function focusCell(from: HTMLInputElement, step: number) {
  const cells = Array.from(document.querySelectorAll<HTMLInputElement>("input[data-price-cell]"));
  cells[cells.indexOf(from) + step]?.focus();
}

export function EditorGrid({ title, rows, edits, errors, readOnly, onEdit }: Props) {
  const onKey = (event: KeyboardEvent<HTMLInputElement>, key: string) => {
    if (event.key === "ArrowDown" || event.key === "Enter") {
      event.preventDefault();
      focusCell(event.currentTarget, 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusCell(event.currentTarget, -1);
    } else if (event.key === "Escape") {
      onEdit(key, null);
    }
  };
  return (
    <section aria-label={title} className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--border)]">
          <tr>
            <th scope="col" className="label-caps h-9 px-3 text-left text-muted-foreground">{title}</th>
            <th scope="col" className="label-caps px-3 text-right text-muted-foreground">Cost</th>
            <th scope="col" className="label-caps px-3 text-right text-muted-foreground">Derived</th>
            <th scope="col" className="label-caps px-3 text-right text-muted-foreground">Override</th>
            <th scope="col" className="label-caps px-3 text-right text-muted-foreground">Effective</th>
            <th scope="col" className="label-caps px-3 text-center text-muted-foreground">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, item }) => {
            const text = edits.get(key);
            const dirty = isChanged(item, text);
            const invalid = text !== undefined && Number.isNaN(parseMoneyToCents(text));
            const missing = item.priceCents === null;
            const source = sourceOf(item);
            return (
              <tr key={key} className={cn("border-b last:border-0", missing && "bg-danger-soft/50", !item.isActive && "text-muted-foreground")}>
                <td className="px-3 py-1.5">
                  <span className="font-medium">{item.name}</span>
                  {item.sku && <span className="num ml-2 text-xs text-muted-foreground">{item.sku}</span>}
                  {!item.isActive && <span className="ml-2 text-xs">inactive</span>}
                  {missing && <span className="block text-xs text-danger">Hidden from menus on this tier</span>}
                  {errors.get(key) && <span className="block text-xs text-danger">{errors.get(key)}</span>}
                </td>
                <td className="num px-3 text-right">{formatMoney(item.costCents)}</td>
                <td className="num px-3 text-right">{source === "DERIVED" ? formatMoney(item.priceCents) : <span className="text-muted-foreground">—</span>}</td>
                <td className="px-3 py-1 text-right">
                  <Input
                    data-price-cell
                    aria-label={`${item.name} override price`}
                    inputMode="decimal"
                    placeholder="none"
                    readOnly={readOnly}
                    value={text ?? centsToInput(item.overridePriceCents)}
                    onChange={(e) => onEdit(key, e.target.value)}
                    onKeyDown={(e) => onKey(e, key)}
                    aria-invalid={invalid || Boolean(errors.get(key))}
                    className={cn("num ml-auto h-8 w-28 text-right", dirty && "bg-saffron-soft", invalid && "ring-2 ring-danger")}
                  />
                </td>
                <td className="num px-3 text-right font-medium">{missing ? <span className="text-danger">Missing</span> : formatMoney(item.priceCents)}</td>
                <td className="px-3 text-center"><StatusBadge kind="priceSource" value={source} size="sm" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
