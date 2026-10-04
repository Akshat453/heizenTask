import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { applyTestDatabaseEnvironment } from './test-database.js';

/**
 * Applies committed migrations to the guarded test database only.
 * Uses `prisma migrate deploy` (never reset, db push, or migrate dev).
 */
export function migrateTestDatabase(): void {
  applyTestDatabaseEnvironment();
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: resolve(import.meta.dirname, '../..'),
    env: process.env,
    stdio: 'inherit',
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  migrateTestDatabase();
}
