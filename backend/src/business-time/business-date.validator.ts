import { IsISO8601, Matches } from 'class-validator';
import { ISO_DATE_PATTERN } from './business-time.utils.js';

/** Strict business-local calendar date: YYYY-MM-DD only (no timestamps, no impossible dates). */
export function IsBusinessDate(): PropertyDecorator {
  return (target, key) => {
    Matches(ISO_DATE_PATTERN, {
      message: `${String(key)} must be a YYYY-MM-DD date.`,
    })(target, key);
    IsISO8601(
      { strict: true, strictSeparator: true },
      { message: `${String(key)} must be a valid calendar date.` },
    )(target, key);
  };
}
