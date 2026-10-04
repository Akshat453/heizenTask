import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { normalizeCompanyDomain, dateOnly, timeOnly } from './domain.js';

describe('normalizeCompanyDomain', () => {
  it('normalises a simple domain', () => {
    expect(normalizeCompanyDomain('example.com')).toBe('example.com');
  });

  it('strips leading https://', () => {
    expect(normalizeCompanyDomain('https://example.com')).toBe('example.com');
  });

  it('strips email prefix', () => {
    expect(normalizeCompanyDomain('user@example.com')).toBe('example.com');
  });

  it('lowercases the domain', () => {
    expect(normalizeCompanyDomain('Example.COM')).toBe('example.com');
  });

  it('trims whitespace', () => {
    expect(normalizeCompanyDomain('  example.com  ')).toBe('example.com');
  });

  it('throws for gmail.com (public domain)', () => {
    expect(() => normalizeCompanyDomain('gmail.com')).toThrow(
      BadRequestException,
    );
  });

  it('throws for hotmail.com', () => {
    expect(() => normalizeCompanyDomain('hotmail.com')).toThrow(
      BadRequestException,
    );
  });

  it('throws for an invalid domain', () => {
    expect(() => normalizeCompanyDomain('not a domain')).toThrow(
      BadRequestException,
    );
  });

  it('throws for an empty string', () => {
    expect(() => normalizeCompanyDomain('')).toThrow(BadRequestException);
  });
});

describe('dateOnly', () => {
  it('returns a Date at UTC midnight for the given date string', () => {
    const d = dateOnly('2026-10-07');
    expect(d.toISOString()).toBe('2026-10-07T00:00:00.000Z');
  });
});

describe('timeOnly', () => {
  it('returns a Date on the epoch day encoding HH:MM', () => {
    const d = timeOnly('14:30');
    expect(d.getUTCHours()).toBe(14);
    expect(d.getUTCMinutes()).toBe(30);
  });
});
