import { afterEach, describe, expect, it } from 'vitest';
import {
  businessLocalDateTimeToInstant,
  dbDateFromIsoDate,
  instantToBusinessLocalTime,
  isIsoDate,
  isoDateFromDbDate,
  localTimeFromDbTime,
  parseIsoDate,
  parseLocalTime,
} from './business-time.utils.js';
import {
  calculatePlannedDispatchReadyAt,
  calculatePlannedKitchenReadyAt,
} from '../kitchen/services/kitchen-timing.helper.js';

describe('businessLocalDateTimeToInstant', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it('converts Asia/Kolkata wall-clock time to the correct UTC instant', () => {
    expect(
      businessLocalDateTimeToInstant(
        '2026-10-05',
        '12:30',
        'Asia/Kolkata',
      ).toISOString(),
    ).toBe('2026-10-05T07:00:00.000Z');
  });

  it('converts another IANA timezone, honouring DST', () => {
    // New York is UTC-4 in October (EDT) and UTC-5 in January (EST).
    expect(
      businessLocalDateTimeToInstant(
        '2026-10-05',
        '12:30',
        'America/New_York',
      ).toISOString(),
    ).toBe('2026-10-05T16:30:00.000Z');
    expect(
      businessLocalDateTimeToInstant(
        '2026-01-05',
        '12:30',
        'America/New_York',
      ).toISOString(),
    ).toBe('2026-01-05T17:30:00.000Z');
  });

  it('handles business-day boundaries that fall on a different UTC date', () => {
    expect(
      businessLocalDateTimeToInstant(
        '2026-10-05',
        '01:00',
        'Asia/Kolkata',
      ).toISOString(),
    ).toBe('2026-10-04T19:30:00.000Z');
    expect(
      businessLocalDateTimeToInstant(
        '2026-10-05',
        '23:30',
        'America/New_York',
      ).toISOString(),
    ).toBe('2026-10-06T03:30:00.000Z');
  });

  it('is independent of the server timezone', () => {
    const results = [
      'UTC',
      'America/Los_Angeles',
      'Pacific/Kiritimati',
      'Asia/Kolkata',
    ].map((tz) => {
      process.env.TZ = tz;
      return [
        businessLocalDateTimeToInstant(
          '2026-10-05',
          { hour: 9, minute: 15 },
          'Asia/Kolkata',
        ).toISOString(),
        isoDateFromDbDate(dbDateFromIsoDate('2026-10-05')),
        localTimeFromDbTime(new Date(Date.UTC(1970, 0, 1, 12, 30))),
        instantToBusinessLocalTime(
          new Date('2026-10-05T07:00:00.000Z'),
          'Asia/Kolkata',
        ),
      ];
    });
    for (const result of results) expect(result).toEqual(results[0]);
    expect(results[0]).toEqual([
      '2026-10-05T03:45:00.000Z',
      '2026-10-05',
      { hour: 12, minute: 30 },
      { hour: 12, minute: 30 },
    ]);
  });

  it('round-trips an instant back to business-local time', () => {
    const instant = businessLocalDateTimeToInstant(
      '2026-10-05',
      '18:05',
      'Asia/Kolkata',
    );
    expect(instantToBusinessLocalTime(instant, 'Asia/Kolkata')).toEqual({
      hour: 18,
      minute: 5,
    });
  });
});

describe('strict date and time parsing', () => {
  it('accepts only YYYY-MM-DD calendar dates', () => {
    expect(isIsoDate('2026-10-05')).toBe(true);
    expect(isIsoDate('2026-10-05T00:00:00Z')).toBe(false);
    expect(isIsoDate('2026-10-05T10:00:00+05:30')).toBe(false);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('20261005')).toBe(false);
    expect(() => parseIsoDate('2026-13-01')).toThrow(RangeError);
  });

  it('accepts only 24-hour HH:mm local times', () => {
    expect(parseLocalTime('00:00')).toEqual({ hour: 0, minute: 0 });
    expect(parseLocalTime('23:59')).toEqual({ hour: 23, minute: 59 });
    for (const bad of ['24:00', '9:30', '12:60', '12:30:00', ''])
      expect(() => parseLocalTime(bad)).toThrow(RangeError);
  });
});

describe('shared operational timing', () => {
  const deliveryAt = new Date('2026-10-05T07:00:00.000Z');

  it('plannedDispatchReadyAt = deliveryAt − snapshotted lead minutes', () => {
    expect(calculatePlannedDispatchReadyAt(deliveryAt, 60).toISOString()).toBe(
      '2026-10-05T06:00:00.000Z',
    );
  });

  it('plannedKitchenReadyAt = plannedDispatchReadyAt − configured buffer (zero allowed)', () => {
    expect(
      calculatePlannedKitchenReadyAt(deliveryAt, 60, 30).toISOString(),
    ).toBe('2026-10-05T05:30:00.000Z');
    expect(
      calculatePlannedKitchenReadyAt(deliveryAt, 60, 0).toISOString(),
    ).toBe('2026-10-05T06:00:00.000Z');
  });
});
