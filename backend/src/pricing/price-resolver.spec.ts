import { describe, expect, it } from 'vitest';
import { roundUpToFiveCents, scaledPrice } from './price-resolver.utils.js';

// Re-export the internal helpers for testing
// Since they are not exported from price-resolver.service.ts we define the
// same logic here to avoid exposing internals while still testing behaviour.

describe('roundUpToFiveCents', () => {
  it('returns the value unchanged when already a multiple of 5', () => {
    expect(roundUpToFiveCents(100)).toBe(100);
    expect(roundUpToFiveCents(0)).toBe(0);
    expect(roundUpToFiveCents(205)).toBe(205);
  });

  it('rounds up to the next multiple of 5', () => {
    expect(roundUpToFiveCents(211)).toBe(215);
    expect(roundUpToFiveCents(201)).toBe(205);
    expect(roundUpToFiveCents(204)).toBe(205);
    expect(roundUpToFiveCents(1)).toBe(5);
  });

  it('throws for negative values', () => {
    expect(() => roundUpToFiveCents(-1)).toThrow(RangeError);
  });
});

describe('scaledPrice', () => {
  it('applies a cost multiplier (bps) and rounds up to 5 cents', () => {
    // 2.4× = 24000 bps; 100 cents → 240 cents
    expect(scaledPrice(100, 24_000)).toBe(240);
    // 2.4× on 99 cents = 237.6 → rounds up to 240
    expect(scaledPrice(99, 24_000)).toBe(240);
  });

  it('applies TIER_PERCENTAGE adjustment', () => {
    // +15% = 11500 bps; 200 cents → 230 cents
    expect(scaledPrice(200, 11_500)).toBe(230);
  });

  it('handles zero base price', () => {
    expect(scaledPrice(0, 24_000)).toBe(0);
  });

  it('throws for negative inputs', () => {
    expect(() => scaledPrice(-1, 10_000)).toThrow(RangeError);
    expect(() => scaledPrice(100, -1)).toThrow(RangeError);
  });
});
