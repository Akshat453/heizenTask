import { Temporal } from '@js-temporal/polyfill';

/**
 * Pure business-time conversions. They never consult the server's local
 * timezone: every instant is derived from an explicit IANA timezone.
 */

export type LocalTime = { hour: number; minute: number };

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Strict calendar date (YYYY-MM-DD only; rejects timestamps and impossible dates). */
export function parseIsoDate(value: string): Temporal.PlainDate {
  if (!ISO_DATE_PATTERN.test(value))
    throw new RangeError(`'${value}' is not a YYYY-MM-DD date.`);
  return Temporal.PlainDate.from(value, { overflow: 'reject' });
}

export function isIsoDate(value: string): boolean {
  try {
    parseIsoDate(value);
    return true;
  } catch {
    return false;
  }
}

/** Strict 24-hour HH:mm. */
export function parseLocalTime(value: string): LocalTime {
  const match = LOCAL_TIME_PATTERN.exec(value);
  if (!match) throw new RangeError(`'${value}' is not an HH:mm time.`);
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function formatLocalTime({ hour, minute }: LocalTime): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Decodes a Postgres TIME column. Prisma returns TIME values as
 * 1970-01-01T<HH:mm>Z, i.e. the wall-clock value is carried in the UTC fields.
 */
export function localTimeFromDbTime(value: Date): LocalTime {
  return { hour: value.getUTCHours(), minute: value.getUTCMinutes() };
}

/** Decodes a Postgres DATE column (returned as UTC midnight) to YYYY-MM-DD. */
export function isoDateFromDbDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Encodes YYYY-MM-DD for a Postgres DATE column. */
export function dbDateFromIsoDate(value: string): Date {
  return new Date(`${parseIsoDate(value).toString()}T00:00:00.000Z`);
}

/** Business-local date + wall-clock time in `timeZone` → exact UTC instant. */
export function businessLocalDateTimeToInstant(
  date: string,
  time: LocalTime | string,
  timeZone: string,
): Date {
  const { hour, minute } =
    typeof time === 'string' ? parseLocalTime(time) : time;
  const zoned = parseIsoDate(date).toZonedDateTime({
    timeZone,
    plainTime: Temporal.PlainTime.from({ hour, minute }),
  });
  return new Date(zoned.epochMilliseconds);
}

/** Exact instant → wall-clock time in `timeZone`. */
export function instantToBusinessLocalTime(
  instant: Date,
  timeZone: string,
): LocalTime {
  const zoned = Temporal.Instant.fromEpochMilliseconds(
    instant.getTime(),
  ).toZonedDateTimeISO(timeZone);
  return { hour: zoned.hour, minute: zoned.minute };
}

/** Exact instant → business-local calendar date (YYYY-MM-DD) in `timeZone`. */
export function instantToBusinessDate(instant: Date, timeZone: string): string {
  return Temporal.Instant.fromEpochMilliseconds(instant.getTime())
    .toZonedDateTimeISO(timeZone)
    .toPlainDate()
    .toString();
}
