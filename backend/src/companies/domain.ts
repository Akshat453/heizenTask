import { BadRequestException } from '@nestjs/common';

const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
  'yahoo.com', 'icloud.com', 'aol.com', 'proton.me', 'protonmail.com',
]);

export function normalizeCompanyDomain(input: string): string {
  let value = input.trim().toLowerCase();
  if (!value) throw new BadRequestException('Company domain cannot be empty.');
  if (value.includes('@')) value = value.slice(value.lastIndexOf('@') + 1);
  try {
    const parsed = new URL(value.includes('://') ? value : `https://${value}`);
    value = parsed.hostname.replace(/\.$/, '');
  } catch {
    throw new BadRequestException('Company domain is invalid.');
  }
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value)) {
    throw new BadRequestException('Company domain is invalid.');
  }
  if (PUBLIC_DOMAINS.has(value)) throw new BadRequestException('Public email domains cannot be used for a company.');
  return value;
}

export function timeOnly(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

export function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
