import { afterEach, describe, expect, it, vi } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { BusinessTimeService } from './business-time.service.js';
import type { DayOfWeek } from '../generated/prisma/enums.js';

// We test computeCutoff() directly — no DB or NestJS required.
// SettingsService is NOT injected; we call computeCutoff() with inline config.

const MON_TO_FRI: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
];

function makeService() {
  // Provide a minimal stub for SettingsService; we only call computeCutoff() in tests.
  return new BusinessTimeService(null as never);
}

function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function cutoffTimeDate(hh: number, mm: number): Date {
  const d = new Date(0); // 1970-01-01
  d.setUTCHours(hh, mm, 0, 0);
  return d;
}

describe('BusinessTimeService.computeCutoff', () => {
  const service = makeService();
  const TZ = 'Asia/Kolkata';

  const baseCfg = {
    timezone: TZ,
    cutoffTime: cutoffTimeDate(10, 30), // 10:30 kitchen time
    cutoffWorkingDayCount: 2,
    workingDays: MON_TO_FRI,
    holidayDates: [] as Date[],
  };

  it('returns the correct cutoff date 2 working days before a Wednesday delivery', () => {
    // Wednesday delivery → count back: Tuesday (1), Monday (2) → cutoff is Monday
    const result = service.computeCutoff('2026-10-07', baseCfg); // Wednesday
    expect(result.cutoffDate).toBe('2026-10-05'); // Monday
  });

  it('returns the correct cutoff date 2 working days before a Monday delivery', () => {
    // Monday delivery → count back: Friday (1) from previous week, Thursday (2)
    const result = service.computeCutoff('2026-10-05', baseCfg); // Monday Oct 5
    expect(result.cutoffDate).toBe('2026-10-01'); // Thursday Oct 1
  });

  it('skips weekends when counting back', () => {
    // Tuesday delivery → count back: Monday (1), Friday (2) – skips weekend
    const result = service.computeCutoff('2026-10-06', baseCfg); // Tuesday Oct 6
    expect(result.cutoffDate).toBe('2026-10-02'); // Friday Oct 2
  });

  it('skips a kitchen holiday when counting back', () => {
    // Wednesday delivery with Monday as holiday
    // Count back: Tuesday (1), Monday is holiday → skip → Friday (2)
    const holidayCfg = {
      ...baseCfg,
      holidayDates: [utcDate('2026-10-05')], // Monday holiday
    };
    const result = service.computeCutoff('2026-10-07', holidayCfg); // Wednesday
    expect(result.cutoffDate).toBe('2026-10-02'); // Friday (Monday skipped)
  });

  it('skips multiple consecutive holidays', () => {
    // Wednesday delivery with Mon and Tue as holidays → count back 2 working days = Friday + Thursday
    const holidayCfg = {
      ...baseCfg,
      holidayDates: [utcDate('2026-10-05'), utcDate('2026-10-06')], // Mon + Tue
    };
    const result = service.computeCutoff('2026-10-07', holidayCfg); // Wednesday
    expect(result.cutoffDate).toBe('2026-10-01'); // Thursday
  });

  it('cutoff count of 1 lands one working day before delivery', () => {
    const cfg1 = { ...baseCfg, cutoffWorkingDayCount: 1 };
    const result = service.computeCutoff('2026-10-07', cfg1); // Wednesday
    expect(result.cutoffDate).toBe('2026-10-06'); // Tuesday
  });

  it('includes the correct cutoff time in the result', () => {
    const result = service.computeCutoff('2026-10-07', baseCfg);
    // The cutoff instant should encode 10:30 India time on the cutoff date
    const instant = Temporal.Instant.from(result.cutoffInstant);
    const cutoffZdt = instant.toZonedDateTimeISO(TZ);
    expect(cutoffZdt.hour).toBe(10);
    expect(cutoffZdt.minute).toBe(30);
  });

  it('includes the delivery date in the result', () => {
    const result = service.computeCutoff('2026-10-07', baseCfg);
    expect(result.deliveryDate).toBe('2026-10-07');
  });
});

describe('BusinessTimeService.computeCutoff boundaries', () => {
  const service = makeService();
  const cfg = {
    timezone: 'Asia/Kolkata',
    cutoffTime: cutoffTimeDate(16, 0),
    cutoffWorkingDayCount: 1,
    workingDays: MON_TO_FRI,
    holidayDates: [] as Date[],
  };
  const at = (iso: string) =>
    vi.spyOn(service, 'now').mockReturnValue(Temporal.Instant.from(iso));
  afterEach(() => vi.restoreAllMocks());

  it('treats now == cutoffAt as passed and one millisecond earlier as open', () => {
    // Monday 2026-10-05 delivery → cutoff Friday 2026-10-02 16:00 IST = 10:30Z.
    at('2026-10-02T10:29:59.999Z');
    expect(service.computeCutoff('2026-10-05', cfg).passed).toBe(false);
    at('2026-10-02T10:30:00.000Z');
    const info = service.computeCutoff('2026-10-05', cfg);
    expect(info).toMatchObject({
      cutoffDate: '2026-10-02',
      cutoffInstant: '2026-10-02T10:30:00Z',
      passed: true,
    });
  });

  it('supports a zero working-day cutoff on the delivery date itself', () => {
    at('2026-10-05T10:30:00.000Z');
    expect(
      service.computeCutoff('2026-10-05', { ...cfg, cutoffWorkingDayCount: 0 }),
    ).toMatchObject({ cutoffDate: '2026-10-05', passed: true });
    at('2026-10-05T10:29:00.000Z');
    expect(
      service.computeCutoff('2026-10-05', { ...cfg, cutoffWorkingDayCount: 0 })
        .passed,
    ).toBe(false);
  });

  it('rejects non YYYY-MM-DD delivery dates', () => {
    expect(() => service.computeCutoff('2026-10-05T00:00:00Z', cfg)).toThrow(
      RangeError,
    );
  });
});
