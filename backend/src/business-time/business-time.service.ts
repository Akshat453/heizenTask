import { Injectable } from '@nestjs/common';
import { Temporal } from '@js-temporal/polyfill';
import type { DayOfWeek } from '../generated/prisma/enums.js';
import { SettingsService } from '../settings/settings.service.js';

/** Maps Prisma DayOfWeek enum to Temporal.PlainDate.dayOfWeek (1=Mon, 7=Sun). */
const DAY_TO_ISO: Record<DayOfWeek, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
};

export type CutoffInfo = {
  /** ISO date string of the delivery date */
  deliveryDate: string;
  /** Exact instant the cut-off passes (in business timezone) */
  cutoffInstant: string;
  /** Whether the cut-off has already passed relative to now */
  passed: boolean;
  /** ISO date string of the cut-off date */
  cutoffDate: string;
};

@Injectable()
export class BusinessTimeService {
  constructor(private readonly settings: SettingsService) {}

  /**
   * Return the cutoff instant for a given delivery date (YYYY-MM-DD) in the kitchen timezone.
   *
   * Algorithm:
   * 1. Start from the delivery date in kitchen timezone.
   * 2. Count back `cutoffWorkingDayCount` kitchen working days
   *    (skip kitchen holidays and non-working days).
   * 3. Combine that date with the cutoffTime to get the cutoff ZonedDateTime.
   */
  async getCutoffForDeliveryDate(deliveryDateIso: string): Promise<CutoffInfo> {
    const cfg = await this.settings.loadForBusinessTime();
    return this.computeCutoff(deliveryDateIso, cfg);
  }

  async isDeliveryDateOpen(deliveryDateIso: string): Promise<boolean> {
    const info = await this.getCutoffForDeliveryDate(deliveryDateIso);
    return !info.passed;
  }

  /**
   * Pure computation (no I/O) – exposed for unit testing.
   */
  computeCutoff(
    deliveryDateIso: string,
    cfg: {
      timezone: string;
      cutoffTime: Date;
      cutoffWorkingDayCount: number;
      workingDays: DayOfWeek[];
      holidayDates: Date[];
    },
  ): CutoffInfo {
    const tz = cfg.timezone;
    const workingDaySet = new Set(cfg.workingDays.map((d) => DAY_TO_ISO[d]));

    // Build a set of holiday date strings in 'YYYY-MM-DD' format (timezone-agnostic, stored as UTC midnight)
    const holidaySet = new Set(
      cfg.holidayDates.map((d) => {
        const pd = Temporal.Instant.fromEpochMilliseconds(d.getTime()).toZonedDateTimeISO('UTC').toPlainDate();
        return pd.toString();
      }),
    );

    // Extract HH:MM from the DB Time value (stored as 1970-01-01T HH:MM:00.000Z)
    const cutoffHour = cfg.cutoffTime.getUTCHours();
    const cutoffMinute = cfg.cutoffTime.getUTCMinutes();

    let cursor = Temporal.PlainDate.from(deliveryDateIso);
    let daysRemaining = cfg.cutoffWorkingDayCount;

    while (daysRemaining > 0) {
      cursor = cursor.subtract({ days: 1 });
      if (workingDaySet.has(cursor.dayOfWeek) && !holidaySet.has(cursor.toString())) {
        daysRemaining--;
      }
    }

    const cutoffDate = cursor.toString();
    const cutoffZdt = cursor
      .toZonedDateTime({ timeZone: tz, plainTime: Temporal.PlainTime.from({ hour: cutoffHour, minute: cutoffMinute }) });

    const nowZdt = Temporal.Now.zonedDateTimeISO(tz);
    const passed = Temporal.ZonedDateTime.compare(nowZdt, cutoffZdt) >= 0;

    return {
      deliveryDate: deliveryDateIso,
      cutoffDate,
      cutoffInstant: cutoffZdt.toInstant().toString(),
      passed,
    };
  }

  /**
   * Return the list of valid delivery dates for a company in the next N days.
   * Uses company working days + company holidays (company calendar).
   */
  async validDeliveryDates(
    companyWorkingDays: DayOfWeek[],
    companyHolidayDates: Date[],
    lookAheadDays = 14,
  ): Promise<string[]> {
    const cfg = await this.settings.loadForBusinessTime();
    const tz = cfg.timezone;
    const companyDaySet = new Set(companyWorkingDays.map((d) => DAY_TO_ISO[d]));
    const companyHolidaySet = new Set(
      companyHolidayDates.map((d) =>
        Temporal.Instant.fromEpochMilliseconds(d.getTime()).toZonedDateTimeISO('UTC').toPlainDate().toString(),
      ),
    );

    const today = Temporal.Now.plainDateISO(tz);
    const results: string[] = [];
    for (let i = 1; i <= lookAheadDays; i++) {
      const candidate = today.add({ days: i });
      if (companyDaySet.has(candidate.dayOfWeek) && !companyHolidaySet.has(candidate.toString())) {
        // Also check that the cutoff hasn't already passed for this date
        const { passed } = this.computeCutoff(candidate.toString(), cfg);
        if (!passed) results.push(candidate.toString());
      }
    }
    return results;
  }
}
