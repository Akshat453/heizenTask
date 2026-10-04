import { Test, TestingModule } from '@nestjs/testing';
import pg from 'pg';
import { AppModule } from '../src/app.module.js';
import { PriceTierStrategy } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  PRICE_TIER_CONFIG_LOCK_KEY,
  PricingService,
} from '../src/pricing/pricing.service.js';
import { cleanupTestData, testId, testName } from './support/fixtures.js';

const CONCURRENT_TIERS = 6;

/** Independent PostgreSQL connection, outside Prisma's pool. */
async function rawClient(): Promise<pg.Client> {
  const client = new pg.Client({
    connectionString: process.env.TEST_DATABASE_URL,
  });
  await client.connect();
  return client;
}

async function expectPgError(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('PriceTier and PlatformSettings database invariants (PostgreSQL)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let pricing: PricingService;
  let originalDefaultId: string | null = null;

  const activeDefaults = () =>
    prisma.priceTier.findMany({
      where: { isActive: true, isDefault: true },
      select: { id: true, name: true },
    });

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    pricing = moduleRef.get(PricingService);
    await cleanupTestData(prisma);

    // Every pricing mutation requires exactly one active default to exist.
    const defaults = await activeDefaults();
    originalDefaultId = defaults[0]?.id ?? null;
    if (!originalDefaultId) {
      await prisma.priceTier.create({
        data: {
          id: testId('tier:base-default'),
          name: testName('TIER-BASE-DEFAULT'),
          strategy: PriceTierStrategy.MANUAL,
          isDefault: true,
        },
      });
    }
  });

  afterAll(async () => {
    // Hand the default back to the pre-existing tier (if any) before deleting TEST tiers.
    if (originalDefaultId) {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${PRICE_TIER_CONFIG_LOCK_KEY}::bigint)`;
        await tx.priceTier.updateMany({
          where: { name: { startsWith: 'TEST-' } },
          data: { isDefault: false },
        });
        await tx.priceTier.update({
          where: { id: originalDefaultId! },
          data: { isDefault: true, isActive: true },
        });
      });
    }
    await cleanupTestData(prisma);
    await moduleRef.close();
  });

  it('rejects a second active default PriceTier directly in the database', async () => {
    expect(await activeDefaults()).toHaveLength(1);
    const client = await rawClient();
    try {
      await expectPgError(
        client.query(
          `INSERT INTO "PriceTier" (id, name, "isDefault", strategy, "isActive", "updatedAt") VALUES ($1, $2, true, 'MANUAL', true, now())`,
          [
            testId('tier:direct-second-default'),
            testName('TIER-DIRECT-SECOND-DEFAULT'),
          ],
        ),
        '23505',
      );
      // Partial index: inactive "default" rows are outside the predicate.
      await client.query(
        `INSERT INTO "PriceTier" (id, name, "isDefault", strategy, "isActive", "updatedAt") VALUES ($1, $2, true, 'MANUAL', false, now())`,
        [
          testId('tier:direct-inactive-default'),
          testName('TIER-DIRECT-INACTIVE-DEFAULT'),
        ],
      );
      // Activating that row would create a second active default.
      await expectPgError(
        client.query(`UPDATE "PriceTier" SET "isActive" = true WHERE id = $1`, [
          testId('tier:direct-inactive-default'),
        ]),
        '23505',
      );
    } finally {
      await client.end();
    }
    expect(await activeDefaults()).toHaveLength(1);
  });

  it('rejects PlatformSettings rows whose id is not 1 directly in the database', async () => {
    const client = await rawClient();
    try {
      await client.query('BEGIN');
      await expectPgError(
        client.query(
          `INSERT INTO "PlatformSettings" (id, "cutoffTime", "cutoffWorkingDayCount", "atRiskWindowMinutes", "updatedAt") VALUES (2, '16:00', 2, 30, now())`,
        ),
        '23514',
      );
      await client.query('ROLLBACK');

      await client.query('BEGIN');
      await client.query(
        `INSERT INTO "PlatformSettings" (id, "cutoffTime", "cutoffWorkingDayCount", "atRiskWindowMinutes", "updatedAt") VALUES (1, '16:00', 2, 30, now()) ON CONFLICT (id) DO NOTHING`,
      );
      await expectPgError(
        client.query(`UPDATE "PlatformSettings" SET id = 3 WHERE id = 1`),
        '23514',
      );
    } finally {
      // Never keep anything written here.
      await client.query('ROLLBACK').catch(() => undefined);
      await client.end();
    }
  });

  it('serializes PriceTier configuration mutations on the dedicated advisory lock', async () => {
    const tier = await prisma.priceTier.create({
      data: {
        id: testId('tier:lock-probe'),
        name: testName('TIER-LOCK-PROBE'),
        strategy: PriceTierStrategy.MANUAL,
      },
    });
    const holder = await rawClient();
    try {
      await holder.query('BEGIN');
      await holder.query('SELECT pg_advisory_xact_lock($1::bigint)', [
        PRICE_TIER_CONFIG_LOCK_KEY.toString(),
      ]);

      let settled = false;
      const pending = pricing
        .updateTier(tier.id, { isDefault: true })
        .finally(() => {
          settled = true;
        });
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(settled).toBe(false);

      await holder.query('COMMIT');
      await pending;
    } finally {
      await holder.query('ROLLBACK').catch(() => undefined);
      await holder.end();
    }
    expect((await activeDefaults()).map(({ id }) => id)).toEqual([tier.id]);
  });

  it('leaves exactly one active default after concurrent default mutations', async () => {
    const tiers = await Promise.all(
      Array.from({ length: CONCURRENT_TIERS }, (_, index) =>
        prisma.priceTier.create({
          data: {
            id: testId(`tier:race-${index}`),
            name: testName(`TIER-RACE-${index}`),
            strategy: PriceTierStrategy.MANUAL,
          },
        }),
      ),
    );

    const updates = await Promise.allSettled(
      tiers.map((tier) => pricing.updateTier(tier.id, { isDefault: true })),
    );
    const creates = await Promise.allSettled(
      Array.from({ length: CONCURRENT_TIERS }, (_, index) =>
        pricing.createTier({
          name: testName(`TIER-RACE-CREATE-${index}`),
          strategy: PriceTierStrategy.MANUAL,
          isDefault: true,
        }),
      ),
    );

    // Serialized by the advisory lock, every request completes successfully in turn.
    expect(updates.filter(({ status }) => status === 'rejected')).toEqual([]);
    expect(creates.filter(({ status }) => status === 'rejected')).toEqual([]);

    const defaults = await activeDefaults();
    expect(defaults).toHaveLength(1);
    expect(defaults[0]!.name.startsWith('TEST-TIER-RACE')).toBe(true);
  }, 30000);

  it('still applies ordinary valid PriceTier updates', async () => {
    const source = await pricing.createTier({
      name: testName('TIER-ORDINARY-SOURCE'),
      strategy: PriceTierStrategy.COST_MULTIPLIER,
      costMultiplierBps: 24_000,
    });
    const derived = await pricing.createTier({
      name: testName('TIER-ORDINARY-DERIVED'),
      strategy: PriceTierStrategy.TIER_PERCENTAGE,
      sourceTierId: source.id,
      sourceAdjustmentBps: 1_500,
    });

    const renamed = await pricing.updateTier(source.id, {
      name: testName('TIER-ORDINARY-SOURCE-RENAMED'),
      costMultiplierBps: 25_000,
    });
    expect(renamed).toMatchObject({
      name: 'TEST-TIER-ORDINARY-SOURCE-RENAMED',
      costMultiplierBps: 25_000,
      isActive: true,
      isDefault: false,
    });

    const adjusted = await pricing.updateTier(derived.id, {
      sourceAdjustmentBps: 2_000,
    });
    expect(adjusted.sourceAdjustmentBps).toBe(2_000);

    // An active derived tier keeps its source from being deactivated.
    await expect(
      pricing.updateTier(source.id, { isActive: false }),
    ).rejects.toThrow(/inactive source/);
    // Removing the only active default is rejected.
    const [currentDefault] = await activeDefaults();
    await expect(
      pricing.updateTier(currentDefault!.id, { isDefault: false }),
    ).rejects.toThrow(/exactly one active default/);

    // Deactivate the derived tier first, then its source may be deactivated.
    await pricing.updateTier(derived.id, { isActive: false });
    await expect(
      pricing.updateTier(source.id, { isActive: false }),
    ).resolves.toMatchObject({ isActive: false });

    expect(await activeDefaults()).toHaveLength(1);
  });
});
