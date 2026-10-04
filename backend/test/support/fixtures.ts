import { createHash } from 'node:crypto';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { OrderStatus, Temperature } from '../../src/generated/prisma/enums.js';

/**
 * Test fixture conventions.
 *
 * Every row a database test creates carries an obvious ownership marker so that
 * cleanup can target test-owned rows only (never broad table wipes):
 *   - names / order numbers / SKUs / invoice numbers start with `TEST-`
 *   - staff emails are `test-<key>@fixtures.test`
 * IDs are deterministic (UUIDv5-shaped hash of `fernleaf-test:<key>`), so reruns
 * address the same rows and leftovers from crashed runs are found by marker.
 */
export const TEST_PREFIX = 'TEST-';
export const TEST_EMAIL_DOMAIN = '@fixtures.test';

export function testId(key: string): string {
  const bytes = Buffer.from(
    createHash('sha256')
      .update(`fernleaf-test:${key}`)
      .digest()
      .subarray(0, 16),
  );
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function testName(key: string): string {
  return `${TEST_PREFIX}${key}`;
}

export function testEmail(key: string): string {
  return `test-${key.toLowerCase()}${TEST_EMAIL_DOMAIN}`;
}

const startsWithTest = { startsWith: TEST_PREFIX };

// Cleanup issues ~25 sequential statements; a remote test database (e.g. Neon)
// can exceed Prisma's default 5s interactive-transaction timeout.
const CLEANUP_TRANSACTION_OPTIONS = { maxWait: 20_000, timeout: 60_000 };

/**
 * Deletes every test-owned row in FK-safe order inside one transaction.
 * Order follows the Restrict relations in schema.prisma: children before
 * parents, Order graph before Company/Dish/PackagingType/StaffUser/Role,
 * derived PriceTiers detached from their source before deletion.
 * Cascading children (addresses, domains, calendars, preferences, option
 * groups, role permissions) are removed by their parent's ON DELETE CASCADE.
 */
export async function cleanupTestData(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const companies = await tx.company.findMany({
      where: { name: startsWithTest },
      select: { id: true },
    });
    const companyIds = companies.map(({ id }) => id);
    const staff = await tx.staffUser.findMany({
      where: { email: { startsWith: 'test-', endsWith: TEST_EMAIL_DOMAIN } },
      select: { id: true },
    });
    const staffIds = staff.map(({ id }) => id);
    const orderWhere = {
      OR: [
        { orderNumber: startsWithTest },
        { companyId: { in: companyIds } },
        { createdByStaffUserId: { in: staffIds } },
      ],
    };
    const orderIds = (
      await tx.order.findMany({ where: orderWhere, select: { id: true } })
    ).map(({ id }) => id);
    const invoiceWhere = {
      OR: [
        { invoiceNumber: startsWithTest },
        { companyId: { in: companyIds } },
        { createdByStaffUserId: { in: staffIds } },
      ],
    };

    // Billing
    await tx.invoiceOrder.deleteMany({
      where: { OR: [{ orderId: { in: orderIds } }, { invoice: invoiceWhere }] },
    });
    await tx.invoice.deleteMany({ where: invoiceWhere });

    // Order graph: events and prep units before combinations, lines, orders.
    await tx.orderEvent.deleteMany({
      where: {
        OR: [
          { orderId: { in: orderIds } },
          { actorStaffUserId: { in: staffIds } },
        ],
      },
    });
    await tx.prepUnit.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.orderCombinationOption.deleteMany({
      where: { combination: { orderLine: { orderId: { in: orderIds } } } },
    });
    await tx.orderCombination.deleteMany({
      where: { orderLine: { orderId: { in: orderIds } } },
    });
    await tx.orderLine.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.order.deleteMany({ where: { id: { in: orderIds } } });

    // Drops reference Company and the driver StaffUser (Restrict).
    await tx.deliveryDrop.deleteMany({
      where: {
        OR: [
          { companyId: { in: companyIds } },
          { driverStaffUserId: { in: staffIds } },
        ],
      },
    });

    // Company <-> Employee owner cycle: break it before deleting either side.
    await tx.company.updateMany({
      where: { id: { in: companyIds } },
      data: { ownerEmployeeId: null },
    });
    await tx.employee.deleteMany({ where: { companyId: { in: companyIds } } });
    await tx.company.deleteMany({ where: { id: { in: companyIds } } });

    // Catalogue
    const dishWhere = { sku: startsWithTest };
    await tx.menuCategoryItem.deleteMany({
      where: {
        OR: [
          { dish: dishWhere },
          { category: { slug: { startsWith: 'test-' } } },
        ],
      },
    });
    await tx.menuCategory.deleteMany({
      where: { slug: { startsWith: 'test-' } },
    });
    await tx.dishTierPrice.deleteMany({
      where: {
        OR: [{ dish: dishWhere }, { priceTier: { name: startsWithTest } }],
      },
    });
    await tx.optionTierPrice.deleteMany({
      where: {
        OR: [
          { option: { name: startsWithTest } },
          { priceTier: { name: startsWithTest } },
        ],
      },
    });
    await tx.dish.deleteMany({ where: dishWhere }); // cascades OptionGroup → OptionGroupOption/OptionGroupPortion
    await tx.portionSize.deleteMany({ where: { name: startsWithTest } });
    await tx.optionGroupOption.deleteMany({
      where: { option: { name: startsWithTest } },
    });
    await tx.option.deleteMany({ where: { name: startsWithTest } });
    await tx.kitchenStation.deleteMany({ where: { name: startsWithTest } });
    await tx.allergen.deleteMany({ where: { name: startsWithTest } }); // cascades Dish/Option/Employee links
    await tx.dietaryTag.deleteMany({ where: { name: startsWithTest } });
    await tx.packagingType.deleteMany({ where: { name: startsWithTest } });

    // Pricing: detach derived TEST tiers from their sources, then delete.
    await tx.priceTier.updateMany({
      where: { name: startsWithTest },
      data: { sourceTierId: null },
    });
    await tx.priceTier.deleteMany({ where: { name: startsWithTest } });

    // Staff and roles last (referenced by orders, events, prep units, drops, invoices).
    await tx.staffUser.deleteMany({ where: { id: { in: staffIds } } });
    await tx.role.deleteMany({ where: { name: startsWithTest } });
  }, CLEANUP_TRANSACTION_OPTIONS);
}

export type OperationalOrderFixture = {
  staffUserId: string;
  companyId: string;
  orderId: string;
  prepUnitIds: string[];
};

/**
 * Minimal CONFIRMED order with `prepUnitCount` single-quantity PrepUnits,
 * owned entirely by TEST-* rows (no dependency on seeded data).
 */
export async function createConfirmedOrderFixture(
  prisma: PrismaClient,
  key: string,
  options: { prepUnitCount?: number; deliveryAt?: Date } = {},
): Promise<OperationalOrderFixture> {
  const prepUnitCount = options.prepUnitCount ?? 2;
  const deliveryAt = options.deliveryAt ?? new Date();
  const deliveryDate = new Date(
    `${deliveryAt.toISOString().slice(0, 10)}T00:00:00.000Z`,
  );
  const id = (part: string) => testId(`${key}:${part}`);

  await prisma.role.create({
    data: {
      id: id('role'),
      name: testName(`${key}-ROLE`),
      description: 'Test fixture role',
    },
  });
  await prisma.staffUser.create({
    data: {
      id: id('staff'),
      name: testName(`${key}-STAFF`),
      email: testEmail(key),
      passwordHash: 'not-a-real-hash',
      roleId: id('role'),
    },
  });
  await prisma.packagingType.create({
    data: {
      id: id('packaging'),
      name: testName(`${key}-PACKAGING`),
      displayOrder: 999,
    },
  });
  await prisma.company.create({
    data: {
      id: id('company'),
      name: testName(`${key}-COMPANY`),
      billingContactName: 'Test Contact',
      billingContactEmail: testEmail(`${key}-billing`),
      defaultDeliveryTime: new Date(Date.UTC(1970, 0, 1, 12, 30)),
      defaultPackagingTypeId: id('packaging'),
      addresses: {
        create: {
          id: id('address'),
          label: testName(`${key}-ADDRESS`),
          line1: '1 Test Street',
          city: 'Testville',
          country: 'IN',
        },
      },
    },
  });
  await prisma.employee.create({
    data: {
      id: id('employee'),
      companyId: id('company'),
      name: testName(`${key}-EMPLOYEE`),
      defaultDeliveryAddressId: id('address'),
    },
  });
  await prisma.dish.create({
    data: {
      id: id('dish'),
      name: testName(`${key}-DISH`),
      description: 'Test dish',
      imageUrl: 'https://example.test/dish.png',
      sku: testName(`${key}-DISH`),
      temperature: Temperature.HOT,
      costCents: 100,
    },
  });

  await prisma.order.create({
    data: {
      id: id('order'),
      orderNumber: testName(`${key}-ORDER`),
      status: OrderStatus.CONFIRMED,
      deliveryDate,
      deliveryAt,
      companyId: id('company'),
      employeeId: id('employee'),
      createdByStaffUserId: id('staff'),
      deliveryAddressId: id('address'),
      deliveryAddressLabelSnapshot: testName(`${key}-ADDRESS`),
      deliveryAddressLine1Snapshot: '1 Test Street',
      deliveryAddressCitySnapshot: 'Testville',
      deliveryAddressCountrySnapshot: 'IN',
      packagingTypeId: id('packaging'),
      packagingNameSnapshot: testName(`${key}-PACKAGING`),
      deliveryLeadMinutesSnapshot: 0,
      subtotalCents: 100 * prepUnitCount,
      totalCents: 100 * prepUnitCount,
      billableTotalCents: 100 * prepUnitCount,
      confirmedAt: new Date(),
      lines: {
        create: {
          id: id('line'),
          dishId: id('dish'),
          dishNameSnapshot: testName(`${key}-DISH`),
          dishSkuSnapshot: testName(`${key}-DISH`),
          quantity: prepUnitCount,
          dishUnitPriceCents: 100,
          lineTotalCents: 100 * prepUnitCount,
        },
      },
    },
  });

  const prepUnitIds: string[] = [];
  for (let index = 0; index < prepUnitCount; index++) {
    await prisma.orderCombination.create({
      data: {
        id: id(`combination-${index}`),
        orderLineId: id('line'),
        quantity: 1,
        unitPriceCents: 100,
        totalCents: 100,
      },
    });
    const prepUnit = await prisma.prepUnit.create({
      data: {
        id: id(`prep-unit-${index}`),
        orderId: id('order'),
        combinationId: id(`combination-${index}`),
        quantity: 1,
        stationNameSnapshot: 'Unassigned',
      },
    });
    prepUnitIds.push(prepUnit.id);
  }

  return {
    staffUserId: id('staff'),
    companyId: id('company'),
    orderId: id('order'),
    prepUnitIds,
  };
}
