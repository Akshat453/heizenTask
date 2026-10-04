import bcrypt from 'bcryptjs';

import type { PrismaClient } from '../src/generated/prisma/client.js';
import {
  DayOfWeek,
  DeliveryDropStatus,
  OrderEventType,
  OrderStatus,
  PriceTierStrategy,
} from '../src/generated/prisma/enums.js';
import {
  BUSINESS_TIME_ZONE,
  addDays,
  asDateOnly,
  assertIntegerMoney,
  businessInstant,
  businessToday,
  dateKey,
  createSeedClient,
  seedId,
  timeOnly,
  type PlainDate,
} from './seed-support.js';
import {
  CUTOFF_HOUR,
  CUTOFF_WORKING_DAY_COUNT,
  ENTERPRISE_SOURCE_ADJUSTMENT_BPS,
  KITCHEN_HOLIDAY_OFFSET,
  PARTNER_COST_MULTIPLIER_BPS,
  addressSeeds,
  allergenSeeds,
  companyHolidaySeeds,
  companySeeds,
  companyWorkingDays,
  cutoffInstant,
  dietaryTagSeeds,
  dishSeeds,
  employeeSeeds,
  enterpriseDishOverrides,
  enterpriseOptionOverrides,
  hiddenMenuSeeds,
  lineTotal,
  menuCategorySeeds,
  optionGroupSeeds,
  optionSeeds,
  orderTotal,
  packagingSeeds,
  partnerDishOverrides,
  permissions,
  planSeed,
  portionSeeds,
  rolePermissions,
  staffSeeds,
  standardDishPrices,
  standardOptionPrices,
  stationSeeds,
  type DropPlan,
  type OrderSeed,
} from './seed-data.js';

const prisma = createSeedClient();
const PASSWORD = 'Test@1234';
const BCRYPT_COST = 12;


function idMap<const T extends readonly { key: string }[]>(
  items: T,
  prefix: string,
): Record<string, string> {
  return Object.fromEntries(
    items.map((item) => [item.key, seedId(`${prefix}:${item.key}`)]),
  );
}

async function seedRbac(client: PrismaClient) {
  const roleIds = Object.fromEntries(
    ['ADMIN', 'KITCHEN', 'DISPATCH', 'DRIVER'].map((name) => [
      name,
      seedId(`role:${name}`),
    ]),
  );
  const permissionIds = Object.fromEntries(
    permissions.map(([key]) => [key, seedId(`permission:${key}`)]),
  );

  for (const name of Object.keys(roleIds)) {
    await client.role.upsert({
      where: { name },
      create: {
        id: roleIds[name]!,
        name,
        description: `${name[0]}${name.slice(1).toLowerCase()} access`,
      },
      update: {
        description: `${name[0]}${name.slice(1).toLowerCase()} access`,
      },
    });
  }
  for (const [key, description] of permissions) {
    await client.permission.upsert({
      where: { key },
      create: { id: permissionIds[key]!, key, description },
      update: { description },
    });
  }
  for (const [roleName, keys] of Object.entries(rolePermissions)) {
    await client.rolePermission.deleteMany({
      where: { roleId: roleIds[roleName]! },
    });
    await client.rolePermission.createMany({
      data: keys.map((key) => ({
        roleId: roleIds[roleName]!,
        permissionId: permissionIds[key]!,
      })),
    });
  }

  const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_COST);
  for (const staff of staffSeeds) {
    await client.staffUser.upsert({
      where: { email: staff.email },
      create: {
        id: seedId(`staff:${staff.key}`),
        name: staff.name,
        email: staff.email,
        passwordHash,
        roleId: roleIds[staff.role]!,
        isActive: true,
      },
      update: {
        name: staff.name,
        passwordHash,
        roleId: roleIds[staff.role]!,
        isActive: true,
      },
    });
  }
  return { roleIds };
}

async function seedReferenceAndCatalogue(client: PrismaClient) {
  const stationIds = Object.fromEntries(
    stationSeeds.map(([key]) => [key, seedId(`station:${key}`)]),
  );
  const packagingIds = Object.fromEntries(
    packagingSeeds.map(([key]) => [key, seedId(`packaging:${key}`)]),
  );
  const portionIds = Object.fromEntries(
    portionSeeds.map(([key]) => [key, seedId(`portion:${key}`)]),
  );
  const allergenIds = Object.fromEntries(
    allergenSeeds.map((name) => [name, seedId(`allergen:${name}`)]),
  );
  const tagIds = Object.fromEntries(
    dietaryTagSeeds.map((name) => [name, seedId(`tag:${name}`)]),
  );
  const optionIds = idMap(optionSeeds, 'option');
  const dishIds = idMap(dishSeeds, 'dish');
  const groupIds = idMap(optionGroupSeeds, 'option-group');

  for (const [key, name, displayOrder] of stationSeeds) {
    await client.kitchenStation.upsert({
      where: { name },
      create: { id: stationIds[key]!, name, displayOrder, isActive: true },
      update: { displayOrder, isActive: true },
    });
  }
  for (const [key, name, displayOrder] of packagingSeeds) {
    await client.packagingType.upsert({
      where: { name },
      create: { id: packagingIds[key]!, name, displayOrder, isActive: true },
      update: { displayOrder, isActive: true },
    });
  }
  for (const [key, name, displayOrder] of portionSeeds) {
    await client.portionSize.upsert({
      where: { name },
      create: { id: portionIds[key]!, name, displayOrder, isActive: true },
      update: { displayOrder, isActive: true },
    });
  }
  for (const name of allergenSeeds) {
    await client.allergen.upsert({
      where: { name },
      create: { id: allergenIds[name]!, name, isActive: true },
      update: { isActive: true },
    });
  }
  for (const name of dietaryTagSeeds) {
    await client.dietaryTag.upsert({
      where: { name },
      create: { id: tagIds[name]!, name, isActive: true },
      update: { isActive: true },
    });
  }

  for (const option of optionSeeds) {
    assertIntegerMoney(option.cost, `${option.name} cost`);
    await client.option.upsert({
      where: { id: optionIds[option.key]! },
      create: {
        id: optionIds[option.key]!,
        name: option.name,
        costCents: option.cost,
        isActive: true,
      },
      update: { name: option.name, costCents: option.cost, isActive: true },
    });
    for (const allergen of option.allergens) {
      await client.optionAllergen.upsert({
        where: {
          optionId_allergenId: {
            optionId: optionIds[option.key]!,
            allergenId: allergenIds[allergen]!,
          },
        },
        create: {
          optionId: optionIds[option.key]!,
          allergenId: allergenIds[allergen]!,
        },
        update: {},
      });
    }
    for (const tag of option.tags) {
      await client.optionDietaryTag.upsert({
        where: {
          optionId_dietaryTagId: {
            optionId: optionIds[option.key]!,
            dietaryTagId: tagIds[tag]!,
          },
        },
        create: {
          optionId: optionIds[option.key]!,
          dietaryTagId: tagIds[tag]!,
        },
        update: {},
      });
    }
  }

  for (const dish of dishSeeds) {
    assertIntegerMoney(dish.cost, `${dish.name} cost`);
    await client.dish.upsert({
      where: { sku: dish.sku },
      create: {
        id: dishIds[dish.key]!,
        name: dish.name,
        sku: dish.sku,
        description: dish.description,
        imageUrl: dish.imageUrl,
        temperature: dish.temperature,
        costCents: dish.cost,
        minimumOrderQuantity: dish.minimum,
        stationId: stationIds[dish.station]!,
        isActive: true,
      },
      update: {
        name: dish.name,
        description: dish.description,
        imageUrl: dish.imageUrl,
        temperature: dish.temperature,
        costCents: dish.cost,
        minimumOrderQuantity: dish.minimum,
        stationId: stationIds[dish.station]!,
        isActive: true,
      },
    });
    for (const allergen of dish.allergens) {
      await client.dishAllergen.upsert({
        where: {
          dishId_allergenId: {
            dishId: dishIds[dish.key]!,
            allergenId: allergenIds[allergen]!,
          },
        },
        create: {
          dishId: dishIds[dish.key]!,
          allergenId: allergenIds[allergen]!,
        },
        update: {},
      });
    }
    for (const tag of dish.tags) {
      await client.dishDietaryTag.upsert({
        where: {
          dishId_dietaryTagId: {
            dishId: dishIds[dish.key]!,
            dietaryTagId: tagIds[tag]!,
          },
        },
        create: { dishId: dishIds[dish.key]!, dietaryTagId: tagIds[tag]! },
        update: {},
      });
    }
  }

  for (const group of optionGroupSeeds) {
    await client.optionGroup.upsert({
      where: { id: groupIds[group.key]! },
      create: {
        id: groupIds[group.key]!,
        dishId: dishIds[group.dish]!,
        name: group.name,
        isRequired: group.required,
        usesPortions: group.portions,
        displayOrder: group.order,
      },
      update: {
        dishId: dishIds[group.dish]!,
        name: group.name,
        isRequired: group.required,
        usesPortions: group.portions,
        displayOrder: group.order,
      },
    });
    for (const [index, optionKey] of group.options.entries()) {
      await client.optionGroupOption.upsert({
        where: {
          optionGroupId_optionId: {
            optionGroupId: groupIds[group.key]!,
            optionId: optionIds[optionKey]!,
          },
        },
        create: {
          optionGroupId: groupIds[group.key]!,
          optionId: optionIds[optionKey]!,
          displayOrder: index + 1,
        },
        update: { displayOrder: index + 1 },
      });
    }
    for (const [index, portionKey] of group.portionKeys.entries()) {
      const extraChargeCents = portionKey === 'large' ? 1500 : 0;
      await client.optionGroupPortion.upsert({
        where: {
          optionGroupId_portionSizeId: {
            optionGroupId: groupIds[group.key]!,
            portionSizeId: portionIds[portionKey]!,
          },
        },
        create: {
          optionGroupId: groupIds[group.key]!,
          portionSizeId: portionIds[portionKey]!,
          extraChargeCents,
          displayOrder: index + 1,
        },
        update: { extraChargeCents, displayOrder: index + 1 },
      });
    }
  }

  return {
    stationIds,
    packagingIds,
    portionIds,
    allergenIds,
    tagIds,
    optionIds,
    dishIds,
    groupIds,
  };
}

async function seedMenuAndPricing(
  client: PrismaClient,
  ids: Awaited<ReturnType<typeof seedReferenceAndCatalogue>>,
) {
  const categories = menuCategorySeeds;
  const categoryIds = Object.fromEntries(
    categories.map((category) => [
      category.key,
      seedId(`category:${category.key}`),
    ]),
  );
  for (const category of categories) {
    await client.menuCategory.upsert({
      where: { slug: category.slug },
      create: {
        id: categoryIds[category.key]!,
        name: category.name,
        slug: category.slug,
        displayOrder: category.order,
        isActive: true,
        isSecret: category.secret,
      },
      update: {
        name: category.name,
        displayOrder: category.order,
        isActive: true,
        isSecret: category.secret,
      },
    });
    for (const [index, dishKey] of category.dishes.entries()) {
      await client.menuCategoryItem.upsert({
        where: {
          categoryId_dishId: {
            categoryId: categoryIds[category.key]!,
            dishId: ids.dishIds[dishKey]!,
          },
        },
        create: {
          categoryId: categoryIds[category.key]!,
          dishId: ids.dishIds[dishKey]!,
          displayOrder: index + 1,
          isActive: true,
        },
        update: { displayOrder: index + 1, isActive: true },
      });
    }
  }

  const tierIds = {
    standard: seedId('tier:standard'),
    enterprise: seedId('tier:enterprise'),
    partner: seedId('tier:partner'),
  };
  await client.priceTier.upsert({
    where: { name: 'Standard' },
    create: {
      id: tierIds.standard,
      name: 'Standard',
      isDefault: true,
      strategy: PriceTierStrategy.MANUAL,
      isActive: true,
    },
    update: {
      isDefault: true,
      strategy: PriceTierStrategy.MANUAL,
      sourceTierId: null,
      costMultiplierBps: null,
      sourceAdjustmentBps: null,
      isActive: true,
    },
  });
  await client.priceTier.upsert({
    where: { name: 'Enterprise' },
    create: {
      id: tierIds.enterprise,
      name: 'Enterprise',
      isDefault: false,
      strategy: PriceTierStrategy.TIER_PERCENTAGE,
      sourceTierId: tierIds.standard,
      sourceAdjustmentBps: ENTERPRISE_SOURCE_ADJUSTMENT_BPS,
      isActive: true,
    },
    update: {
      isDefault: false,
      strategy: PriceTierStrategy.TIER_PERCENTAGE,
      sourceTierId: tierIds.standard,
      sourceAdjustmentBps: ENTERPRISE_SOURCE_ADJUSTMENT_BPS,
      costMultiplierBps: null,
      isActive: true,
    },
  });
  await client.priceTier.upsert({
    where: { name: 'Partner' },
    create: {
      id: tierIds.partner,
      name: 'Partner',
      isDefault: false,
      strategy: PriceTierStrategy.COST_MULTIPLIER,
      costMultiplierBps: PARTNER_COST_MULTIPLIER_BPS,
      isActive: true,
    },
    update: {
      isDefault: false,
      strategy: PriceTierStrategy.COST_MULTIPLIER,
      sourceTierId: null,
      sourceAdjustmentBps: null,
      costMultiplierBps: PARTNER_COST_MULTIPLIER_BPS,
      isActive: true,
    },
  });

  for (const [dishKey, priceCents] of Object.entries(standardDishPrices)) {
    await client.dishTierPrice.upsert({
      where: {
        dishId_priceTierId: {
          dishId: ids.dishIds[dishKey]!,
          priceTierId: tierIds.standard,
        },
      },
      create: {
        dishId: ids.dishIds[dishKey]!,
        priceTierId: tierIds.standard,
        priceCents,
      },
      update: { priceCents },
    });
  }
  for (const [optionKey, priceCents] of Object.entries(standardOptionPrices)) {
    await client.optionTierPrice.upsert({
      where: {
        optionId_priceTierId: {
          optionId: ids.optionIds[optionKey]!,
          priceTierId: tierIds.standard,
        },
      },
      create: {
        optionId: ids.optionIds[optionKey]!,
        priceTierId: tierIds.standard,
        priceCents,
      },
      update: { priceCents },
    });
  }
  const dishOverrides = [
    ...Object.entries(enterpriseDishOverrides).map(([dish, priceCents]) => ({ dish, tier: tierIds.enterprise, priceCents })),
    ...Object.entries(partnerDishOverrides).map(([dish, priceCents]) => ({ dish, tier: tierIds.partner, priceCents })),
  ];
  for (const { dish, tier, priceCents } of dishOverrides) {
    await client.dishTierPrice.upsert({
      where: { dishId_priceTierId: { dishId: ids.dishIds[dish]!, priceTierId: tier } },
      create: { dishId: ids.dishIds[dish]!, priceTierId: tier, priceCents },
      update: { priceCents },
    });
  }
  for (const [option, priceCents] of Object.entries(enterpriseOptionOverrides)) {
    await client.optionTierPrice.upsert({
      where: { optionId_priceTierId: { optionId: ids.optionIds[option]!, priceTierId: tierIds.enterprise } },
      create: { optionId: ids.optionIds[option]!, priceTierId: tierIds.enterprise, priceCents },
      update: { priceCents },
    });
  }

  return { categoryIds, tierIds };
}

async function seedCompaniesAndEmployees(
  client: PrismaClient,
  today: PlainDate,
  catalogue: Awaited<ReturnType<typeof seedReferenceAndCatalogue>>,
  menuPricing: Awaited<ReturnType<typeof seedMenuAndPricing>>,
) {
  const companyIds = Object.fromEntries(
    companySeeds.map((company) => [company.key, seedId(`company:${company.key}`)]),
  );
  const addressIds = Object.fromEntries(addressSeeds.map((address) => [address.key, address.id]));
  const employeeIds = Object.fromEntries(
    employeeSeeds.map((employee) => [employee.key, seedId(`employee:${employee.key}`)]),
  );
  const driver = await client.staffUser.findUniqueOrThrow({
    where: { email: 'driver@test.com' },
  });

  for (const company of companySeeds) {
    const data = {
      name: company.name,
      billingContactName: company.billingName,
      billingContactEmail: company.billingEmail,
      billingContactPhone: company.phone,
      priceTierId: company.tier ? menuPricing.tierIds[company.tier] : null,
      defaultDeliveryTime: timeOnly(company.hour, company.minute),
      deliveryLeadMinutes: company.lead,
      defaultPackagingTypeId: catalogue.packagingIds[company.packaging]!,
      driverInstructions: company.instructions,
      defaultDriverStaffUserId: company.driver ? driver.id : null,
    };
    await client.company.upsert({
      where: { id: companyIds[company.key]! },
      create: { id: companyIds[company.key]!, ...data },
      update: data,
    });
    await client.companyDomain.upsert({
      where: { domain: company.domain },
      create: {
        id: seedId(`domain:${company.domain}`),
        companyId: companyIds[company.key]!,
        domain: company.domain,
      },
      update: { companyId: companyIds[company.key]! },
    });
  }

  for (const address of addressSeeds) {
    const { companyKey, key: _key, ...addressData } = address;
    await client.companyAddress.upsert({
      where: { id: address.id },
      create: { ...addressData, companyId: companyIds[companyKey]!, isActive: true },
      update: { ...addressData, companyId: companyIds[companyKey]!, isActive: true },
    });
  }

  for (const company of companySeeds) {
    await client.companyWorkingDay.deleteMany({
      where: { companyId: companyIds[company.key]! },
    });
    await client.companyWorkingDay.createMany({
      data: companyWorkingDays(company.key).map((value) => ({
        companyId: companyIds[company.key]!,
        dayOfWeek: value,
      })),
    });
  }
  for (const holiday of companyHolidaySeeds) {
    const data = {
      companyId: companyIds[holiday.company]!,
      date: asDateOnly(addDays(today, holiday.offset)),
      name: holiday.name,
    };
    await client.companyHoliday.upsert({
      where: { id: seedId(holiday.id) },
      create: { id: seedId(holiday.id), ...data },
      update: data,
    });
  }

  for (const employee of employeeSeeds) {
    const id = employeeIds[employee.key]!;
    const data = {
      companyId: companyIds[employee.companyKey]!,
      name: employee.name,
      email: employee.email,
      defaultDeliveryAddressId: addressIds[employee.addressKey]!,
      canChooseDeliveryAddress: employee.chooseAddress,
      canChangeDeliveryTime: employee.changeTime,
      canChangePackaging: employee.changePackaging,
    };
    await client.employee.upsert({ where: { id }, create: { id, ...data }, update: data });
    // Preferences are seed-owned: restore exactly the seeded set on every run.
    const allergenIds = employee.allergens.map((name) => catalogue.allergenIds[name]!);
    const tagIds = employee.tags.map((name) => catalogue.tagIds[name]!);
    await client.employeeAllergen.deleteMany({ where: { employeeId: id, allergenId: { notIn: allergenIds } } });
    await client.employeeDietaryTag.deleteMany({ where: { employeeId: id, dietaryTagId: { notIn: tagIds } } });
    for (const allergenId of allergenIds)
      await client.employeeAllergen.upsert({
        where: { employeeId_allergenId: { employeeId: id, allergenId } },
        create: { employeeId: id, allergenId },
        update: {},
      });
    for (const dietaryTagId of tagIds)
      await client.employeeDietaryTag.upsert({
        where: { employeeId_dietaryTagId: { employeeId: id, dietaryTagId } },
        create: { employeeId: id, dietaryTagId },
        update: {},
      });
  }
  for (const company of companySeeds) {
    await client.company.update({
      where: { id: companyIds[company.key]! },
      data: { ownerEmployeeId: employeeIds[`${company.key}-owner`]! },
    });
  }

  for (const row of hiddenMenuSeeds) {
    const companyId = companyIds[row.company]!;
    if ('category' in row) {
      const categoryId = menuPricing.categoryIds[row.category]!;
      await client.companyHiddenCategory.upsert({
        where: { companyId_categoryId: { companyId, categoryId } },
        create: { companyId, categoryId },
        update: {},
      });
    } else {
      const dishId = catalogue.dishIds[row.dish]!;
      await client.companyHiddenDish.upsert({
        where: { companyId_dishId: { companyId, dishId } },
        create: { companyId, dishId },
        update: {},
      });
    }
  }

  return { companyIds, addressIds, employeeIds };
}

async function seedSettings(client: PrismaClient, today: PlainDate) {
  const settings = {
    businessTimezone: BUSINESS_TIME_ZONE,
    cutoffTime: timeOnly(CUTOFF_HOUR, 0),
    cutoffWorkingDayCount: CUTOFF_WORKING_DAY_COUNT,
    kitchenReadyBufferMinutes: 30,
    atRiskWindowMinutes: 30,
  };
  await client.platformSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...settings },
    update: settings,
  });
  const kitchenDays = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
  ];
  // Seed-owned calendar: a rerun restores exactly Mon–Fri (the plan's cut-off assumes it).
  await client.kitchenWorkingDay.deleteMany({ where: { dayOfWeek: { notIn: kitchenDays } } });
  for (const value of kitchenDays) {
    await client.kitchenWorkingDay.upsert({
      where: { dayOfWeek: value },
      create: { dayOfWeek: value },
      update: {},
    });
  }
  const holidayDate = addDays(today, KITCHEN_HOLIDAY_OFFSET);
  await client.kitchenHoliday.upsert({
    where: { id: seedId('holiday:kitchen-demo') },
    create: {
      id: seedId('holiday:kitchen-demo'),
      date: asDateOnly(holidayDate),
      name: 'Kitchen maintenance day',
    },
    update: { date: asDateOnly(holidayDate), name: 'Kitchen maintenance day' },
  });
}

// ─── Timestamps ─────────────────────────────────────────────────────────────
// Every lifecycle timestamp is in the past at seed time and in lifecycle order:
// created < placed < confirmed < kitchen started < kitchen ready < dispatch-ready
// < out for delivery < delivered. Early-morning seeds clamp "today" events to now.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function dropTimes(drop: DropPlan, now: number) {
  const scheduled = businessInstant(drop.date, drop.hour, drop.minute).getTime();
  const departed =
    drop.status === DeliveryDropStatus.OUT_FOR_DELIVERY || drop.status === DeliveryDropStatus.DELIVERED;
  return {
    scheduled: new Date(scheduled),
    dispatchReadyAt: new Date(Math.min(scheduled - 60 * MINUTE, now - 60 * MINUTE)),
    outForDeliveryAt: departed ? new Date(Math.min(scheduled - 35 * MINUTE, now - 30 * MINUTE)) : null,
    deliveredAt:
      drop.status === DeliveryDropStatus.DELIVERED
        ? new Date(Math.min(scheduled + (drop.deliveredOffsetMinutes ?? 0) * MINUTE, now - 5 * MINUTE))
        : null,
  };
}

function orderTimes(order: OrderSeed, today: PlainDate, now: number) {
  const deliveryAt = businessInstant(order.date, order.deliveryHour, order.deliveryMinute);
  const delivery = deliveryAt.getTime();
  const createdAt = new Date(Math.min(delivery - 10 * DAY, now - 26 * HOUR));
  const neverPlaced = order.status === OrderStatus.DRAFT || order.draftCancelled;
  const placedAt = neverPlaced ? null : new Date(createdAt.getTime() + 45 * MINUTE);
  const confirmed =
    order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.DELIVERED || order.confirmedThenCancelled;
  const confirmedAt = confirmed ? new Date(Math.min(createdAt.getTime() + DAY, now - 4 * HOUR)) : null;
  const cancelledAt =
    order.status !== OrderStatus.CANCELLED
      ? null
      : order.draftCancelled
        ? cutoffInstant(order.date, today)
        : new Date(delivery - 30 * HOUR);
  const rejectedAt =
    order.status === OrderStatus.REJECTED ? new Date((placedAt ?? createdAt).getTime() + HOUR) : null;
  const kitchenReadyAt =
    order.prepState === 'DONE' ? new Date(Math.min(delivery - 90 * MINUTE, now - 70 * MINUTE)) : null;
  const kitchenStartedAt =
    order.prepState === 'DONE'
      ? new Date(kitchenReadyAt!.getTime() - HOUR)
      : order.prepState === 'STARTED'
        ? new Date(Math.min(delivery - 150 * MINUTE, now - 65 * MINUTE))
        : null;
  return { deliveryAt, createdAt, placedAt, confirmedAt, cancelledAt, rejectedAt, kitchenStartedAt, kitchenReadyAt };
}

async function seedDrops(
  client: PrismaClient,
  drops: DropPlan[],
  companies: Awaited<ReturnType<typeof seedCompaniesAndEmployees>>,
  now: number,
) {
  const driver = await client.staffUser.findUniqueOrThrow({
    where: { email: 'driver@test.com' },
  });
  const addresses = Object.fromEntries(
    (
      await client.companyAddress.findMany({
        where: { id: { in: Object.values(companies.addressIds) } },
      })
    ).map((address) => [address.id, address]),
  );
  const dropIds: Record<string, string> = {};
  for (const drop of drops) {
    dropIds[drop.key] = drop.id;
    const address = addresses[companies.addressIds[drop.addressKey]!]!;
    const times = dropTimes(drop, now);
    const data = {
      companyId: companies.companyIds[drop.companyKey]!,
      scheduledDeliveryAt: times.scheduled,
      addressLabelSnapshot: address.label,
      addressLine1Snapshot: address.line1,
      addressLine2Snapshot: address.line2,
      addressCitySnapshot: address.city,
      addressRegionSnapshot: address.region,
      addressPostalCodeSnapshot: address.postalCode,
      addressCountrySnapshot: address.country,
      status: drop.status,
      driverStaffUserId: drop.assignDriver ? driver.id : null,
      dispatchReadyAt: times.dispatchReadyAt,
      outForDeliveryAt: times.outForDeliveryAt,
      deliveredAt: times.deliveredAt,
      deliveryNote: drop.note,
      // No proof photo: only the real app uploads private Cloudinary assets.
      photoUrl: null,
      createdAt: new Date(times.dispatchReadyAt.getTime() - 2 * HOUR),
    };
    await client.deliveryDrop.upsert({
      where: { id: drop.id },
      create: { id: drop.id, ...data },
      update: data,
    });
  }
  return dropIds;
}

function eventsFor(
  order: OrderSeed,
  times: ReturnType<typeof orderTimes>,
  drop: ReturnType<typeof dropTimes> | null,
) {
  const events: {
    type: OrderEventType;
    at: Date;
    actor: 'admin' | 'kitchen' | 'dispatch' | 'driver' | null;
    message?: string;
  }[] = [
    {
      type: OrderEventType.ORDER_CREATED,
      at: times.createdAt,
      actor: 'admin',
      message: 'Demo order created for employee.',
    },
  ];
  if (times.placedAt)
    events.push({ type: OrderEventType.ORDER_PLACED, at: times.placedAt, actor: 'admin' });
  if (times.confirmedAt)
    events.push({
      type: OrderEventType.ORDER_CONFIRMED,
      at: times.confirmedAt,
      actor: null,
      message: 'Order confirmed at cutoff.',
    });
  if (times.rejectedAt)
    events.push({
      type: OrderEventType.ORDER_REJECTED,
      at: times.rejectedAt,
      actor: 'admin',
      message: order.rejectionReason,
    });
  if (times.cancelledAt)
    events.push({
      type: OrderEventType.ORDER_CANCELLED,
      at: times.cancelledAt,
      actor: order.draftCancelled ? null : 'admin',
      message: order.confirmedThenCancelled
        ? 'Cancelled after confirmation; amount remains billable.'
        : order.draftCancelled
          ? 'Draft cancelled at cutoff.'
          : undefined,
    });
  if (times.kitchenStartedAt)
    events.push({ type: OrderEventType.KITCHEN_STARTED, at: times.kitchenStartedAt, actor: 'kitchen' });
  if (times.kitchenReadyAt)
    events.push({ type: OrderEventType.KITCHEN_READY, at: times.kitchenReadyAt, actor: 'kitchen' });
  if (drop) {
    events.push({ type: OrderEventType.DISPATCH_READY, at: drop.dispatchReadyAt, actor: 'dispatch' });
    if (drop.outForDeliveryAt)
      events.push({ type: OrderEventType.OUT_FOR_DELIVERY, at: drop.outForDeliveryAt, actor: 'dispatch' });
    if (drop.deliveredAt && order.status === OrderStatus.DELIVERED)
      events.push({ type: OrderEventType.DELIVERED, at: drop.deliveredAt, actor: 'driver' });
  }
  return events;
}

async function seedOrders(
  client: PrismaClient,
  today: PlainDate,
  plan: ReturnType<typeof planSeed>,
  catalogue: Awaited<ReturnType<typeof seedReferenceAndCatalogue>>,
  companies: Awaited<ReturnType<typeof seedCompaniesAndEmployees>>,
  dropIds: Record<string, string>,
  now: number,
) {
  const staff = Object.fromEntries(
    (
      await client.staffUser.findMany({
        where: { email: { in: staffSeeds.map((item) => item.email) } },
      })
    ).map((user) => [user.email.split('@')[0]!, user.id]),
  );
  const addresses = Object.fromEntries(
    (
      await client.companyAddress.findMany({
        where: { id: { in: Object.values(companies.addressIds) } },
      })
    ).map((address) => [address.id, address]),
  );
  const packaging = Object.fromEntries(
    (
      await client.packagingType.findMany({
        where: { id: { in: Object.values(catalogue.packagingIds) } },
      })
    ).map((item) => [item.id, item]),
  );
  const dishes = Object.fromEntries(dishSeeds.map((dish) => [dish.key, dish]));
  const groups = Object.fromEntries(
    optionGroupSeeds.map((group) => [group.key, group]),
  );
  const options = Object.fromEntries(
    optionSeeds.map((option) => [option.key, option]),
  );
  const portions = Object.fromEntries(
    portionSeeds.map(([key, name]) => [key, name]),
  );
  const drops = Object.fromEntries(plan.drops.map((drop) => [drop.key, drop]));

  for (const order of plan.orders) {
    const orderId = seedId(`order:${order.number}`);
    const address = addresses[companies.addressIds[order.addressKey]!]!;
    const packagingItem =
      packaging[catalogue.packagingIds[order.packagingKey]!]!;
    const company = companySeeds.find((item) => item.key === order.companyKey)!;
    const times = orderTimes(order, today, now);
    const dropKey = plan.dropOf[order.number];
    const drop = dropKey ? dropTimes(drops[dropKey]!, now) : null;
    const totalCents = orderTotal(order);
    const orderData = {
      employeeId: companies.employeeIds[order.employeeKey]!,
      companyId: companies.companyIds[order.companyKey]!,
      status: order.status,
      deliveryDate: asDateOnly(order.date),
      deliveryAt: times.deliveryAt,
      deliveryAddressId: address.id,
      deliveryAddressLabelSnapshot: address.label,
      deliveryAddressLine1Snapshot: address.line1,
      deliveryAddressLine2Snapshot: address.line2,
      deliveryAddressCitySnapshot: address.city,
      deliveryAddressRegionSnapshot: address.region,
      deliveryAddressPostalCodeSnapshot: address.postalCode,
      deliveryAddressCountrySnapshot: address.country,
      packagingTypeId: packagingItem.id,
      packagingNameSnapshot: packagingItem.name,
      deliveryLeadMinutesSnapshot: company.lead,
      subtotalCents: totalCents,
      totalCents,
      billableTotalCents: times.confirmedAt ? totalCents : null,
      placedAt: times.placedAt,
      confirmedAt: times.confirmedAt,
      cancelledAt: times.cancelledAt,
      rejectedAt: times.rejectedAt,
      rejectionReason: order.rejectionReason ?? null,
      kitchenStartedAt: times.kitchenStartedAt,
      kitchenReadyAt: times.kitchenReadyAt,
      deliveryDropId: dropKey ? dropIds[dropKey]! : null,
      createdByStaffUserId: staff.admin!,
      createdAt: times.createdAt,
    };
    await client.order.upsert({
      where: { orderNumber: order.number },
      create: { id: orderId, orderNumber: order.number, ...orderData },
      update: orderData,
    });

    // Expected seed-owned graph; anything else under this Order (e.g. created by
    // reviewers through the app) is pruned below so a rerun restores the seed state.
    const expected = { lines: [] as string[], combinations: [] as string[], options: [] as string[], prepCombinations: [] as string[], events: [] as string[] };
    for (const line of order.lines) {
      const lineId = seedId(`order-line:${order.number}:${line.key}`);
      expected.lines.push(lineId);
      const dish = dishes[line.dishKey]!;
      const lineData = {
        orderId,
        dishId: catalogue.dishIds[line.dishKey]!,
        dishNameSnapshot: dish.name,
        dishSkuSnapshot: dish.sku,
        quantity: line.quantity,
        dishUnitPriceCents: line.dishUnitPriceCents,
        lineTotalCents: lineTotal(line),
        createdAt: times.createdAt,
      };
      await client.orderLine.upsert({
        where: { id: lineId },
        create: { id: lineId, ...lineData },
        update: lineData,
      });
      for (const combination of line.combinations) {
        const combinationId = seedId(
          `combination:${order.number}:${line.key}:${combination.key}`,
        );
        expected.combinations.push(combinationId);
        const selectionTotal = combination.selections.reduce(
          (sum, selection) =>
            sum +
            selection.optionPriceCents +
            (selection.portionExtraCents ?? 0),
          0,
        );
        const unitPriceCents = assertIntegerMoney(
          line.dishUnitPriceCents + selectionTotal,
          'combination unit price',
        );
        const combinationData = {
          orderLineId: lineId,
          quantity: combination.quantity,
          unitPriceCents,
          totalCents: assertIntegerMoney(
            unitPriceCents * combination.quantity,
            'combination total',
          ),
        };
        await client.orderCombination.upsert({
          where: { id: combinationId },
          create: { id: combinationId, ...combinationData },
          update: combinationData,
        });
        for (const selection of combination.selections) {
          const selectionId = seedId(
            `combination-option:${order.number}:${line.key}:${combination.key}:${selection.groupKey}`,
          );
          expected.options.push(selectionId);
          const group = groups[selection.groupKey]!;
          const option = options[selection.optionKey]!;
          const selectionData = {
            combinationId,
            optionGroupId: catalogue.groupIds[selection.groupKey]!,
            optionId: catalogue.optionIds[selection.optionKey]!,
            portionSizeId: selection.portionKey
              ? catalogue.portionIds[selection.portionKey]!
              : null,
            optionGroupNameSnapshot: group.name,
            optionNameSnapshot: option.name,
            portionNameSnapshot: selection.portionKey
              ? portions[selection.portionKey]!
              : null,
            optionPriceCents: selection.optionPriceCents,
            portionExtraCents: selection.portionExtraCents ?? 0,
          };
          await client.orderCombinationOption.upsert({
            where: { id: selectionId },
            create: { id: selectionId, ...selectionData },
            update: selectionData,
          });
        }

        // One PrepUnit per distinct combination (quantity = combination quantity).
        if (order.prepState) {
          expected.prepCombinations.push(combinationId);
          const stationName = stationSeeds.find(
            ([key]) => key === dish.station,
          )![1];
          const startedAt =
            order.prepState === 'NOT_STARTED' ? null : times.kitchenStartedAt;
          const doneAt = order.prepState === 'DONE' ? times.kitchenReadyAt : null;
          const prepData = {
            orderId,
            stationId: catalogue.stationIds[dish.station]!,
            stationNameSnapshot: stationName,
            quantity: combination.quantity,
            startedAt,
            startedByStaffUserId: startedAt ? staff.kitchen! : null,
            doneAt,
            doneByStaffUserId: doneAt ? staff.kitchen! : null,
          };
          await client.prepUnit.upsert({
            where: { combinationId },
            create: {
              id: seedId(`prep:${order.number}:${line.key}:${combination.key}`),
              combinationId,
              createdAt: times.confirmedAt ?? times.createdAt,
              ...prepData,
            },
            update: prepData,
          });
        }
      }
    }

    for (const [index, event] of eventsFor(order, times, drop).entries()) {
      const eventId = seedId(`event:${order.number}:${index}:${event.type}`);
      expected.events.push(eventId);
      const eventData = {
        orderId,
        type: event.type,
        actorStaffUserId: event.actor ? staff[event.actor]! : null,
        occurredAt: event.at,
        message: event.message ?? null,
        metadata: { demo: true, businessDate: dateKey(order.date) },
      };
      await client.orderEvent.upsert({
        where: { id: eventId },
        create: { id: eventId, ...eventData },
        update: eventData,
      });
    }

    // FK-safe pruning of non-seed children: PrepUnits → options → combinations → lines; events.
    await client.prepUnit.deleteMany({ where: { orderId, combinationId: { notIn: expected.prepCombinations } } });
    await client.orderCombinationOption.deleteMany({ where: { combination: { orderLine: { orderId } }, id: { notIn: expected.options } } });
    await client.orderCombination.deleteMany({ where: { orderLine: { orderId }, id: { notIn: expected.combinations } } });
    await client.orderLine.deleteMany({ where: { orderId, id: { notIn: expected.lines } } });
    await client.orderEvent.deleteMany({ where: { orderId, id: { notIn: expected.events } } });
  }
}

async function seedInvoices(
  client: PrismaClient,
  today: PlainDate,
  plan: ReturnType<typeof planSeed>,
) {
  const admin = await client.staffUser.findUniqueOrThrow({
    where: { email: 'admin@test.com' },
  });
  const totals = Object.fromEntries(plan.orders.map((order) => [order.number, orderTotal(order)]));
  for (const invoice of plan.invoices) {
    const invoiceId = seedId(`invoice:${invoice.number}`);
    const orderIds = invoice.orderNumbers.map((number) => seedId(`order:${number}`));
    const createdAt = businessInstant(addDays(today, invoice.createdOffset), 17, 0);
    const paidAt = invoice.paidOffset === null ? null : businessInstant(addDays(today, invoice.paidOffset), 11, 0);
    const data = {
      companyId: seedId(`company:${invoice.companyKey}`),
      status: invoice.status,
      // Invoice total = SUM of the frozen per-order amounts.
      totalCents: invoice.orderNumbers.reduce((sum, number) => sum + totals[number]!, 0),
      createdByStaffUserId: admin.id,
      createdAt,
      paidAt,
      paidByStaffUserId: paidAt ? admin.id : null,
    };
    await client.invoice.upsert({
      where: { invoiceNumber: invoice.number },
      create: { id: invoiceId, invoiceNumber: invoice.number, ...data },
      update: data,
    });
    const existing = await client.invoice.findUniqueOrThrow({ where: { invoiceNumber: invoice.number }, select: { id: true } });
    await client.invoiceOrder.deleteMany({ where: { invoiceId: existing.id, orderId: { notIn: orderIds } } });
    for (const [index, orderId] of orderIds.entries()) {
      const amountCents = totals[invoice.orderNumbers[index]!]!;
      await client.invoiceOrder.upsert({
        where: { orderId },
        create: { invoiceId: existing.id, orderId, amountCents },
        update: { invoiceId: existing.id, amountCents },
      });
    }
  }
}

/**
 * Removes seed-owned rows the current plan no longer produces (an earlier
 * seed's layout, or relative records that moved): DEMO-* invoices and orders
 * (FK-safe, children first) and the now-empty Drops that held DEMO orders.
 * Orders a reviewer put on their own invoice are kept, and reported.
 */
async function pruneStaleSeedRecords(
  client: PrismaClient,
  plan: ReturnType<typeof planSeed>,
  previousDemoDropIds: string[],
) {
  const invoiceNumbers = plan.invoices.map((invoice) => invoice.number);
  const staleInvoices = await client.invoice.findMany({
    where: { invoiceNumber: { startsWith: 'DEMO-', notIn: invoiceNumbers } },
    select: { id: true },
  });
  if (staleInvoices.length) {
    const ids = staleInvoices.map((invoice) => invoice.id);
    await client.invoiceOrder.deleteMany({ where: { invoiceId: { in: ids } } });
    await client.invoice.deleteMany({ where: { id: { in: ids } } });
  }

  const staleOrders = await client.order.findMany({
    where: { orderNumber: { startsWith: 'DEMO-', notIn: plan.orders.map((order) => order.number) } },
    select: { id: true, orderNumber: true, deliveryDropId: true, invoiceOrder: { select: { invoiceId: true } } },
  });
  const kept = staleOrders.filter((order) => order.invoiceOrder);
  for (const order of kept)
    console.warn(`Kept stale ${order.orderNumber}: it is on a non-demo invoice.`);
  const orderIds = staleOrders.filter((order) => !order.invoiceOrder).map((order) => order.id);
  if (orderIds.length) {
    await client.prepUnit.deleteMany({ where: { orderId: { in: orderIds } } });
    await client.orderCombinationOption.deleteMany({ where: { combination: { orderLine: { orderId: { in: orderIds } } } } });
    await client.orderCombination.deleteMany({ where: { orderLine: { orderId: { in: orderIds } } } });
    await client.orderLine.deleteMany({ where: { orderId: { in: orderIds } } });
    await client.orderEvent.deleteMany({ where: { orderId: { in: orderIds } } });
    await client.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  const planned = new Set(plan.drops.map((drop) => drop.id));
  const candidates = [
    ...new Set([...previousDemoDropIds, ...staleOrders.flatMap((order) => (order.deliveryDropId ? [order.deliveryDropId] : []))]),
  ].filter((id) => !planned.has(id));
  const { count: dropsRemoved } = await client.deliveryDrop.deleteMany({
    where: { id: { in: candidates }, orders: { none: {} } },
  });
  return { invoicesRemoved: staleInvoices.length, ordersRemoved: orderIds.length, dropsRemoved };
}

async function main() {
  const today = businessToday();
  const now = Date.now();
  console.log(
    `Seeding demo data for business date ${dateKey(today)} (${BUSINESS_TIME_ZONE})...`,
  );
  const plan = planSeed(today, new Date(now));
  // Drops that held demo orders before this run; any left empty are pruned at the end.
  const previousDemoDropIds = (
    await prisma.order.findMany({
      where: { orderNumber: { startsWith: 'DEMO-' }, deliveryDropId: { not: null } },
      select: { deliveryDropId: true },
      distinct: ['deliveryDropId'],
    })
  ).map((order) => order.deliveryDropId!);

  await seedRbac(prisma);
  const catalogue = await seedReferenceAndCatalogue(prisma);
  const menuPricing = await seedMenuAndPricing(prisma, catalogue);
  const companies = await seedCompaniesAndEmployees(
    prisma,
    today,
    catalogue,
    menuPricing,
  );
  await seedSettings(prisma, today);
  const dropIds = await seedDrops(prisma, plan.drops, companies, now);
  await seedOrders(prisma, today, plan, catalogue, companies, dropIds, now);
  await seedInvoices(prisma, today, plan);
  const pruned = await pruneStaleSeedRecords(prisma, plan, previousDemoDropIds);
  const dates = plan.orders.map((order) => dateKey(order.date)).sort();
  console.log(
    `Demo seed completed: ${staffSeeds.length} staff accounts, ${companySeeds.length} companies, ${employeeSeeds.length} employees, ` +
      `${dishSeeds.length} dishes, ${plan.orders.length} orders (${dates[0]} → ${dates.at(-1)}), ${plan.drops.length} drops, ` +
      `${plan.invoices.length} invoices. Pruned stale demo rows: ${pruned.ordersRemoved} orders, ${pruned.dropsRemoved} drops, ${pruned.invoicesRemoved} invoices.`,
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
