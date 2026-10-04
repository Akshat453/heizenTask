/**
 * String-based conversions for form inputs so money and ratios never pass
 * through floating-point arithmetic.
 */

/** "105.5" -> 10550; "" -> null; invalid -> NaN. Up to 2 decimals, no negatives. */
export function parseMoneyToCents(input: string): number | null {
  const value = input.trim().replace(/,/g, "");
  if (value === "") return null;
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(value);
  if (!match) return Number.NaN;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

/** 10550 -> "105.50" (for editing; display uses formatMoney). */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/** Decimal string -> integer scaled by 10^places ("2.4", 4 -> 24000; "-5", 2 -> -500). NaN if invalid. */
export function parseScaled(input: string, places: number): number {
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec(input.trim());
  if (!match || (match[3] ?? "").length > places) return Number.NaN;
  const value = Number(match[2]) * 10 ** places + Number((match[3] ?? "").padEnd(places, "0") || "0");
  return match[1] ? -value : value;
}

/** Integer scaled by 10^places -> trimmed decimal string (24000, 4 -> "2.4"). */
export function formatScaled(value: number, places: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const whole = Math.trunc(abs / 10 ** places);
  const frac = String(abs % 10 ** places).padStart(places, "0").replace(/0+$/, "");
  return `${sign}${whole}${frac ? `.${frac}` : ""}`;
}
