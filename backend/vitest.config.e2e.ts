import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Guards TEST_DATABASE_URL and runs `prisma migrate deploy` against it before any worker starts.
    globalSetup: ['./test/global-setup.ts'],
    // setup-test-database.ts redirects DATABASE_URL/DIRECT_URL to TEST_DATABASE_URL before AppModule loads.
    setupFiles: ['./test/setup-env.ts', './test/setup-test-database.ts'],
    // Database suites share one test database and its TEST-* fixtures.
    fileParallelism: false,
    // A remote test database (e.g. Neon, ~250ms RTT) makes DB suites far slower than local Postgres.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
