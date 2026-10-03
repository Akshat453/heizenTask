import 'dotenv/config';

import { createHash } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.js';
import { DayOfWeek } from '../src/generated/prisma/enums.js';

export const BUSINESS_TIME_ZONE = 'Asia/Kolkata';

export type PlainDate = Readonly<{
  year: number;
  month: number;
  day: number;
}>;

export function createSeedClient(): PrismaClient {
  const connectionString =
    process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error(
      'DIRECT_URL or DATABASE_URL is required for Prisma seed operations.',
    );
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export function seedId(key: string): string {
  const bytes = Buffer.from(
    createHash('sha256').update(`heizen-demo:${key}`).digest().subarray(0, 16),
  );
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function businessToday(now = new Date()): PlainDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

export function dateKey(date: PlainDate): string {
  return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

export function addDays(date: PlainDate, days: number): PlainDate {
  const shifted = new Date(
    Date.UTC(date.year, date.month - 1, date.day + days),
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function compareDates(left: PlainDate, right: PlainDate): number {
  return dateKey(left).localeCompare(dateKey(right));
}

export function asDateOnly(date: PlainDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

export function timeOnly(hour: number, minute: number): Date {
  return new Date(Date.UTC(1970, 0, 1, hour, minute));
}

function zonedParts(
  instant: Date,
): Required<PlainDate> & { hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

export function businessInstant(
  date: PlainDate,
  hour: number,
  minute: number,
  second = 0,
): Date {
  const wallClockAsUtc = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    hour,
    minute,
    second,
  );
  const probe = new Date(wallClockAsUtc);
  const parts = zonedParts(probe);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const instant = new Date(
    wallClockAsUtc - (representedAsUtc - wallClockAsUtc),
  );
  const roundTrip = zonedParts(instant);
  if (
    roundTrip.year !== date.year ||
    roundTrip.month !== date.month ||
    roundTrip.day !== date.day ||
    roundTrip.hour !== hour ||
    roundTrip.minute !== minute ||
    roundTrip.second !== second
  ) {
    throw new Error(
      `Could not construct ${dateKey(date)} ${hour}:${minute}:${second} in ${BUSINESS_TIME_ZONE}.`,
    );
  }
  return instant;
}

export function dayOfWeek(date: PlainDate): DayOfWeek {
  const values = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ] as const;
  return values[
    new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()
  ]!;
}

export function assertIntegerMoney(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      `${label} must be a non-negative safe integer number of cents.`,
    );
  }
  return value;
}

export function roundUpTo5(value: number): number {
  return Math.ceil(assertIntegerMoney(value, 'price') / 5) * 5;
}

export function scaledPrice(value: number, basisPoints: number): number {
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0) {
    throw new Error('Basis points must be a non-negative safe integer.');
  }
  return roundUpTo5(
    Math.ceil((assertIntegerMoney(value, 'base price') * basisPoints) / 10_000),
  );
}
