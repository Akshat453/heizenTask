import assert from 'node:assert/strict';

import bcrypt from 'bcryptjs';

import {
  DayOfWeek,
  DeliveryDropStatus,
  InvoiceStatus,
  OrderStatus,
  PriceTierStrategy,
} from '../src/generated/prisma/enums.js';
import {
  BUSINESS_TIME_ZONE,
  addDays,
  asDateOnly,
  businessInstant,
  businessToday,
  compareDates,
  createSeedClient,
  dateKey,
  dayOfWeek,
  seedId,
  type PlainDate,
} from './seed-support.js';

const prisma = createSeedClient();
const PASSWORD = 'Test@1234';

function plainDate(value: Date): PlainDate {
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
}

async function verifyAccounts() {
  const expected = [
    ['admin@test.com', 'ADMIN'],
    ['kitchen@test.com', 'KITCHEN'],
    ['dispatch@test.com', 'DISPATCH'],
    ['driver@test.com', 'DRIVER'],
  ] as const;
  const users = await prisma.staffUser.findMany({
    where: { email: { in: expected.map(([email]) => email) } },
    include: { role: true },
  });
  assert.equal(users.length, 4, 'All four required staff accounts must exist.');
  for (const [email, role] of expected) {
    const user = users.find((candidate) => candidate.email === email);
    assert(user, `${email} is missing.`);
    assert.equal(user.role.name, role, `${email} has the wrong role.`);
    assert.equal(user.isActive, true, `${email} must be active.`);
    assert.notEqual(
      user.passwordHash,
      PASSWORD,
      `${email} stored a plaintext password.`,
    );
    assert.equal(
      await bcrypt.compare(PASSWORD, user.passwordHash),
      true,
      `${email} password hash does not verify.`,
    );
  }
  const driver = users.find((user) => user.email === 'driver@test.com')!;
  const driverKeys = await prisma.rolePermission.findMany({
    where: { roleId: driver.roleId },
    include: { permission: true },
  });
  assert.deepEqual(driverKeys.map((row) => row.permission.key).sort(), [
    'driver.own_drops.deliver',
    'driver.own_drops.read',
  ]);
}

async function verifyReferenceData() {
  const [
    roles,
    permissions,
    stations,
    packaging,
    portions,
    allergens,
    tags,
    options,
    dishes,
    categories,
    tiers,
  ] = await Promise.all([
    prisma.role.count({
      where: { name: { in: ['ADMIN', 'KITCHEN', 'DISPATCH', 'DRIVER'] } },
    }),
    prisma.permission.count({
      where: {
        key: {
          in: [
            'staff.manage',
            'orders.read',
            'kitchen.update',
            'dispatch.update',
            'billing.manage',
          ],
        },
      },
    }),
    prisma.kitchenStation.count({
      where: {
        id: {
          in: ['hot', 'cold', 'assembly', 'bakery'].map((key) =>
            seedId(`station:${key}`),
          ),
        },
      },
    }),
    prisma.packagingType.count({
      where: {
        id: {
          in: ['standard', 'eco', 'premium'].map((key) =>
            seedId(`packaging:${key}`),
          ),
        },
      },
    }),
    prisma.portionSize.count({
      where: {
        id: { in: ['regular', 'large'].map((key) => seedId(`portion:${key}`)) },
      },
    }),
    prisma.allergen.count({
      where: { name: { in: ['Dairy', 'Gluten', 'Nuts', 'Soy', 'Sesame'] } },
    }),
    prisma.dietaryTag.count({
      where: {
        name: {
          in: ['Vegetarian', 'Vegan', 'Jain', 'Gluten-Free', 'High Protein'],
        },
      },
    }),
    prisma.option.count({
      where: {
        id: {
          in: [
            'paneer',
            'tofu',
            'chickpeas',
            'brown-rice',
            'jeera-rice',
            'raita',
            'mint-chutney',
            'greek-yogurt',
            'coconut-yogurt',
          ].map((key) => seedId(`option:${key}`)),
        },
      },
    }),
    prisma.dish.count({
      where: {
        sku: { startsWith: '' },
        id: {
          in: [
            'paneer-bowl',
            'tofu-bowl',
            'jain-bowl',
            'custom-bowl',
            'poha',
            'breakfast-wrap',
            'brownie',
            'fruit-yogurt',
            'millet-bowl',
          ].map((key) => seedId(`dish:${key}`)),
        },
      },
    }),
    prisma.menuCategory.count({
      where: {
        slug: { in: ['bowls', 'breakfast', 'desserts', 'chefs-table'] },
      },
    }),
    prisma.priceTier.findMany({
      where: { name: { in: ['Standard', 'Enterprise', 'Partner'] } },
    }),
  ]);
  assert.equal(roles, 4);
  assert.equal(permissions, 5);
  assert.equal(stations, 4);
  assert.equal(packaging, 3);
  assert.equal(portions, 2);
  assert.equal(allergens, 5);
  assert.equal(tags, 5);
  assert.equal(options, 9);
  assert.equal(dishes, 9);
  assert.equal(categories, 4);
  assert.equal(tiers.length, 3);
  assert.equal(
    tiers.filter((tier) => tier.isDefault && tier.isActive).length,
    1,
    'Seed tiers must have one active default.',
  );
  assert.equal(
    tiers.find((tier) => tier.name === 'Standard')?.strategy,
    PriceTierStrategy.MANUAL,
  );
  assert.equal(
    tiers.find((tier) => tier.name === 'Enterprise')?.strategy,
    PriceTierStrategy.TIER_PERCENTAGE,
  );
  assert.equal(
    tiers.find((tier) => tier.name === 'Partner')?.strategy,
    PriceTierStrategy.COST_MULTIPLIER,
  );
  assert(
    await prisma.menuCategory.findFirst({
      where: { slug: 'chefs-table', isSecret: true },
    }),
    'Secret category is missing.',
  );
  assert(
    await prisma.companyHiddenCategory.findFirst({
      where: { companyId: seedId('company:bluepeak') },
    }),
    'Hidden category example is missing.',
  );
  assert(
    await prisma.companyHiddenDish.findFirst({
      where: { companyId: seedId('company:northstar') },
    }),
    'Hidden dish example is missing.',
  );
  const portionGroup = await prisma.optionGroup.findUnique({
    where: { id: seedId('option-group:custom-protein') },
    include: { portions: true },
  });
  assert(
    portionGroup?.usesPortions && portionGroup.portions.length === 2,
    'Portion-enabled option group is incomplete.',
  );
}

async function verifyCompanies(today: PlainDate) {
  const companies = await prisma.company.findMany({
    where: {
      id: {
        in: ['acme', 'bluepeak', 'northstar'].map((key) =>
          seedId(`company:${key}`),
        ),
      },
    },
    include: {
      domains: true,
      addresses: true,
      employees: true,
      workingDays: true,
      ownerEmployee: true,
    },
  });
  assert.equal(companies.length, 3);
  for (const company of companies) {
    assert(company.domains.length >= 1, `${company.name} needs a domain.`);
    assert(company.addresses.length >= 1, `${company.name} needs an address.`);
    assert(
      company.employees.length >= 3,
      `${company.name} needs realistic employees.`,
    );
    assert(company.ownerEmployee, `${company.name} needs an owner.`);
    assert.equal(
      company.ownerEmployee.companyId,
      company.id,
      `${company.name}'s owner must belong to it.`,
    );
  }
  const acme = companies.find(
    (company) => company.id === seedId('company:acme'),
  )!;
  assert(
    acme.workingDays.some((row) => row.dayOfWeek === dayOfWeek(today)),
    'Acme must accept delivery today.',
  );
  assert.equal(
    await prisma.companyHoliday.count({
      where: { companyId: acme.id, date: asDateOnly(today) },
    }),
    0,
    'Acme must not have a holiday today.',
  );
  assert.equal(
    new Set(
      companies.flatMap((company) =>
        company.domains.map((domain) => domain.domain),
      ),
    ).size,
    3,
  );
}

async function verifyOrders(today: PlainDate) {
  const orders = await prisma.order.findMany({
    where: { orderNumber: { startsWith: 'DEMO-' } },
    include: {
      employee: true,
      company: { include: { workingDays: true, holidays: true } },
      deliveryAddress: true,
      packagingType: true,
      lines: {
        include: {
          dish: true,
          combinations: { include: { options: true, prepUnit: true } },
        },
      },
      events: true,
      invoiceOrder: true,
      deliveryDrop: { include: { driver: true } },
    },
  });
  assert.equal(
    orders.length,
    30,
    'The deterministic demo order set must contain 30 orders.',
  );
  for (const status of Object.values(OrderStatus)) {
    assert(
      orders.some((order) => order.status === status),
      `No demo order has status ${status}.`,
    );
  }
  const dates = orders.map((order) => plainDate(order.deliveryDate));
  assert(
    dates.some((date) => compareDates(date, today) < 0),
    'Past orders are missing.',
  );
  assert(
    dates.some((date) => compareDates(date, today) === 0),
    "Today's orders are missing.",
  );
  assert(
    dates.some((date) => compareDates(date, today) > 0),
    'Future orders are missing.',
  );
  assert(
    dates.some((date) => compareDates(date, addDays(today, -7)) <= 0),
    'The historical window must reach approximately seven days back.',
  );
  assert(
    dates.some((date) => compareDates(date, addDays(today, 14)) >= 0),
    'The future review window must reach at least fourteen days ahead.',
  );

  for (const order of orders) {
    assert.equal(
      order.employee.companyId,
      order.companyId,
      `${order.orderNumber}: employee/company mismatch.`,
    );
    assert(
      order.deliveryAddress,
      `${order.orderNumber}: delivery address is missing.`,
    );
    assert.equal(
      order.deliveryAddress.companyId,
      order.companyId,
      `${order.orderNumber}: address/company mismatch.`,
    );
    assert.equal(
      order.deliveryAddressLabelSnapshot,
      order.deliveryAddress.label,
    );
    assert.equal(
      order.deliveryAddressLine1Snapshot,
      order.deliveryAddress.line1,
    );
    assert.equal(order.packagingNameSnapshot, order.packagingType.name);
    assert.equal(
      order.deliveryLeadMinutesSnapshot,
      order.company.deliveryLeadMinutes,
    );
    const orderDate = plainDate(order.deliveryDate);
    assert(
      order.company.workingDays.some(
        (row) => row.dayOfWeek === dayOfWeek(orderDate),
      ),
      `${order.orderNumber}: company does not deliver on this weekday.`,
    );
    assert(
      !order.company.holidays.some(
        (holiday) => dateKey(plainDate(holiday.date)) === dateKey(orderDate),
      ),
      `${order.orderNumber}: falls on a company holiday.`,
    );

    let calculatedOrderTotal = 0;
    for (const line of order.lines) {
      assert(
        line.dishNameSnapshot.length > 0 && line.dishSkuSnapshot.length > 0,
      );
      assert.equal(line.dishNameSnapshot, line.dish.name);
      assert.equal(line.dishSkuSnapshot, line.dish.sku);
      assert.equal(
        line.combinations.reduce(
          (sum, combination) => sum + combination.quantity,
          0,
        ),
        line.quantity,
        `${order.orderNumber}: combination quantities do not reconcile.`,
      );
      let calculatedLineTotal = 0;
      for (const combination of line.combinations) {
        const additions = combination.options.reduce((sum, option) => {
          assert(
            option.optionGroupNameSnapshot.length > 0 &&
              option.optionNameSnapshot.length > 0,
          );
          if (option.portionSizeId)
            assert(option.portionNameSnapshot, 'Portion snapshot is missing.');
          return sum + option.optionPriceCents + option.portionExtraCents;
        }, 0);
        assert.equal(
          combination.unitPriceCents,
          line.dishUnitPriceCents + additions,
          `${order.orderNumber}: combination unit price is wrong.`,
        );
        assert.equal(
          combination.totalCents,
          combination.unitPriceCents * combination.quantity,
          `${order.orderNumber}: combination total is wrong.`,
        );
        calculatedLineTotal += combination.totalCents;
      }
      assert.equal(
        line.lineTotalCents,
        calculatedLineTotal,
        `${order.orderNumber}: line total is wrong.`,
      );
      calculatedOrderTotal += calculatedLineTotal;
    }
    assert.equal(
      order.subtotalCents,
      calculatedOrderTotal,
      `${order.orderNumber}: subtotal is wrong.`,
    );
    assert.equal(
      order.totalCents,
      calculatedOrderTotal,
      `${order.orderNumber}: total is wrong.`,
    );
    if (order.confirmedAt)
      assert.equal(
        order.billableTotalCents,
        order.totalCents,
        `${order.orderNumber}: confirmed amount is not frozen.`,
      );
    else
      assert.equal(
        order.billableTotalCents,
        null,
        `${order.orderNumber}: non-confirmed order is billable.`,
      );
    assert(
      order.events.length >= 1,
      `${order.orderNumber}: timeline is empty.`,
    );
    if (order.deliveryDrop) {
      assert.equal(order.deliveryDrop.companyId, order.companyId);
      assert.equal(
        order.deliveryDrop.scheduledDeliveryAt.getTime(),
        order.deliveryAt.getTime(),
      );
      assert.equal(
        order.deliveryDrop.addressLine1Snapshot,
        order.deliveryAddressLine1Snapshot,
      );
    }
  }

  const combinationDemo = orders.find(
    (order) => order.orderNumber === 'DEMO-TODAY-CONF-001',
  )!;
  assert.equal(combinationDemo.lines[0]?.quantity, 10);
  assert.equal(combinationDemo.lines[0]?.combinations.length, 2);
  assert.deepEqual(
    combinationDemo.lines[0]?.combinations
      .map((combination) => combination.quantity)
      .sort((a, b) => a - b),
    [4, 6],
  );
  const cancelledAfterConfirmation = orders.find(
    (order) => order.orderNumber === 'DEMO-PAST-CAN-001',
  )!;
  assert(
    cancelledAfterConfirmation.confirmedAt &&
      cancelledAfterConfirmation.cancelledAt &&
      cancelledAfterConfirmation.billableTotalCents !== null,
  );
  const rejected = orders.find(
    (order) => order.status === OrderStatus.REJECTED,
  )!;
  assert.equal(rejected.billableTotalCents, null);
  for (let dayOffset = 1; dayOffset <= 14; dayOffset += 1) {
    const key = String(dayOffset).padStart(2, '0');
    const windowOrder = orders.find(
      (order) => order.orderNumber === `DEMO-WINDOW-${key}`,
    );
    assert(windowOrder, `Review-window order ${key} is missing.`);
    assert.equal(
      dateKey(plainDate(windowOrder.deliveryDate)),
      dateKey(addDays(today, dayOffset)),
      `Review-window order ${key} is on the wrong date.`,
    );
    assert.equal(windowOrder.status, OrderStatus.CONFIRMED);
    assert.equal(
      windowOrder.deliveryDrop?.status,
      DeliveryDropStatus.DISPATCH_READY,
    );
    assert.equal(
      windowOrder.deliveryDrop?.driver?.email,
      'driver@test.com',
      `Review-window date ${key} is not assigned to the demo driver.`,
    );
  }
  const cutoffTables = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CutoffRun'`,
  );
  assert.equal(cutoffTables.length, 0, 'CutoffRun must not be persisted.');
}

async function verifyOperations(today: PlainDate) {
  const prepUnits = await prisma.prepUnit.findMany({
    include: { order: true, combination: true, station: true },
  });
  assert(prepUnits.length >= 25, 'Prep units are missing.');
  assert(
    prepUnits.some((unit) => unit.startedAt === null && unit.doneAt === null),
    'Not-started prep example is missing.',
  );
  assert(
    prepUnits.some((unit) => unit.startedAt !== null && unit.doneAt === null),
    'Started prep example is missing.',
  );
  assert(
    prepUnits.some((unit) => unit.doneAt !== null),
    'Completed prep example is missing.',
  );
  for (const prep of prepUnits) {
    assert.equal(prep.quantity, prep.combination.quantity);
    assert(prep.stationNameSnapshot.length > 0);
    if (prep.doneAt)
      assert(prep.startedAt, 'A completed prep unit must have a start time.');
  }
  const unfinished = await prisma.order.findFirst({
    where: {
      orderNumber: { startsWith: 'DEMO-' },
      status: OrderStatus.CONFIRMED,
      prepUnits: { some: { doneAt: null } },
    },
  });
  assert(unfinished, 'A confirmed order with unfinished prep is required.');
  const readyDrop = await prisma.deliveryDrop.findFirst({
    where: {
      id: seedId('drop:today-grouped'),
      status: DeliveryDropStatus.DISPATCH_READY,
    },
    include: { orders: { include: { prepUnits: true } } },
  });
  assert(
    readyDrop && readyDrop.orders.length > 1,
    'The grouped dispatch-ready drop is missing.',
  );
  assert(
    readyDrop.orders.every(
      (order) =>
        order.prepUnits.length > 0 &&
        order.prepUnits.every((unit) => unit.doneAt),
    ),
    'Dispatch-ready drop contains unfinished prep.',
  );

  const driver = await prisma.staffUser.findUniqueOrThrow({
    where: { email: 'driver@test.com' },
  });
  const todayDrops = await prisma.deliveryDrop.findMany({
    where: {
      driverStaffUserId: driver.id,
      scheduledDeliveryAt: {
        gte: businessInstant(today, 0, 0),
        lt: businessInstant(addDays(today, 1), 0, 0),
      },
    },
    orderBy: { scheduledDeliveryAt: 'asc' },
  });
  assert(todayDrops.length >= 3, 'driver@test.com needs multiple drops today.');
  assert(
    todayDrops.some(
      (drop) => drop.status === DeliveryDropStatus.DISPATCH_READY,
    ),
  );
  assert(
    todayDrops.some(
      (drop) => drop.status === DeliveryDropStatus.OUT_FOR_DELIVERY,
    ),
  );
  assert(
    todayDrops.some((drop) => drop.status === DeliveryDropStatus.DELIVERED),
  );
  const reviewDrops = await prisma.deliveryDrop.findMany({
    where: {
      id: {
        in: Array.from({ length: 14 }, (_, index) =>
          seedId(`drop:review-day-${String(index + 1).padStart(2, '0')}`),
        ),
      },
      driverStaffUserId: driver.id,
    },
    include: { orders: true },
  });
  assert.equal(
    reviewDrops.length,
    14,
    'Every future review date needs a deterministic driver drop.',
  );
  assert(
    reviewDrops.every(
      (drop) =>
        drop.status === DeliveryDropStatus.DISPATCH_READY &&
        drop.orders.length >= 1,
    ),
    'Review-window drops must be dispatch-ready and contain an order.',
  );
  const historicalDelivered = await prisma.order.findFirst({
    where: {
      orderNumber: { startsWith: 'DEMO-' },
      status: OrderStatus.DELIVERED,
      deliveryDate: { lt: asDateOnly(today) },
    },
  });
  assert(historicalDelivered, 'Historical delivered order is missing.');
}

async function verifyBilling() {
  const invoices = await prisma.invoice.findMany({
    where: { invoiceNumber: { startsWith: 'DEMO-' } },
    include: { orders: { include: { order: true } } },
  });
  assert.equal(invoices.length, 2);
  assert(invoices.some((invoice) => invoice.status === InvoiceStatus.PAID));
  assert(invoices.some((invoice) => invoice.status === InvoiceStatus.UNPAID));
  for (const invoice of invoices) {
    assert(invoice.orders.length > 0);
    assert.equal(
      invoice.totalCents,
      invoice.orders.reduce((sum, row) => sum + row.amountCents, 0),
      `${invoice.invoiceNumber}: total does not reconcile.`,
    );
    for (const row of invoice.orders) {
      assert.equal(row.amountCents, row.order.billableTotalCents);
      assert(row.order.confirmedAt);
      assert.notEqual(row.order.status, OrderStatus.REJECTED);
      assert.notEqual(row.order.status, OrderStatus.DRAFT);
      assert.notEqual(row.order.status, OrderStatus.PLACED);
    }
  }
  const uninvoiced = await prisma.order.count({
    where: {
      orderNumber: { startsWith: 'DEMO-' },
      billableTotalCents: { not: null },
      invoiceOrder: null,
    },
  });
  assert(
    uninvoiced >= 3,
    'Confirmed uninvoiced orders are required for billing work.',
  );
}

async function verifySettings() {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: 1 },
  });
  assert(settings);
  assert.equal(settings.businessTimezone, BUSINESS_TIME_ZONE);
  assert.equal(settings.cutoffWorkingDayCount, 2);
  assert.equal(settings.kitchenReadyBufferMinutes, 30);
  assert.equal(settings.atRiskWindowMinutes, 30);
  const days = await prisma.kitchenWorkingDay.findMany();
  assert.deepEqual(
    days.map((row) => row.dayOfWeek).sort(),
    [
      DayOfWeek.FRIDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
    ].sort(),
  );
}

async function main() {
  const today = businessToday();
  await verifyAccounts();
  await verifyReferenceData();
  await verifyCompanies(today);
  await verifyOrders(today);
  await verifyOperations(today);
  await verifyBilling();
  await verifySettings();
  console.log(
    `Seed verification passed for ${dateKey(today)} (${BUSINESS_TIME_ZONE}).`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
