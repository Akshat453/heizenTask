import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureApp } from '../src/app.setup.js';
import { AppModule } from '../src/app.module.js';
import {
  PriceTierStrategy,
  Temperature,
} from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  cleanupTestData,
  testEmail,
  testId,
  testName,
} from './support/fixtures.js';
import {
  createOrderingFixture,
  ensurePlatformSettings,
  type OrderingFixture,
} from './support/ordering-fixture.js';

/**
 * Menu-side company hiding, pricing lookups and preview rules on real
 * PostgreSQL over authenticated HTTP (test database only).
 */
const PASSWORD = 'Fixture@1234';

type EditorRow = {
  id: string;
  isActive: boolean;
  overrideCents: number | null;
  derivedCents: number | null;
  effectiveCents: number | null;
  source: string;
};

describe(
  'Menu hiding, pricing lookups and preview rules (e2e)',
  { timeout: 600_000 },
  () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let fx: OrderingFixture;
    let other: OrderingFixture;
    let agent: ReturnType<typeof request.agent>;
    let restoreSettings: () => Promise<void>;
    const createdPermissionIds: string[] = [];
    const unpricedDishId = testId('MP:dish-unpriced');
    const derivedTierId = testId('MP:tier-derived');

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = moduleRef.createNestApplication();
      configureApp(app);
      await app.init();
      prisma = app.get(PrismaService);
      await cleanupTestData(prisma);
      restoreSettings = await ensurePlatformSettings(prisma);
      fx = await createOrderingFixture(prisma, 'MP');
      other = await createOrderingFixture(prisma, 'MP2');

      // An active dish on the menu with no price on the company's MANUAL tier.
      await prisma.dish.create({
        data: {
          id: unpricedDishId,
          name: testName('MP-UNPRICED'),
          description: 'Test dish',
          imageUrl: 'https://example.test/dish.png',
          sku: testName('MP-UNPRICED'),
          temperature: Temperature.HOT,
          costCents: 100,
        },
      });
      await prisma.menuCategoryItem.create({
        data: {
          categoryId: fx.categoryId,
          dishId: unpricedDishId,
          displayOrder: 3,
        },
      });
      // A tier deriving +10% from the fixture tier, with one override.
      await prisma.priceTier.create({
        data: {
          id: derivedTierId,
          name: testName('MP-DERIVED'),
          strategy: PriceTierStrategy.TIER_PERCENTAGE,
          sourceTierId: fx.tierId,
          sourceAdjustmentBps: 1_000,
        },
      });
      await prisma.dishTierPrice.create({
        data: {
          dishId: fx.bowlId,
          priceTierId: derivedTierId,
          priceCents: 999,
        },
      });

      const permissionIds: string[] = [];
      for (const key of [
        'catalogue.read',
        'catalogue.manage',
        'pricing.read',
        'employees.read',
      ]) {
        const existing = await prisma.permission.findUnique({ where: { key } });
        const permission =
          existing ??
          (await prisma.permission.create({
            data: { key, description: 'Test fixture' },
          }));
        if (!existing) createdPermissionIds.push(permission.id);
        permissionIds.push(permission.id);
      }
      await prisma.role.create({
        data: {
          id: testId('MP:admin-role'),
          name: testName('MP-ADMIN'),
          description: 'Test catalogue admin',
          permissions: {
            create: permissionIds.map((permissionId) => ({ permissionId })),
          },
        },
      });
      await prisma.staffUser.create({
        data: {
          id: testId('MP:admin'),
          name: testName('MP-ADMIN'),
          email: testEmail('mp-admin'),
          passwordHash: await bcrypt.hash(PASSWORD, 4),
          roleId: testId('MP:admin-role'),
        },
      });
      agent = request.agent(app.getHttpServer());
      await agent
        .post('/auth/login')
        .send({ email: testEmail('mp-admin'), password: PASSWORD })
        .expect(200);
    }, 600_000);

    afterAll(async () => {
      try {
        await cleanupTestData(prisma);
        if (createdPermissionIds.length)
          await prisma.permission.deleteMany({
            where: { id: { in: createdPermissionIds } },
          });
      } finally {
        await restoreSettings();
        await app.close();
      }
    }, 120_000);

    const editor = async (tierId: string) =>
      (await agent.get(`/price-tiers/${tierId}/editor`).expect(200)).body as {
        dishes: EditorRow[];
        options: EditorRow[];
      };

    it('preview rules count hidden items and dishes without a price on the tier', async () => {
      const res = await agent
        .get(`/employees/${fx.employeeId}/menu-preview`)
        .expect(200);
      // Menu categories are global, so other rows in the test database (the MP2
      // fixture, or demo seed data) also count. Expected = active dishes on
      // active items of active non-secret categories, not hidden for this
      // company, with no price on its MANUAL tier.
      const unpriced = await prisma.menuCategoryItem.findMany({
        where: {
          isActive: true,
          category: {
            isActive: true,
            isSecret: false,
            hiddenByCompanies: { none: { companyId: fx.companyId } },
          },
          dish: {
            isActive: true,
            hiddenByCompanies: { none: { companyId: fx.companyId } },
            tierPrices: { none: { priceTierId: fx.tierId } },
          },
        },
        select: { dishId: true },
        distinct: ['dishId'],
      });
      expect(unpriced.map((row) => row.dishId)).toContain(unpricedDishId);
      expect(res.body.rules).toEqual({
        tierId: fx.tierId,
        tierName: 'TEST-MP-TIER',
        usedDefaultTier: false,
        hiddenCategoryCount: 0,
        hiddenDishCount: 1,
        unpricedDishCount: unpriced.length,
      });
      const dishIds = res.body.categories.flatMap(
        (c: { dishes: { id: string }[] }) => c.dishes.map((d) => d.id),
      );
      expect(dishIds).toEqual([fx.bowlId]);
    });

    it('the editor reports the formula price even when an override exists', async () => {
      const derived = await editor(derivedTierId);
      const bowl = derived.dishes.find((d) => d.id === fx.bowlId)!;
      expect(bowl).toMatchObject({
        overrideCents: 999,
        derivedCents: 330,
        effectiveCents: 999,
        source: 'OVERRIDE',
      });
      const hidden = derived.dishes.find((d) => d.id === fx.hiddenDishId)!;
      expect(hidden).toMatchObject({
        overrideCents: null,
        derivedCents: 220,
        effectiveCents: 220,
        source: 'DERIVED',
      });
      const unpriced = derived.dishes.find((d) => d.id === unpricedDishId)!;
      expect(unpriced).toMatchObject({
        derivedCents: null,
        effectiveCents: null,
        source: 'MISSING',
      });
      const paneer = derived.options.find((o) => o.id === fx.paneerId)!;
      expect(paneer).toMatchObject({ derivedCents: 90, effectiveCents: 90 }); // 80 × 1.1 = 88 → 90

      const manual = await editor(fx.tierId);
      expect(manual.dishes.find((d) => d.id === fx.bowlId)).toMatchObject({
        overrideCents: 300,
        derivedCents: null,
        effectiveCents: 300,
      });
    });

    it('tier list missing counts match the editor rows', async () => {
      const tiers = (await agent.get('/price-tiers').expect(200)).body as {
        id: string;
        missingDishCount: number;
        missingOptionCount: number;
      }[];
      for (const tierId of [fx.tierId, derivedTierId]) {
        const rows = await editor(tierId);
        const missing = (list: EditorRow[]) =>
          list.filter((r) => r.isActive && r.effectiveCents === null).length;
        const tier = tiers.find((t) => t.id === tierId)!;
        expect(tier.missingDishCount).toBe(missing(rows.dishes));
        expect(tier.missingOptionCount).toBe(missing(rows.options));
      }
      expect(
        tiers.find((t) => t.id === fx.tierId)!.missingDishCount,
      ).toBeGreaterThanOrEqual(1);
    });

    it('dish and option prices across tiers', async () => {
      const dish = (await agent.get(`/dishes/${fx.bowlId}/prices`).expect(200))
        .body as {
        tierId: string;
        effectiveCents: number | null;
        source: string;
        tierName: string;
        isDefault: boolean;
      }[];
      expect(dish.find((p) => p.tierId === fx.tierId)).toMatchObject({
        effectiveCents: 300,
        source: 'OVERRIDE',
        tierName: 'TEST-MP-TIER',
      });
      expect(dish.find((p) => p.tierId === derivedTierId)).toMatchObject({
        effectiveCents: 999,
        source: 'OVERRIDE',
      });
      const option = (
        await agent.get(`/options/${fx.paneerId}/prices`).expect(200)
      ).body as { tierId: string; effectiveCents: number; source: string }[];
      expect(option.find((p) => p.tierId === derivedTierId)).toMatchObject({
        effectiveCents: 90,
        source: 'DERIVED',
      });
      await agent
        .get(`/dishes/${testId('MP:no-such-dish')}/prices`)
        .expect(404);
    });

    it('replaces, narrows and clears the companies hiding a category', async () => {
      const put = (companyIds: string[]) =>
        agent
          .put(`/menu/categories/${fx.categoryId}/hidden-companies`)
          .send({ companyIds });
      await put([fx.companyId, other.companyId]).expect(200);
      let detail = (
        await agent.get(`/menu/categories/${fx.categoryId}`).expect(200)
      ).body;
      expect(detail.hiddenByCompanyIds).toEqual(
        [fx.companyId, other.companyId].sort(),
      );
      const list = (
        await agent.get('/menu/categories?search=TEST-MP-MAINS').expect(200)
      ).body.data;
      expect(list[0]).toMatchObject({
        id: fx.categoryId,
        hiddenCompanyCount: 2,
      });

      await put([other.companyId]).expect(200);
      detail = (
        await agent.get(`/menu/categories/${fx.categoryId}`).expect(200)
      ).body;
      expect(detail.hiddenByCompanyIds).toEqual([other.companyId]);
      // The company-side view agrees (same join table).
      const company = (
        await prisma.companyHiddenCategory.findMany({
          where: { categoryId: fx.categoryId },
        })
      ).map((r) => r.companyId);
      expect(company).toEqual([other.companyId]);

      await put([]).expect(200);
      detail = (
        await agent.get(`/menu/categories/${fx.categoryId}`).expect(200)
      ).body;
      expect(detail.hiddenByCompanyIds).toEqual([]);
    });

    it('replaces the companies hiding a dish and reports it on the category items', async () => {
      await agent
        .put(`/menu/dishes/${fx.bowlId}/hidden-companies`)
        .send({ companyIds: [other.companyId] })
        .expect(200);
      const detail = (
        await agent.get(`/menu/categories/${fx.categoryId}`).expect(200)
      ).body;
      const item = (dishId: string) =>
        detail.items.find((i: { dishId: string }) => i.dishId === dishId);
      expect(item(fx.bowlId).hiddenByCompanyIds).toEqual([other.companyId]);
      expect(item(fx.hiddenDishId).hiddenByCompanyIds).toEqual([fx.companyId]);
      await agent
        .put(`/menu/dishes/${fx.bowlId}/hidden-companies`)
        .send({ companyIds: [] })
        .expect(200);
    });

    it('rejects unknown company IDs with 400 and changes nothing', async () => {
      const unknown = testId('MP:no-such-company');
      const res = await agent
        .put(`/menu/categories/${fx.categoryId}/hidden-companies`)
        .send({ companyIds: [fx.companyId, unknown] })
        .expect(400);
      expect(res.body.message).toBe(`Unknown company IDs: ${unknown}.`);
      expect(
        await prisma.companyHiddenCategory.count({
          where: { categoryId: fx.categoryId },
        }),
      ).toBe(0);
    });
  },
);
