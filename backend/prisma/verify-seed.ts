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
import { companySeeds } from './seed-data.js';

const prisma = createSeedClient();
const PASSWORD = 'Test@1234';

function plainDate(value: Date): PlainDate {
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
}

/** Ranges the enriched demo seed must stay within (see prisma/seed-data.ts). */
const COMPANY_RANGE = [8, 10] as const;
const EMPLOYEE_RANGE = [40, 60] as const;
const ORDER_RANGE = [120, 180] as const;
const INVOICE_RANGE = [8, 12] as const;
/** Reviewers must always see at least two weeks of forward data. */
const REQUIRED_COVERAGE_DAYS = 14;

function inRange(value: number, [min, max]: readonly [number, number], label: string) {
  assert(value >= min && value <= max, `${label}: ${value} is outside ${min}–${max}.`);
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
    await prisma.priceTier.count({ where: { isActive: true, isDefault: true } }),
    1,
    'Exactly one active default PriceTier must exist.',
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
    where: { id: { in: companySeeds.map((company) => seedId(`company:${company.key}`)) } },
    include: {
      domains: true,
      addresses: true,
      employees: { include: { defaultDeliveryAddress: true } },
      workingDays: true,
      ownerEmployee: true,
      hiddenCategories: true,
      hiddenDishes: true,
    },
  });
  inRange(companies.length, COMPANY_RANGE, 'Demo companies');
  const employees = companies.flatMap((company) => company.employees);
  inRange(employees.length, EMPLOYEE_RANGE, 'Demo employees');
  for (const company of companies) {
    assert(company.domains.length >= 1, `${company.name} needs a domain.`);
    assert(company.addresses.length >= 1, `${company.name} needs an address.`);
    assert(company.employees.length >= 5, `${company.name} needs realistic employees.`);
    assert(company.ownerEmployee, `${company.name} needs an owner.`);
    assert.equal(company.ownerEmployee.companyId, company.id, `${company.name}'s owner must belong to it.`);
    for (const employee of company.employees)
      assert.equal(
        employee.defaultDeliveryAddress?.companyId,
        company.id,
        `${employee.name}: default address must belong to ${company.name}.`,
      );
  }
  const domains = companies.flatMap((company) => company.domains.map((domain) => domain.domain));
  assert.equal(new Set(domains).size, domains.length, 'Company domains must be unique.');
  assert(companies.some((company) => company.priceTierId === null), 'A company on the default tier is required.');
  assert(new Set(companies.flatMap((company) => (company.priceTierId ? [company.priceTierId] : []))).size >= 2, 'Both non-default tiers must be in use.');
  assert(companies.filter((company) => company.hiddenCategories.length || company.hiddenDishes.length).length >= 2, 'Menu hiding examples are missing.');
  assert(companies.some((company) => company.defaultDriverStaffUserId === null), 'A company without a default driver is required.');
  for (const key of ['acme', 'greenfield']) {
    const company = companies.find((item) => item.id === seedId(`company:${key}`))!;
    assert(company.workingDays.some((row) => row.dayOfWeek === dayOfWeek(today)), `${company.name} must accept delivery today.`);
    assert.equal(
      await prisma.companyHoliday.count({ where: { companyId: company.id, date: asDateOnly(today) } }),
      0,
      `${company.name} must not have a holiday today.`,
    );
  }
}

/** The app's cut-off walk-back over the stored kitchen calendar and settings. */
async function cutoffFor(date: PlainDate): Promise<Date> {
  const settings = await prisma.platformSettings.findUniqueOrThrow({ where: { id: 1 } });
  const days = new Set((await prisma.kitchenWorkingDay.findMany()).map((row) => row.dayOfWeek));
  const holidays = new Set((await prisma.kitchenHoliday.findMany()).map((row) => dateKey(plainDate(row.date))));
  let cursor = date;
  let remaining = settings.cutoffWorkingDayCount;
  while (remaining > 0) {
    cursor = addDays(cursor, -1);
    if (days.has(dayOfWeek(cursor)) && !holidays.has(dateKey(cursor))) remaining -= 1;
  }
  return businessInstant(cursor, settings.cutoffTime.getUTCHours(), settings.cutoffTime.getUTCMinutes());
}

async function verifyOrders(today: PlainDate) {
  const orders = await prisma.order.findMany({
    where: { orderNumber: { startsWith: 'DEMO-' } },
    include: {
      employee: true,
      company: { include: { workingDays: true, holidays: true, hiddenCategories: true, hiddenDishes: true } },
      deliveryAddress: true,
      packagingType: true,
      lines: {
        include: {
          dish: { include: { menuCategoryItems: true } },
          combinations: { include: { options: true, prepUnit: true } },
        },
      },
      events: true,
      invoiceOrder: true,
      deliveryDrop: { include: { driver: true } },
    },
  });
  inRange(orders.length, ORDER_RANGE, 'Demo orders');
  for (const status of Object.values(OrderStatus)) {
    assert(orders.some((order) => order.status === status), `No demo order has status ${status}.`);
  }
  const dates = orders.map((order) => plainDate(order.deliveryDate));
  assert(dates.some((date) => compareDates(date, today) < 0), 'Past orders are missing.');
  assert(dates.some((date) => compareDates(date, addDays(today, -7)) <= 0), 'The historical window must reach approximately seven days back.');
  assert(dates.some((date) => compareDates(date, addDays(today, 28)) >= 0), 'The future window must reach 28 days ahead.');
  const now = Date.now();

  for (const order of orders) {
    const label = order.orderNumber;
    assert.equal(order.employee.companyId, order.companyId, `${label}: employee/company mismatch.`);
    assert(order.deliveryAddress, `${label}: delivery address is missing.`);
    assert.equal(order.deliveryAddress.companyId, order.companyId, `${label}: address/company mismatch.`);
    assert.equal(order.deliveryAddressLabelSnapshot, order.deliveryAddress.label);
    assert.equal(order.deliveryAddressLine1Snapshot, order.deliveryAddress.line1);
    assert.equal(order.packagingNameSnapshot, order.packagingType.name);
    assert.equal(order.deliveryLeadMinutesSnapshot, order.company.deliveryLeadMinutes);
    const orderDate = plainDate(order.deliveryDate);
    assert(order.company.workingDays.some((row) => row.dayOfWeek === dayOfWeek(orderDate)), `${label}: company does not deliver on this weekday.`);
    assert(
      !order.company.holidays.some((holiday) => dateKey(plainDate(holiday.date)) === dateKey(orderDate)),
      `${label}: falls on a company holiday.`,
    );
    // Employee choice flags: a non-default address, time or packaging needs the matching permission.
    const defaultTime = businessInstant(orderDate, order.company.defaultDeliveryTime.getUTCHours(), order.company.defaultDeliveryTime.getUTCMinutes());
    if (order.deliveryAddressId !== order.employee.defaultDeliveryAddressId)
      assert(order.employee.canChooseDeliveryAddress, `${label}: non-default address without permission.`);
    if (order.deliveryAt.getTime() !== defaultTime.getTime())
      assert(order.employee.canChangeDeliveryTime, `${label}: non-default time without permission.`);
    if (order.packagingTypeId !== order.company.defaultPackagingTypeId)
      assert(order.employee.canChangePackaging, `${label}: non-default packaging without permission.`);

    let calculatedOrderTotal = 0;
    for (const line of order.lines) {
      assert(line.dishNameSnapshot.length > 0 && line.dishSkuSnapshot.length > 0);
      assert.equal(line.dishNameSnapshot, line.dish.name);
      assert.equal(line.dishSkuSnapshot, line.dish.sku);
      assert(!order.company.hiddenDishes.some((row) => row.dishId === line.dishId), `${label}: uses a dish hidden for its company.`);
      assert(
        !line.dish.menuCategoryItems.every((item) => order.company.hiddenCategories.some((row) => row.categoryId === item.categoryId)),
        `${label}: uses a dish whose categories are all hidden for its company.`,
      );
      if (line.dish.minimumOrderQuantity)
        assert(line.quantity >= line.dish.minimumOrderQuantity, `${label}: below the dish minimum quantity.`);
      assert.equal(
        line.combinations.reduce((sum, combination) => sum + combination.quantity, 0),
        line.quantity,
        `${label}: combination quantities do not reconcile.`,
      );
      let calculatedLineTotal = 0;
      for (const combination of line.combinations) {
        const additions = combination.options.reduce((sum, option) => {
          assert(option.optionGroupNameSnapshot.length > 0 && option.optionNameSnapshot.length > 0);
          if (option.portionSizeId) assert(option.portionNameSnapshot, 'Portion snapshot is missing.');
          return sum + option.optionPriceCents + option.portionExtraCents;
        }, 0);
        assert.equal(combination.unitPriceCents, line.dishUnitPriceCents + additions, `${label}: combination unit price is wrong.`);
        assert.equal(combination.totalCents, combination.unitPriceCents * combination.quantity, `${label}: combination total is wrong.`);
        calculatedLineTotal += combination.totalCents;
        // Exactly one PrepUnit per combination once confirmed; none before.
        if (order.confirmedAt) {
          assert(combination.prepUnit, `${label}: confirmed combination without a PrepUnit.`);
          assert.equal(combination.prepUnit.quantity, combination.quantity);
        } else assert.equal(combination.prepUnit, null, `${label}: unconfirmed order has a PrepUnit.`);
      }
      assert.equal(line.lineTotalCents, calculatedLineTotal, `${label}: line total is wrong.`);
      calculatedOrderTotal += calculatedLineTotal;
    }
    assert.equal(order.subtotalCents, calculatedOrderTotal, `${label}: subtotal is wrong.`);
    assert.equal(order.totalCents, calculatedOrderTotal, `${label}: total is wrong.`);
    if (order.confirmedAt) assert.equal(order.billableTotalCents, order.totalCents, `${label}: confirmed amount is not frozen.`);
    else assert.equal(order.billableTotalCents, null, `${label}: non-confirmed order is billable.`);
    assert(order.events.length >= 1, `${label}: timeline is empty.`);
    for (const at of [order.createdAt, order.placedAt, order.confirmedAt, order.cancelledAt, order.rejectedAt, order.kitchenStartedAt, order.kitchenReadyAt])
      if (at) assert(at.getTime() <= now, `${label}: has a lifecycle timestamp in the future.`);
    if (order.deliveryDrop) {
      assert.equal(order.deliveryDrop.companyId, order.companyId);
      assert.equal(order.deliveryDrop.scheduledDeliveryAt.getTime(), order.deliveryAt.getTime());
      assert.equal(order.deliveryDrop.addressLine1Snapshot, order.deliveryAddressLine1Snapshot);
    }
    // A future DRAFT/PLACED order is still before its cut-off; today's may be awaiting the cut-off run.
    if ((order.status === OrderStatus.DRAFT || order.status === OrderStatus.PLACED) && compareDates(orderDate, today) > 0)
      assert(now < (await cutoffFor(orderDate)).getTime(), `${label}: ${order.status} after its cut-off has passed.`);
  }

  const combinationDemo = orders.find((order) => order.orderNumber === 'DEMO-TODAY-CONF-001')!;
  assert.equal(combinationDemo.lines[0]?.quantity, 10);
  assert.deepEqual(
    combinationDemo.lines[0]?.combinations.map((combination) => combination.quantity).sort((a, b) => a - b),
    [4, 6],
  );
  const cancelledAfterConfirmation = orders.find((order) => order.orderNumber === 'DEMO-PAST-CAN-001')!;
  assert(cancelledAfterConfirmation.confirmedAt && cancelledAfterConfirmation.cancelledAt && cancelledAfterConfirmation.billableTotalCents !== null);
  const draftCancelled = orders.find((order) => order.orderNumber === 'DEMO-PAST-CAN-002')!;
  assert(draftCancelled.cancelledAt && !draftCancelled.placedAt && draftCancelled.billableTotalCents === null, 'Pre-confirmation cancellation must not be billable.');
  for (const rejected of orders.filter((order) => order.status === OrderStatus.REJECTED))
    assert.equal(rejected.billableTotalCents, null);
  assert(
    orders.some((order) => compareDates(plainDate(order.deliveryDate), today) > 0 && (order.status === OrderStatus.DRAFT || order.status === OrderStatus.PLACED)),
    'Upcoming DRAFT/PLACED examples are missing.',
  );
  assert(
    orders.some((order) => order.lines.some((line) => line.combinations.some((combination) => combination.options.some((option) => option.portionExtraCents > 0)))),
    'A portion-surcharge example is missing.',
  );
  assert(new Set(orders.map((order) => order.companyId)).size >= COMPANY_RANGE[0], 'Every demo company needs orders.');

  // Lifecycle semantics shared with the running application.
  for (const order of orders) {
    const dropStatus = order.deliveryDrop?.status;
    if (dropStatus === DeliveryDropStatus.DELIVERED)
      assert.equal(order.status, OrderStatus.DELIVERED, `${order.orderNumber} is in a delivered Drop but not DELIVERED.`);
    if (dropStatus === DeliveryDropStatus.DISPATCH_READY || dropStatus === DeliveryDropStatus.OUT_FOR_DELIVERY) {
      assert.equal(order.status, OrderStatus.CONFIRMED, `${order.orderNumber} is in an active Drop but not CONFIRMED.`);
      assert(order.kitchenReadyAt, `${order.orderNumber} is in a Drop before it is Kitchen-ready.`);
    }
    if (order.status === OrderStatus.DELIVERED)
      assert.equal(dropStatus, DeliveryDropStatus.DELIVERED, `${order.orderNumber} is DELIVERED without a delivered Drop.`);
    if (order.status === OrderStatus.CONFIRMED && order.kitchenReadyAt)
      assert(order.deliveryDropId, `${order.orderNumber} is Kitchen-ready but in no Drop.`);
    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.DELIVERED)
      assert.equal(order.deliveryDropId, null, `${order.orderNumber} (${order.status}) must not belong to a Drop.`);
  }
  const cutoffTables = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CutoffRun'`,
  );
  assert.equal(cutoffTables.length, 0, 'CutoffRun must not be persisted.');
}

async function verifyOperations(today: PlainDate) {
  const driver = await prisma.staffUser.findUniqueOrThrow({ where: { email: 'driver@test.com' } });
  const prepUnits = await prisma.prepUnit.findMany({ include: { order: true, combination: true } });
  for (const state of ['NOT_STARTED', 'STARTED', 'DONE'] as const)
    assert(
      prepUnits.some((unit) =>
        state === 'DONE' ? unit.doneAt !== null : state === 'STARTED' ? unit.startedAt !== null && unit.doneAt === null : unit.startedAt === null && unit.doneAt === null,
      ),
      `PrepUnit state ${state} is missing.`,
    );
  for (const prep of prepUnits) {
    assert.equal(prep.quantity, prep.combination.quantity);
    assert(prep.stationNameSnapshot.length > 0);
    if (prep.doneAt) assert(prep.startedAt, 'A completed prep unit must have a start time.');
  }

  const drops = await prisma.deliveryDrop.findMany({ include: { orders: { include: { prepUnits: true } } } });
  for (const status of Object.values(DeliveryDropStatus))
    assert(drops.some((drop) => drop.status === status), `No Drop has status ${status}.`);
  assert.equal(drops.filter((drop) => drop.orders.length === 0).length, 0, 'Empty Drops must not exist (stale seed rows?).');
  const mutableKeys = new Set<string>();
  for (const drop of drops) {
    if (drop.status !== DeliveryDropStatus.DISPATCH_READY) continue;
    // Grouping rule: one mutable Drop per company + address + exact time.
    const key = `${drop.companyId}|${drop.addressLine1Snapshot}|${drop.scheduledDeliveryAt.toISOString()}`;
    assert(!mutableKeys.has(key), `Two dispatch-ready Drops share the grouping key ${key}.`);
    mutableKeys.add(key);
    assert(
      drop.orders.every((order) => order.prepUnits.length > 0 && order.prepUnits.every((unit) => unit.doneAt)),
      'A dispatch-ready Drop contains unfinished prep.',
    );
  }
  for (const drop of drops.filter((item) => item.status !== DeliveryDropStatus.DISPATCH_READY))
    assert(drop.driverStaffUserId, 'Departed and delivered Drops must have a driver.');
  for (const drop of drops) if (drop.photoUrl) assert(!/^https?:/i.test(drop.photoUrl), 'Drop.photoUrl must hold a private locator, not a URL.');
  assert(drops.some((drop) => drop.orders.length > 1), 'A grouped multi-order Drop is required.');
  assert(drops.some((drop) => drop.status === DeliveryDropStatus.DISPATCH_READY && !drop.driverStaffUserId), 'An unassigned ready Drop is required.');
  const delivered = drops.filter((drop) => drop.status === DeliveryDropStatus.DELIVERED && drop.deliveredAt);
  const onTime = delivered.map((drop) => drop.deliveredAt!.getTime() <= drop.scheduledDeliveryAt.getTime());
  assert(onTime.includes(true) && onTime.includes(false), 'Delivered Drops must include both on-time and late deliveries.');

  // Day-by-day coverage relative to the CURRENT business date: no thin days.
  const orders = await prisma.order.findMany({
    where: { orderNumber: { startsWith: 'DEMO-' }, deliveryDate: { gte: asDateOnly(today), lte: asDateOnly(addDays(today, REQUIRED_COVERAGE_DAYS)) } },
    include: { prepUnits: true },
  });
  let totalOrders = 0;
  for (let dayOffset = 0; dayOffset <= REQUIRED_COVERAGE_DAYS; dayOffset += 1) {
    const date = addDays(today, dayOffset);
    const label = `${dateKey(date)} (today+${dayOffset})`;
    const dayOrders = orders.filter((order) => dateKey(plainDate(order.deliveryDate)) === dateKey(date));
    const dayDrops = drops.filter(
      (drop) =>
        drop.scheduledDeliveryAt >= businessInstant(date, 0, 0) && drop.scheduledDeliveryAt < businessInstant(addDays(date, 1), 0, 0),
    );
    const units = dayOrders.flatMap((order) => order.prepUnits);
    totalOrders += dayOrders.length;
    assert(dayOrders.length >= 3, `${label}: fewer than 3 orders.`);
    assert(new Set(dayOrders.map((order) => order.companyId)).size >= 2, `${label}: fewer than 2 companies.`);
    assert(dayDrops.length >= 2, `${label}: fewer than 2 Drops.`);
    assert(dayDrops.some((drop) => drop.driverStaffUserId === driver.id), `${label}: no Drop for driver@test.com.`);
    assert(new Set(units.map((unit) => unit.stationNameSnapshot)).size >= 2, `${label}: fewer than 2 kitchen stations.`);
    assert(units.some((unit) => unit.doneAt === null), `${label}: no unfinished kitchen work.`);
  }
  assert(totalOrders / (REQUIRED_COVERAGE_DAYS + 1) >= 4, 'The next 14 days are too thin on average.');

  // Today is the richest day.
  const todayOrders = orders.filter((order) => dateKey(plainDate(order.deliveryDate)) === dateKey(today));
  assert(todayOrders.length >= 10, 'Today needs a rich set of orders.');
  for (const status of [OrderStatus.DRAFT, OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.DELIVERED])
    assert(todayOrders.some((order) => order.status === status), `Today has no ${status} order.`);
  const todayUnits = todayOrders.flatMap((order) => order.prepUnits);
  assert(todayUnits.some((unit) => !unit.startedAt), 'Today needs not-started prep.');
  assert(todayUnits.some((unit) => unit.startedAt && !unit.doneAt), 'Today needs started prep.');
  assert(todayUnits.some((unit) => unit.doneAt), 'Today needs done prep.');
  assert(new Set(todayUnits.map((unit) => unit.stationNameSnapshot)).size >= 3, 'Today needs several stations.');
  const todayDrops = drops.filter(
    (drop) => drop.scheduledDeliveryAt >= businessInstant(today, 0, 0) && drop.scheduledDeliveryAt < businessInstant(addDays(today, 1), 0, 0),
  );
  for (const status of Object.values(DeliveryDropStatus))
    assert(todayDrops.some((drop) => drop.status === status), `Today has no ${status} Drop.`);
  assert(todayDrops.filter((drop) => drop.driverStaffUserId === driver.id).length >= 3, 'driver@test.com needs multiple drops today.');
}

async function verifyBilling() {
  const invoices = await prisma.invoice.findMany({
    where: { invoiceNumber: { startsWith: 'DEMO-' } },
    include: { orders: { include: { order: true } } },
  });
  inRange(invoices.length, INVOICE_RANGE, 'Demo invoices');
  assert(invoices.some((invoice) => invoice.status === InvoiceStatus.PAID));
  assert(invoices.some((invoice) => invoice.status === InvoiceStatus.UNPAID));
  assert(invoices.some((invoice) => invoice.orders.length > 1), 'A multi-order invoice is required.');
  for (const invoice of invoices) {
    assert(invoice.orders.length > 0);
    assert.equal(
      invoice.totalCents,
      invoice.orders.reduce((sum, row) => sum + row.amountCents, 0),
      `${invoice.invoiceNumber}: total does not reconcile.`,
    );
    assert.equal(invoice.status === InvoiceStatus.PAID, invoice.paidAt !== null, `${invoice.invoiceNumber}: paid status and paidAt disagree.`);
    for (const row of invoice.orders) {
      assert.equal(row.amountCents, row.order.billableTotalCents);
      assert.equal(row.order.companyId, invoice.companyId, `${invoice.invoiceNumber}: order from another company.`);
      assert(row.order.confirmedAt);
    }
  }
  const uninvoiced = await prisma.order.count({
    where: { orderNumber: { startsWith: 'DEMO-' }, billableTotalCents: { not: null }, invoiceOrder: null },
  });
  assert(uninvoiced >= 3, 'Confirmed uninvoiced orders are required for billing work.');
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
