"use client";

import { formatBusinessTime, formatCount } from "@/lib/format";
import type { PrepTotalRow } from "./board-model";

type Props = { rows: PrepTotalRow[]; timeZone: string; onSelect: (key: string) => void };

/** Read-only batch-cooking table; selecting a row filters the By unit view to it. */
export function PrepTotalsView({ rows, timeZone, onSelect }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-[0.875em]">
        <thead className="border-b">
          <tr>
            {["Dish", "Options", "Total qty", "Orders", "Not started", "In progress", "Done", "Earliest ready-by"].map((h, i) => (
              <th key={h} scope="col" className={`label-caps h-9 px-3 whitespace-nowrap text-muted-foreground ${i >= 2 ? "text-right" : "text-left"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              tabIndex={0}
              onClick={() => onSelect(row.key)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(row.key)}
              className="h-11 cursor-pointer border-b last:border-0 hover:bg-muted/60 focus-visible:bg-accent focus-visible:outline-none"
            >
              <td className="px-3 font-medium">{row.dish}</td>
              <td className="px-3 text-muted-foreground">{row.options.join(" · ") || "—"}</td>
              <td className="num px-3 text-right text-[1.125em] font-semibold">{formatCount(row.quantity)}</td>
              <td className="num px-3 text-right">{formatCount(row.orders)}</td>
              <td className="num px-3 text-right">{formatCount(row.notStarted)}</td>
              <td className="num px-3 text-right">{formatCount(row.inProgress)}</td>
              <td className="num px-3 text-right">{formatCount(row.done)}</td>
              <td className="num px-3 text-right">{formatBusinessTime(row.earliestReadyBy, timeZone)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
