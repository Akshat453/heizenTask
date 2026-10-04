"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { ComboboxItem } from "@/components/app/entity-combobox";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { ordersApi, type MenuPreviewDish, type OrderDetail } from "@/lib/api";
import { CONFLICT_MESSAGE, isApiError } from "@/lib/api-client";
import { formatBusinessTime, formatMoney, formatTimeOfDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { invalidateOrders } from "../queries";
import { BuilderSummary } from "./builder-summary";
import { DishConfigurator } from "./dish-configurator";
import { mapOrderErrors, type BuilderStep, type MappedErrors } from "./errors";
import { dishIndex, estimateLineCents, linesFromOrder, toLineInputs, type DeliveryDraft, type LineDraft } from "./model";
import { StepDelivery, type DeliveryBaseline } from "./step-delivery";
import { StepDishes } from "./step-dishes";
import { StepEmployee } from "./step-employee";
import { useBuilderData } from "./use-builder-data";

const STEPS: { step: BuilderStep; label: string }[] = [
  { step: 1, label: "Employee and date" },
  { step: 2, label: "Dishes" },
  { step: 3, label: "Delivery and review" },
];

type Props = { order?: OrderDetail; initialEmployee?: ComboboxItem };

/** Create (no `order`) or edit a DRAFT/PLACED order in three steps. */
export function OrderBuilder({ order, initialEmployee }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { businessDate: today, timeZone } = useBusinessClock();
  const editing = Boolean(order);

  const [step, setStep] = useState<BuilderStep>(editing ? 2 : 1);
  const [employee, setEmployee] = useState<ComboboxItem | null>(order ? { id: order.employee.id, label: order.employee.name } : (initialEmployee ?? null));
  const [date, setDate] = useState<string | null>(order ? order.deliveryDate.slice(0, 10) : null);
  const [lines, setLines] = useState<LineDraft[]>(() => (order ? linesFromOrder(order) : []));
  const [delivery, setDelivery] = useState<DeliveryDraft>({});
  const [configuring, setConfiguring] = useState<{ dish: MenuPreviewDish; line?: LineDraft } | null>(null);
  const [errors, setErrors] = useState<MappedErrors | null>(null);

  const data = useBuilderData(employee?.id ?? null, today);
  const dishes = dishIndex(data.menu.data);
  const company = data.company.data;
  const baseline: DeliveryBaseline = order
    ? { addressId: order.deliveryAddressId, time: formatBusinessTime(order.deliveryAt, timeZone), packagingId: order.packagingTypeId }
    : {
        addressId: data.employee.data?.defaultDeliveryAddress?.id ?? null,
        time: company ? formatTimeOfDay(company.defaultDeliveryTime) : "",
        packagingId: company?.defaultPackagingTypeId ?? null,
      };
  // Send only what the user changed from the default (create) or the current value (edit).
  const differs = (value: string | undefined, base: string | null) => value !== undefined && value !== base;
  const choices = {
    ...(differs(delivery.addressId, baseline.addressId) && { deliveryAddressId: delivery.addressId }),
    ...(differs(delivery.time, baseline.time) && { deliveryTime: delivery.time }),
    ...(differs(delivery.packagingId, baseline.packagingId) && { packagingTypeId: delivery.packagingId }),
  };

  const save = useMutation({
    mutationFn: (place: boolean) =>
      order
        ? ordersApi.update(order.id, { lines: toLineInputs(lines), ...choices, ...(place && { placeOrder: true }) })
        : ordersApi.create({ employeeId: employee!.id, deliveryDate: date!, placeOrder: place, lines: toLineInputs(lines), ...choices }),
    onSuccess: (saved, place) => {
      setErrors(null);
      toast.success(place ? "Order placed" : order ? "Order updated" : "Draft saved");
      invalidateOrders(queryClient, saved.id);
      router.push(`/orders/${saved.id}`);
    },
    onError: (error) => {
      const mapped = mapOrderErrors(error, lines);
      setErrors(mapped);
      setStep(mapped.step);
      if (isApiError(error, 409)) toast.error(CONFLICT_MESSAGE, { description: error.message });
    },
  });

  const canNext = step === 1 ? Boolean(employee && date) : step === 2 ? lines.length > 0 : false;
  const upsertLine = (line: LineDraft) => {
    setLines((current) => (current.some((l) => l.key === line.key) ? current.map((l) => (l.key === line.key ? line : l)) : [...current, line]));
    setErrors((e) => (e ? { ...e, lines: { ...e.lines, [line.key]: [] } } : e));
    setConfiguring(null);
  };
  const openDish = (dish: MenuPreviewDish) => setConfiguring({ dish, line: lines.find((l) => l.dishId === dish.id) });
  const editLine = (line: LineDraft) => {
    const dish = dishes.get(line.dishId);
    if (dish) setConfiguring({ dish, line });
    else toast.error(`${line.dishName} is no longer orderable for this employee. Remove it to save.`);
  };
  const estimates = lines.map((l) => estimateLineCents(dishes.get(l.dishId), l));
  const estimatedTotal = estimates.every((e) => e !== null) ? estimates.reduce<number>((s, e) => s + (e ?? 0), 0) : null;

  const summary = (
    <BuilderSummary
      employeeName={employee?.label ?? null}
      companyName={data.employee.data?.company.name ?? null}
      date={date}
      cutoff={date ? data.cutoffs.data?.get(date) : undefined}
      lines={lines}
      dishes={dishes}
      lineErrors={errors?.lines ?? {}}
      onEdit={editLine}
      onRemove={(line) => setLines((current) => current.filter((l) => l.key !== line.key))}
    />
  );
  const placing = !order || order.status === "DRAFT";

  return (
    <main className="flex flex-col gap-6 p-4 pb-28 md:p-6 lg:pb-6">
      <header className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{order ? `Edit ${order.orderNumber}` : "New order"}</h1>
        <ol className="flex flex-wrap items-center gap-2" aria-label="Steps">
          {STEPS.map(({ step: s, label }) => (
            <li key={s} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (s < step || (s === 2 && employee && date) || (s === 3 && lines.length > 0)) && setStep(s)}
                aria-current={s === step ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1 text-sm",
                  s === step ? "border-primary bg-primary text-primary-foreground" : s < step ? "bg-success-soft text-success" : "text-muted-foreground",
                )}
              >
                <span className="num">{s < step ? <Check className="size-3.5" /> : s}</span>
                {label}
              </button>
              {s < 3 && <span aria-hidden className="h-px w-6 bg-border" />}
            </li>
          ))}
        </ol>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="flex min-w-0 flex-col gap-4 lg:col-span-8">
          {errors && errors.step === step && <FormErrorAlert messages={[...errors.form]} />}
          {step === 1 && <StepEmployee editing={editing} employee={employee} onEmployee={(e) => { setEmployee(e); setLines([]); setDelivery({}); }} date={date} onDate={setDate} data={data} />}
          {step === 2 && <StepDishes data={data} lines={lines} onConfigure={openDish} />}
          {step === 3 && (
            <StepDelivery data={data} lines={lines} delivery={delivery} baseline={baseline} onDelivery={setDelivery} fieldErrors={errors?.fields ?? {}} />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => (s - 1) as BuilderStep)}>
              <ArrowLeft data-icon="inline-start" /> Back
            </Button>
            {step < 3 ? (
              <Button disabled={!canNext} onClick={() => setStep((s) => (s + 1) as BuilderStep)}>
                Next <ArrowRight data-icon="inline-end" />
              </Button>
            ) : (
              <div className="flex gap-2">
                {placing ? (
                  <>
                    <Button variant="secondary" disabled={save.isPending || lines.length === 0} onClick={() => save.mutate(false)}>
                      {save.isPending && save.variables === false ? "Saving…" : "Save as draft"}
                    </Button>
                    <Button disabled={save.isPending || lines.length === 0} onClick={() => save.mutate(true)}>
                      {save.isPending && save.variables === true ? "Placing…" : "Place order"}
                    </Button>
                  </>
                ) : (
                  <Button disabled={save.isPending || lines.length === 0} onClick={() => save.mutate(false)}>
                    {save.isPending ? "Saving…" : "Save changes"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="hidden lg:col-span-4 lg:block">
          <div className="sticky top-20 rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-base font-semibold">Summary</h2>
            {summary}
          </div>
        </aside>
      </div>

      {/* Mobile: summary as a bottom drawer */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background p-3 lg:hidden">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" className="w-full justify-between" />}>
            <span className="flex items-center gap-2">
              <Receipt /> {lines.length} line{lines.length === 1 ? "" : "s"}
            </span>
            <span className="num">{formatMoney(estimatedTotal)} est.</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto p-4">
            <SheetHeader className="p-0">
              <SheetTitle>Summary</SheetTitle>
            </SheetHeader>
            {summary}
          </SheetContent>
        </Sheet>
      </div>

      {configuring && (
        <DishConfigurator
          dish={configuring.dish}
          initial={configuring.line}
          serverErrors={configuring.line ? errors?.lines[configuring.line.key] : undefined}
          onSave={upsertLine}
          onClose={() => setConfiguring(null)}
        />
      )}
    </main>
  );
}
