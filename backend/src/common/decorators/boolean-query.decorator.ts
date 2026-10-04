import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Parses a boolean query parameter. Query strings are text, and
 * `@Type(() => Boolean)` would run `Boolean("false")`, which is `true`.
 *   "true" | "1" -> true, "false" | "0" -> false, missing/"" -> undefined.
 * Anything else is left as-is so @IsBoolean rejects it with a 400.
 */
export function parseBooleanQuery(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return value;
}

export function BooleanQuery(): PropertyDecorator {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) => parseBooleanQuery(value)),
    IsOptional(),
    IsBoolean({ message: '$property must be true, false, 1 or 0.' }),
  );
}
