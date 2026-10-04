/**
 * Display formatting only. Money arrives as integer cents and dates/times are
 * shown in the backend's business timezone, never the browser's.
 */

export const LOCALE = "en-IN";
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY?.trim() || "INR";

const moneyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats integer cents (e.g. 21500 -> "₹215.00"). The amount is handed to Intl
 * as an exact decimal string built with integer arithmetic, so no float is involved.
 */
export function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  if (!Number.isSafeInteger(cents)) throw new TypeError(`formatMoney expects integer cents, got ${cents}`);
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const decimal = `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}` as `${number}`;
  return moneyFormatter.format(decimal);
}

/** "2026-10-04" from a calendar date or a DATE column ("2026-10-04T00:00:00.000Z"). */
export function toIsoDate(value: string): string {
  return value.slice(0, 10);
}

function calendarDate(isoDate: string): Date {
  const [y, m, d] = toIsoDate(isoDate).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function joinParts(parts: Intl.DateTimeFormatPart[]): string {
  return parts
    .map((p) => (p.type === "literal" ? p.value.replace(",", " ") : p.value))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** Calendar date (no timezone shift): "Sun 4 Oct", or "Sun 4 Oct 2026" with `withYear`. */
export function formatBusinessDate(isoDate: string, opts: { withYear?: boolean } = {}): string {
  const fmt = new Intl.DateTimeFormat(LOCALE, {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(opts.withYear ? { year: "numeric" } : {}),
  });
  return joinParts(fmt.formatToParts(calendarDate(isoDate)));
}

/** Wall-clock time of an instant in the business timezone: "13:05". */
export function formatBusinessTime(instant: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));
}

/** "Sun 4 Oct, 13:05" in the business timezone. */
export function formatBusinessDateTime(instant: string | Date, timeZone: string): string {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(instant));
  return `${formatBusinessDate(date)}, ${formatBusinessTime(instant, timeZone)}`;
}

/** Business calendar date ("YYYY-MM-DD") that an instant falls on, for display grouping only. */
export function businessDateOf(instant: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(instant));
}

/** TIME column ("1970-01-01T13:00:00.000Z") or "HH:mm[:ss]" -> "13:00". */
export function formatTimeOfDay(value: string): string {
  const match = /(\d{2}):(\d{2})/.exec(value.includes("T") ? value.split("T")[1] : value);
  return match ? `${match[1]}:${match[2]}` : value;
}

const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

/** "in 25 min", "12 min ago", "in 2 hr". `nowMs` comes from useBusinessClock (server-corrected). */
export function formatRelative(instant: string | Date, nowMs: number): string {
  const diffMin = Math.round((new Date(instant).getTime() - nowMs) / 60_000);
  if (Math.abs(diffMin) < 60) return relative.format(diffMin, "minute").replace("minutes", "min").replace("minute", "min");
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return relative.format(diffHr, "hour").replace("hours", "hr").replace("hour", "hr");
  return relative.format(Math.round(diffHr / 24), "day");
}

/** Short and long timezone names, e.g. "IST" / "India Standard Time". */
export function timeZoneNames(timeZone: string, at: Date = new Date()) {
  const name = (style: "short" | "long") =>
    new Intl.DateTimeFormat(LOCALE, { timeZone, timeZoneName: style })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value ?? timeZone;
  return { short: name("short"), long: name("long") };
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}

/** Calendar date in long form: "Sunday, 4 October". */
export function formatBusinessDateLong(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(
    calendarDate(isoDate),
  );
}

/** Hour of day (0-23) of an instant in the business timezone. */
export function businessHourOf(instant: number | Date, timeZone: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(new Date(instant)));
}

/** Duration until/since a deadline: "1 day 6 h", "5 h 20 min", "12 min", "under 1 min". */
export function formatDuration(ms: number): string {
  const totalMin = Math.floor(Math.abs(ms) / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  if (days > 0) return `${days} day${days === 1 ? "" : "s"}${hours ? ` ${hours} h` : ""}`;
  if (hours > 0) return `${hours} h${minutes ? ` ${minutes} min` : ""}`;
  return totalMin > 0 ? `${minutes} min` : "under 1 min";
}

/** Offset (ms) of a timezone from UTC at an instant, via Intl (no manual offset tables). */
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(instantMs))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

/**
 * Business-local date + "HH:mm" -> ISO instant with "Z", for inputs the API
 * takes as an explicit instant (admin delivery override). Display/input
 * conversion only; the API re-validates the result.
 */
export function businessWallTimeToIso(isoDate: string, time: string, timeZone: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let instant = wall - zoneOffsetMs(wall, timeZone);
  instant = wall - zoneOffsetMs(instant, timeZone); // second pass settles DST edges
  return new Date(instant).toISOString();
}

/** Packaging counts from the API, e.g. "18 boxed · 5 eco-tray". */
export function packagingText(packaging: { name: string; count: number }[]): string {
  return packaging.map((p) => `${p.count} ${p.name.toLowerCase()}`).join(" · ");
}
