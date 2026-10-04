"use client";

import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { MoneyBreakdown } from "@/components/app/money-breakdown";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { dishIndex, estimateLineCents, type DeliveryDraft, type LineDraft } from "./model";
import type { BuilderData } from "./use-builder-data";

export type DeliveryBaseline = { addressId: string | null; time: string; packagingId: string | null };

type Props = {
  data: BuilderData;
  lines: LineDraft[];
  delivery: DeliveryDraft;
  baseline: DeliveryBaseline;
  onDelivery: (delivery: DeliveryDraft) => void;
  fieldErrors: Partial<Record<"address" | "time" | "packaging", string>>;
};

function Field({ label, locked, lockedText, error, htmlFor, children }: {
  label: string; locked: boolean; lockedText: string; error?: string; htmlFor: string; children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="flex items-center gap-1.5">
        {label}
        {locked && (
          <Tooltip>
            <TooltipTrigger render={<span tabIndex={0} aria-label={lockedText} />}>
              <Lock className="size-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>{lockedText}</TooltipContent>
          </Tooltip>
        )}
      </Label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function StepDelivery({ data, lines, delivery, baseline, onDelivery, fieldErrors }: Props) {
  const { timeZone } = useBusinessClock();
  const employee = data.employee.data;
  const addresses = (data.company.data?.addresses ?? []).filter((a) => a.isActive);
  const packagings = (data.packagings.data ?? []).filter((p) => p.isActive);
  const dishes = dishIndex(data.menu.data);
  const addressId = delivery.addressId ?? baseline.addressId ?? "";
  const time = delivery.time ?? baseline.time;
  const packagingId = delivery.packagingId ?? baseline.packagingId ?? "";
  const estimates = lines.map((line) => estimateLineCents(dishes.get(line.dishId), line));
  const knownTotal = estimates.every((e) => e !== null);

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-4 sm:grid-cols-3">
        <Field label="Address" htmlFor="b-address" locked={!employee?.canChooseDeliveryAddress} lockedText="This employee can't change the address" error={fieldErrors.address}>
          <Select value={addressId} disabled={!employee?.canChooseDeliveryAddress} onValueChange={(v) => onDelivery({ ...delivery, addressId: String(v ?? "") || undefined })}>
            <SelectTrigger id="b-address" className="w-full">
              <SelectValue>{(v: string) => addresses.find((a) => a.id === v)?.label ?? "Company default"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {addresses.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label} <span className="text-xs text-muted-foreground">{a.city}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={`Delivery time (${timeZone})`} htmlFor="b-time" locked={!employee?.canChangeDeliveryTime} lockedText="This employee can't change the time" error={fieldErrors.time}>
          <Input
            id="b-time"
            type="time"
            step={300}
            className="num"
            value={time}
            disabled={!employee?.canChangeDeliveryTime}
            onChange={(e) => onDelivery({ ...delivery, time: e.target.value || undefined })}
          />
        </Field>
        <Field label="Packaging" htmlFor="b-packaging" locked={!employee?.canChangePackaging} lockedText="This employee can't change the packaging" error={fieldErrors.packaging}>
          <Select value={packagingId} disabled={!employee?.canChangePackaging} onValueChange={(v) => onDelivery({ ...delivery, packagingId: String(v ?? "") || undefined })}>
            <SelectTrigger id="b-packaging" className="w-full">
              <SelectValue>{(v: string) => packagings.find((p) => p.id === v)?.name ?? "Company default"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {packagings.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Review</h2>
        <ul className="divide-y rounded-lg border bg-card">
          {lines.map((line) => {
            const dish = dishes.get(line.dishId);
            return (
              <li key={line.key} className="px-4 py-3 text-sm">
                <p className="font-medium">
                  <span className="num mr-2 text-muted-foreground">{line.quantity}×</span>
                  {line.dishName}
                </p>
                <ul className="mt-1 flex flex-col gap-0.5 border-l-2 pl-3 text-muted-foreground">
                  {line.combinations.map((combo) => (
                    <li key={combo.key}>
                      <span className="num">{combo.quantity}×</span>{" "}
                      {dish?.optionGroups
                        .flatMap((group) => {
                          const s = combo.selections[group.id];
                          const option = s && group.options.find((o) => o.id === s.optionId);
                          const portion = s?.portionSizeId && group.portions.find((p) => p.id === s.portionSizeId);
                          return option ? [`${option.name}${portion ? ` (${portion.name})` : ""}`] : [];
                        })
                        .join(", ") || "No options"}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
        <MoneyBreakdown
          className="max-w-md self-end"
          rows={lines.map((line, i) => ({ label: `${line.quantity}× ${line.dishName}`, cents: estimates[i], muted: estimates[i] === null }))}
          total={{ label: "Estimated total", cents: knownTotal ? estimates.reduce<number>((sum, e) => sum + (e ?? 0), 0) : null }}
          note="Estimated. Final prices are calculated by the server when you save."
        />
      </section>
    </div>
  );
}
