import type { PrismaClient } from '../../src/generated/prisma/client.js';
import {
  DayOfWeek,
  PriceTierStrategy,
  Temperature,
} from '../../src/generated/prisma/enums.js';
import { testEmail, testId, testName } from './fixtures.js';

/**
 * TEST-owned catalogue/company graph for Order integration tests. Everything is
 * removed by cleanupTestData() except the PlatformSettings/Kitchen calendar
 * singletons, which ensurePlatformSettings() reports so the suite can remove
 * only what it created.
 */

const ALL_DAYS = Object.values(DayOfWeek);

/**
 * Applies the calendar the e2e suites assume (cut-off 16:00, one working day,
 * every day a Kitchen day) for the duration of a suite, whatever the shared test
 * database already holds (e.g. demo seed settings), and returns a function that
 * restores the previous settings row and working days exactly.
 */
export async function ensurePlatformSettings(
  prisma: PrismaClient,
): Promise<() => Promise<void>> {
  const existing = await prisma.platformSettings.findUnique({
    where: { id: 1 },
  });
  const existingDays = (await prisma.kitchenWorkingDay.findMany()).map(
    (row) => row.dayOfWeek,
  );
  const fixtureSettings = {
    businessTimezone: 'Asia/Kolkata',
    cutoffTime: new Date(Date.UTC(1970, 0, 1, 16, 0)),
    cutoffWorkingDayCount: 1,
    kitchenReadyBufferMinutes: 30,
    atRiskWindowMinutes: 30,
  };
  await prisma.platformSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...fixtureSettings },
    update: fixtureSettings,
  });
  await prisma.kitchenWorkingDay.deleteMany({});
  await prisma.kitchenWorkingDay.createMany({
    data: ALL_DAYS.map((dayOfWeek) => ({ dayOfWeek })),
  });
  return async () => {
    await prisma.kitchenWorkingDay.deleteMany({});
    if (existingDays.length)
      await prisma.kitchenWorkingDay.createMany({
        data: existingDays.map((dayOfWeek) => ({ dayOfWeek })),
      });
    if (existing) {
      const { id: _id, updatedAt: _updatedAt, ...previous } = existing;
      await prisma.platformSettings.update({ where: { id: 1 }, data: previous });
    } else await prisma.platformSettings.deleteMany({ where: { id: 1 } });
  };
}

export type OrderingFixture = ReturnType<typeof orderingIds>;

export function orderingIds(key: string) {
  const id = (part: string) => testId(`${key}:${part}`);
  return {
    staffId: id('staff'),
    roleId: id('role'),
    tierId: id('tier'),
    companyId: id('company'),
    homeAddressId: id('address-home'),
    annexAddressId: id('address-annex'),
    boxId: id('packaging-box'),
    trayId: id('packaging-tray'),
    employeeId: id('employee'),
    categoryId: id('category'),
    bowlId: id('dish-bowl'),
    hiddenDishId: id('dish-hidden'),
    proteinGroupId: id('group-protein'),
    riceGroupId: id('group-rice'),
    paneerId: id('option-paneer'),
    tofuId: id('option-tofu'),
    riceId: id('option-rice'),
    smallId: id('portion-small'),
    largeId: id('portion-large'),
  };
}

export async function createOrderingFixture(
  prisma: PrismaClient,
  key: string,
): Promise<OrderingFixture> {
  const ids = orderingIds(key);
  const name = (part: string) => testName(`${key}-${part}`);

  await prisma.role.create({
    data: {
      id: ids.roleId,
      name: name('ROLE'),
      description: 'Test fixture role',
    },
  });
  await prisma.staffUser.create({
    data: {
      id: ids.staffId,
      name: name('STAFF'),
      email: testEmail(key),
      passwordHash: 'not-a-real-hash',
      roleId: ids.roleId,
    },
  });
  await prisma.priceTier.create({
    data: {
      id: ids.tierId,
      name: name('TIER'),
      strategy: PriceTierStrategy.MANUAL,
    },
  });
  await prisma.packagingType.createMany({
    data: [
      { id: ids.boxId, name: name('BOX'), displayOrder: 900 },
      { id: ids.trayId, name: name('TRAY'), displayOrder: 901 },
    ],
  });
  await prisma.company.create({
    data: {
      id: ids.companyId,
      name: name('COMPANY'),
      billingContactName: 'Test Contact',
      billingContactEmail: testEmail(`${key}-billing`),
      priceTierId: ids.tierId,
      defaultDeliveryTime: new Date(Date.UTC(1970, 0, 1, 12, 30)), // 12:30 business-local
      deliveryLeadMinutes: 45,
      defaultPackagingTypeId: ids.boxId,
      workingDays: { create: ALL_DAYS.map((dayOfWeek) => ({ dayOfWeek })) },
      addresses: {
        create: [
          {
            id: ids.homeAddressId,
            label: name('HOME'),
            line1: '1 Test Street',
            city: 'Testville',
            country: 'IN',
          },
          {
            id: ids.annexAddressId,
            label: name('ANNEX'),
            line1: '2 Test Street',
            city: 'Testville',
            country: 'IN',
          },
        ],
      },
    },
  });
  await prisma.employee.create({
    data: {
      id: ids.employeeId,
      companyId: ids.companyId,
      name: name('EMPLOYEE'),
      defaultDeliveryAddressId: ids.homeAddressId,
    },
  });

  await prisma.option.createMany({
    data: [
      { id: ids.paneerId, name: name('PANEER'), costCents: 50 },
      { id: ids.tofuId, name: name('TOFU'), costCents: 40 },
      { id: ids.riceId, name: name('RICE'), costCents: 10 },
    ],
  });
  await prisma.portionSize.createMany({
    data: [
      { id: ids.smallId, name: name('SMALL'), displayOrder: 1 },
      { id: ids.largeId, name: name('LARGE'), displayOrder: 2 },
    ],
  });
  const dish = (id: string, label: string) => ({
    id,
    name: name(label),
    description: 'Test dish',
    imageUrl: 'https://example.test/dish.png',
    sku: name(label),
    temperature: Temperature.HOT,
    costCents: 100,
  });
  await prisma.dish.create({
    data: {
      ...dish(ids.bowlId, 'BOWL'),
      optionGroups: {
        create: [
          {
            id: ids.proteinGroupId,
            name: 'Protein',
            isRequired: true,
            displayOrder: 1,
            options: {
              create: [
                { optionId: ids.paneerId, displayOrder: 1 },
                { optionId: ids.tofuId, displayOrder: 2 },
              ],
            },
          },
          {
            id: ids.riceGroupId,
            name: 'Rice',
            usesPortions: true,
            displayOrder: 2,
            options: { create: [{ optionId: ids.riceId, displayOrder: 1 }] },
            portions: {
              create: [
                {
                  portionSizeId: ids.smallId,
                  extraChargeCents: 0,
                  displayOrder: 1,
                },
                {
                  portionSizeId: ids.largeId,
                  extraChargeCents: 40,
                  displayOrder: 2,
                },
              ],
            },
          },
        ],
      },
    },
  });
  await prisma.dish.create({ data: dish(ids.hiddenDishId, 'HIDDEN') });
  await prisma.menuCategory.create({
    data: {
      id: ids.categoryId,
      name: name('MAINS'),
      slug: `test-${key.toLowerCase()}-mains`,
      displayOrder: 900,
      items: {
        create: [
          { dishId: ids.bowlId, displayOrder: 1 },
          { dishId: ids.hiddenDishId, displayOrder: 2 },
        ],
      },
    },
  });
  await prisma.companyHiddenDish.create({
    data: { companyId: ids.companyId, dishId: ids.hiddenDishId },
  });

  await prisma.dishTierPrice.createMany({
    data: [
      { dishId: ids.bowlId, priceTierId: ids.tierId, priceCents: 300 },
      { dishId: ids.hiddenDishId, priceTierId: ids.tierId, priceCents: 200 },
    ],
  });
  await prisma.optionTierPrice.createMany({
    data: [
      { optionId: ids.paneerId, priceTierId: ids.tierId, priceCents: 80 },
      { optionId: ids.tofuId, priceTierId: ids.tierId, priceCents: 60 },
      { optionId: ids.riceId, priceTierId: ids.tierId, priceCents: 25 },
    ],
  });
  return ids;
}
