import { describe, expect, it } from 'vitest';
import { classifyKitchenTiming } from '../kitchen/services/kitchen-timing.helper.js';
import { dropOnTime } from './drop-timing.js';

describe('dropOnTime', () => {
  const scheduledDeliveryAt = new Date('2026-10-05T07:00:00.000Z');
  it('is null before delivery', () =>
    expect(dropOnTime({ deliveredAt: null, scheduledDeliveryAt })).toBeNull());
  it('treats exact equality as on time, with no grace period', () => {
    expect(
      dropOnTime({
        deliveredAt: new Date(scheduledDeliveryAt),
        scheduledDeliveryAt,
      }),
    ).toBe(true);
    expect(
      dropOnTime({
        deliveredAt: new Date(scheduledDeliveryAt.getTime() - 1),
        scheduledDeliveryAt,
      }),
    ).toBe(true);
    expect(
      dropOnTime({
        deliveredAt: new Date(scheduledDeliveryAt.getTime() + 1),
        scheduledDeliveryAt,
      }),
    ).toBe(false);
  });
});

describe('classifyKitchenTiming', () => {
  const plannedKitchenReadyAt = new Date('2026-10-05T05:30:00.000Z');
  const at = (offsetMs: number, atRiskWindowMinutes = 30, complete = false) =>
    classifyKitchenTiming({
      plannedKitchenReadyAt,
      now: new Date(plannedKitchenReadyAt.getTime() + offsetMs),
      atRiskWindowMinutes,
      complete,
    });

  it('is LATE at the exact deadline and after', () => {
    expect(at(0)).toBe('LATE');
    expect(at(60_000)).toBe('LATE');
  });
  it('is AT_RISK inside the window and ON_TRACK before it', () => {
    expect(at(-1)).toBe('AT_RISK');
    expect(at(-30 * 60_000)).toBe('AT_RISK');
    expect(at(-30 * 60_000 - 1)).toBe('ON_TRACK');
  });
  it('treats a zero-minute window as valid (never AT_RISK)', () => {
    expect(at(-1, 0)).toBe('ON_TRACK');
    expect(at(0, 0)).toBe('LATE');
  });
  it('never classifies completed work as late or at risk', () =>
    expect(at(60_000, 30, true)).toBe('COMPLETE'));
});
