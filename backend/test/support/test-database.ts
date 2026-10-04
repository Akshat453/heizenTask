import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

/**
 * Database-test safety guard.
 *
 * Integration/e2e suites may only run against a dedicated TEST_DATABASE_URL
 * that targets a different database from DATABASE_URL and DIRECT_URL (whether
 * those come from the shell or from backend/.env). Once validated, the test URL
 * becomes the effective DATABASE_URL/DIRECT_URL so AppModule, PrismaService and
 * the Prisma CLI can only reach the test database.
 */

const APPLIED_MARKER = 'FERNLEAF_TEST_DATABASE_APPLIED';

export type DatabaseUrlSources = {
  testDatabaseUrl: string | undefined;
  protectedUrls: Array<{ name: string; value: string | undefined }>;
};

export class UnsafeTestDatabaseError extends Error {
  constructor(message: string) {
    super(`Refusing to run database tests: ${message}`);
    this.name = 'UnsafeTestDatabaseError';
  }
}

/**
 * Normalizes a Postgres URL to the database it actually targets so that
 * cosmetic differences (query params, Neon "-pooler" hosts, default port,
 * trailing slashes) cannot disguise the protected database as a test one.
 */
export function databaseTarget(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase().replace(/-pooler(?=\.|$)/, '');
    const port = parsed.port || '5432';
    const database = decodeURIComponent(
      parsed.pathname.replace(/^\/+|\/+$/g, ''),
    );
    return `${host}:${port}/${database}`;
  } catch {
    return url.trim();
  }
}

export function assertSafeTestDatabaseUrl({
  testDatabaseUrl,
  protectedUrls,
}: DatabaseUrlSources): string {
  const testUrl = testDatabaseUrl?.trim();
  if (!testUrl) {
    throw new UnsafeTestDatabaseError(
      'TEST_DATABASE_URL is not set. Point it at a dedicated disposable PostgreSQL database.',
    );
  }
  if (!/^postgres(ql)?:\/\//i.test(testUrl)) {
    throw new UnsafeTestDatabaseError(
      'TEST_DATABASE_URL must be a postgres:// or postgresql:// URL.',
    );
  }
  const testTarget = databaseTarget(testUrl);
  for (const { name, value } of protectedUrls) {
    if (!value?.trim()) continue;
    if (value.trim() === testUrl || databaseTarget(value) === testTarget) {
      throw new UnsafeTestDatabaseError(
        `TEST_DATABASE_URL targets the same database as ${name}.`,
      );
    }
  }
  return testUrl;
}

function readDotEnv(): Record<string, string> {
  const path = resolve(import.meta.dirname, '../../.env');
  return existsSync(path) ? parse(readFileSync(path)) : {};
}

/**
 * Validates TEST_DATABASE_URL and redirects DATABASE_URL/DIRECT_URL to it.
 * Must run before AppModule, PrismaService or any Prisma client is imported.
 * Idempotent within a process once applied.
 */
export function applyTestDatabaseEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const dotEnv = readDotEnv();
  const requested = env.TEST_DATABASE_URL ?? dotEnv.TEST_DATABASE_URL;

  if (
    requested &&
    env[APPLIED_MARKER] === requested &&
    env.DATABASE_URL === requested &&
    env.DIRECT_URL === requested
  ) {
    return requested;
  }

  const testUrl = assertSafeTestDatabaseUrl({
    testDatabaseUrl: requested,
    protectedUrls: [
      { name: 'DATABASE_URL', value: env.DATABASE_URL },
      { name: 'DIRECT_URL', value: env.DIRECT_URL },
      { name: 'DATABASE_URL (.env)', value: dotEnv.DATABASE_URL },
      { name: 'DIRECT_URL (.env)', value: dotEnv.DIRECT_URL },
    ],
  });

  env.TEST_DATABASE_URL = testUrl;
  env.DATABASE_URL = testUrl;
  env.DIRECT_URL = testUrl;
  env[APPLIED_MARKER] = testUrl;
  return testUrl;
}
