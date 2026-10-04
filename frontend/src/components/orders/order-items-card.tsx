import { MoneyBreakdown } from "@/components/app/money-breakdown";
import { Panel } from "@/components/app/panel";
import type { OrderDetail } from "@/lib/api";
import { formatCount, formatMoney } from "@/lib/format";

/** Lines and combinations exactly as snapshotted on the order (never live catalogue prices). */
export function OrderItemsCard({ order }: { order: OrderDetail }) {
  const meals = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <Panel title="Items" description={`${formatCount(meals)} meal${meals === 1 ? "" : "s"} in ${order.lines.length} line${order.lines.length === 1 ? "" : "s"}`} flush>
      <ul className="divide-y">
        {order.lines.map((line) => (
          <li key={line.id} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium">
                <span className="num mr-2 text-muted-foreground">{line.quantity}×</span>
                {line.dishNameSnapshot}
                <span className="num ml-2 text-xs text-muted-foreground">{line.dishSkuSnapshot}</span>
              </p>
              <span className="num text-sm font-semibold">{formatMoney(line.lineTotalCents)}</span>
            </div>
            <ul className="mt-2 flex flex-col gap-1.5 border-l-2 pl-3">
              {line.combinations.map((combo) => (
                <li key={combo.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="num w-8 text-muted-foreground">{combo.quantity}×</span>
                  <span className="flex flex-1 flex-wrap gap-1">
                    {combo.options.length === 0 ? (
                      <span className="text-muted-foreground">No options</span>
                    ) : (
                      combo.options.map((option) => (
                        <span key={option.id} className="rounded-md border bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                          <span className="text-muted-foreground">{option.optionGroupNameSnapshot}:</span> {option.optionNameSnapshot}
                          {option.portionNameSnapshot && ` · ${option.portionNameSnapshot}`}
                        </span>
                      ))
                    )}
                  </span>
                  <span className="num text-xs text-muted-foreground">{formatMoney(combo.unitPriceCents)} each</span>
                  <span className="num w-24 text-right">{formatMoney(combo.totalCents)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <div className="border-t p-4">
        <MoneyBreakdown
          rows={order.lines.map((line) => ({ label: `${line.quantity}× ${line.dishNameSnapshot}`, cents: line.lineTotalCents }))}
          total={{ label: "Order total", cents: order.totalCents }}
          note={
            order.billableTotalCents !== null
              ? `Billable amount ${formatMoney(order.billableTotalCents)} frozen at confirmation.`
              : "Prices are frozen when the order is saved."
          }
        />
      </div>
    </Panel>
  );
}
