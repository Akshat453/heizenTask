import {
  assertSafeTestDatabaseUrl,
  databaseTarget,
  UnsafeTestDatabaseError,
} from './test-database.js';

const DEV_POOLED =
  'postgresql://owner:secret@ep-dev-123-pooler.ap-south-1.aws.neon.tech/fernleaf?sslmode=require';
const DEV_DIRECT =
  'postgresql://owner:secret@ep-dev-123.ap-south-1.aws.neon.tech/fernleaf?sslmode=require';
const TEST = 'postgresql://tester@127.0.0.1:55432/fernleaf_test';

const guard = (testDatabaseUrl: string | undefined) =>
  assertSafeTestDatabaseUrl({
    testDatabaseUrl,
    protectedUrls: [
      { name: 'DATABASE_URL', value: DEV_POOLED },
      { name: 'DIRECT_URL', value: DEV_DIRECT },
    ],
  });

describe('test database safety guard', () => {
  it('rejects a missing TEST_DATABASE_URL', () => {
    expect(() => guard(undefined)).toThrow(UnsafeTestDatabaseError);
    expect(() => guard('  ')).toThrow(/TEST_DATABASE_URL is not set/);
  });

  it('rejects TEST_DATABASE_URL equal to DATABASE_URL', () => {
    expect(() => guard(DEV_POOLED)).toThrow(/same database as DATABASE_URL/);
  });

  it('rejects TEST_DATABASE_URL equal to DIRECT_URL', () => {
    const otherApp = 'postgresql://app:secret@db.internal:5432/app';
    expect(() =>
      assertSafeTestDatabaseUrl({
        testDatabaseUrl: DEV_DIRECT,
        protectedUrls: [
          { name: 'DATABASE_URL', value: otherApp },
          { name: 'DIRECT_URL', value: DEV_DIRECT },
        ],
      }),
    ).toThrow(/same database as DIRECT_URL/);
  });

  it('rejects disguised URLs that target a protected database', () => {
    expect(() => guard(`${DEV_DIRECT}&application_name=tests`)).toThrow(
      UnsafeTestDatabaseError,
    );
    expect(() =>
      guard(DEV_DIRECT.replace('/fernleaf?', ':5432/fernleaf/?')),
    ).toThrow(UnsafeTestDatabaseError);
  });

  it('rejects non-postgres URLs', () => {
    expect(() => guard('mysql://localhost/test')).toThrow(/postgres/);
  });

  it('accepts a dedicated test database', () => {
    expect(guard(TEST)).toBe(TEST);
  });

  it('normalizes Neon pooler hosts to the direct target', () => {
    expect(databaseTarget(DEV_POOLED)).toBe(databaseTarget(DEV_DIRECT));
  });
});
