/** Round a price in cents up to the nearest 5-cent increment. */
export function roundUpToFiveCents(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Price must be a nonnegative safe integer.');
  return Math.ceil(value / 5) * 5;
}

/**
 * Apply a basis-point scale factor to a base price and round up to 5 cents.
 * e.g. cost × 2.4 = scaledPrice(costCents, 24_000)
 *      +15%        = scaledPrice(baseCents, 11_500)
 */
export function scaledPrice(base: number, scaleBps: number): number {
  if (!Number.isSafeInteger(base) || !Number.isSafeInteger(scaleBps) || base < 0 || scaleBps < 0) {
    throw new RangeError('Scaled price inputs must be nonnegative safe integers.');
  }
  const numerator = BigInt(base) * BigInt(scaleBps);
  const raw = Number((numerator + 9_999n) / 10_000n);
  if (!Number.isSafeInteger(raw)) throw new RangeError('Resolved price exceeds the safe integer range.');
  return roundUpToFiveCents(raw);
}
