import bcrypt from 'bcryptjs';

import type { PrismaClient } from '../src/generated/prisma/client.js';
import {
  DayOfWeek,
  DeliveryDropStatus,
  InvoiceStatus,
  OrderEventType,
  OrderStatus,
  PriceTierStrategy,
  Temperature,
} from '../src/generated/prisma/enums.js';
import {
  BUSINESS_TIME_ZONE,
  addDays,
  asDateOnly,
  assertIntegerMoney,
  businessInstant,
  businessToday,
  dateKey,
  dayOfWeek,
  createSeedClient,
  seedId,
  timeOnly,
  type PlainDate,
} from './seed-support.js';

const prisma = createSeedClient();
const PASSWORD = 'Test@1234';
const BCRYPT_COST = 12;
const REVIEW_WINDOW_DAYS = 14;

type AddressSeed = {
  id: string;
  companyKey: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
};

type SelectionSeed = {
  groupKey: string;
  optionKey: string;
  portionKey?: string;
  optionPriceCents: number;
  portionExtraCents?: number;
};

type CombinationSeed = {
  key: string;
  quantity: number;
  selections: SelectionSeed[];
};

type LineSeed = {
  key: string;
  dishKey: string;
  quantity: number;
  dishUnitPriceCents: number;
  combinations: CombinationSeed[];
};

type OrderSeed = {
  number: string;
  companyKey: string;
  employeeKey: string;
  addressKey: string;
  packagingKey: string;
  date: PlainDate;
  deliveryHour: number;
  deliveryMinute: number;
  status: OrderStatus;
  lines: LineSeed[];
  dropKey?: string;
  prepState?: 'NOT_STARTED' | 'STARTED' | 'DONE';
  confirmedThenCancelled?: boolean;
  rejectionReason?: string;
};

const permissions = [
  ['staff.manage', 'Manage staff accounts and role assignments'],
  ['catalogue.read', 'View catalogue configuration'],
  ['catalogue.manage', 'Manage dishes, options, menus, and reference data'],
  ['pricing.read', 'View price tiers and resolved prices'],
  ['pricing.manage', 'Manage price tiers and overrides'],
  ['companies.read', 'View companies and delivery configuration'],
  ['companies.manage', 'Manage companies and delivery configuration'],
  ['employees.read', 'View employees and dietary preferences'],
  ['employees.manage', 'Manage employees and preferences'],
  ['orders.read', 'View orders'],
  ['orders.create', 'Create employee orders'],
  ['orders.edit', 'Edit orders before cutoff'],
  ['orders.override', 'Override protected order details'],
  ['kitchen.read', 'View the kitchen board'],
  ['kitchen.update', 'Start and complete preparation work'],
  ['kitchen.force_complete', 'Administratively complete kitchen work'],
  ['dispatch.read', 'View dispatch operations'],
  ['dispatch.update', 'Advance delivery drops'],
  ['dispatch.assign_driver', 'Assign drivers to drops'],
  ['driver.own_drops.read', "View the signed-in driver's drops"],
  ['driver.own_drops.deliver', "Complete the signed-in driver's drops"],
  ['billing.read', 'View invoices and billable orders'],
  ['billing.manage', 'Create and mark invoices paid'],
  ['settings.read', 'View platform settings and calendars'],
  ['settings.manage', 'Manage platform settings and calendars'],
  ['dashboards.read', 'View operational dashboards'],
] as const;

const rolePermissions: Record<string, readonly string[]> = {
  ADMIN: permissions.map(([key]) => key),
  KITCHEN: [
    'catalogue.read',
    'orders.read',
    'kitchen.read',
    'kitchen.update',
    'dashboards.read',
  ],
  DISPATCH: [
    'companies.read',
    'orders.read',
    'kitchen.read',
    'dispatch.read',
    'dispatch.update',
    'dispatch.assign_driver',
    'dashboards.read',
  ],
  DRIVER: ['driver.own_drops.read', 'driver.own_drops.deliver'],
};

const staffSeeds = [
  { key: 'admin', name: 'Demo Admin', email: 'admin@test.com', role: 'ADMIN' },
  {
    key: 'kitchen',
    name: 'Demo Kitchen',
    email: 'kitchen@test.com',
    role: 'KITCHEN',
  },
  {
    key: 'dispatch',
    name: 'Demo Dispatch',
    email: 'dispatch@test.com',
    role: 'DISPATCH',
  },
  {
    key: 'driver',
    name: 'Demo Driver',
    email: 'driver@test.com',
    role: 'DRIVER',
  },
] as const;

const stationSeeds = [
  ['hot', 'Hot Kitchen', 1],
  ['cold', 'Cold Prep', 2],
  ['assembly', 'Assembly', 3],
  ['bakery', 'Bakery', 4],
] as const;

const packagingSeeds = [
  ['standard', 'Standard Box', 1],
  ['eco', 'Eco Box', 2],
  ['premium', 'Premium Box', 3],
] as const;

const portionSeeds = [
  ['regular', 'Regular', 1],
  ['large', 'Large', 2],
] as const;

const allergenSeeds = ['Dairy', 'Gluten', 'Nuts', 'Soy', 'Sesame'] as const;
const dietaryTagSeeds = [
  'Vegetarian',
  'Vegan',
  'Jain',
  'Gluten-Free',
  'High Protein',
] as const;

const optionSeeds = [
  {
    key: 'paneer',
    name: 'Paneer',
    cost: 9000,
    allergens: ['Dairy'],
    tags: ['Vegetarian', 'High Protein'],
  },
  {
    key: 'tofu',
    name: 'Tofu',
    cost: 7500,
    allergens: ['Soy'],
    tags: ['Vegan', 'High Protein'],
  },
  {
    key: 'chickpeas',
    name: 'Chickpeas',
    cost: 5000,
    allergens: [],
    tags: ['Vegan', 'Jain', 'High Protein'],
  },
  {
    key: 'brown-rice',
    name: 'Brown Rice',
    cost: 3500,
    allergens: [],
    tags: ['Vegan', 'Gluten-Free'],
  },
  {
    key: 'jeera-rice',
    name: 'Jeera Rice',
    cost: 3000,
    allergens: [],
    tags: ['Vegetarian', 'Gluten-Free'],
  },
  {
    key: 'raita',
    name: 'Raita',
    cost: 2500,
    allergens: ['Dairy'],
    tags: ['Vegetarian', 'Gluten-Free'],
  },
  {
    key: 'mint-chutney',
    name: 'Mint Chutney',
    cost: 1200,
    allergens: [],
    tags: ['Vegan', 'Gluten-Free'],
  },
  {
    key: 'greek-yogurt',
    name: 'Greek Yogurt',
    cost: 4200,
    allergens: ['Dairy'],
    tags: ['Vegetarian', 'High Protein'],
  },
  {
    key: 'coconut-yogurt',
    name: 'Coconut Yogurt',
    cost: 4800,
    allergens: ['Nuts'],
    tags: ['Vegan', 'Gluten-Free'],
  },
] as const;

const dishSeeds = [
  {
    key: 'paneer-bowl',
    name: 'Paneer Tikka Rice Bowl',
    sku: 'BWL-PTR-001',
    description:
      'Charred paneer tikka, seasonal vegetables, and fragrant rice.',
    imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554',
    temperature: Temperature.HOT,
    cost: 14500,
    minimum: null,
    station: 'hot',
    allergens: ['Dairy'],
    tags: ['Vegetarian', 'High Protein'],
  },
  {
    key: 'tofu-bowl',
    name: 'Tofu Teriyaki Bowl',
    sku: 'BWL-TTR-002',
    description: 'Glazed tofu, greens, sesame, and steamed rice.',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
    temperature: Temperature.HOT,
    cost: 13200,
    minimum: null,
    station: 'hot',
    allergens: ['Soy', 'Sesame'],
    tags: ['Vegan', 'High Protein'],
  },
  {
    key: 'jain-bowl',
    name: 'Chickpea Jain Bowl',
    sku: 'BWL-CJN-003',
    description: 'Jain-style chickpeas, millet, cucumber, and herb dressing.',
    imageUrl: 'https://images.unsplash.com/photo-1543362906-acfc16c67564',
    temperature: Temperature.COLD,
    cost: 11800,
    minimum: null,
    station: 'cold',
    allergens: [],
    tags: ['Vegan', 'Jain', 'Gluten-Free'],
  },
  {
    key: 'custom-bowl',
    name: 'Build-Your-Own Rice Bowl',
    sku: 'BWL-BYO-004',
    description:
      'A customizable team lunch bowl with protein, rice, and add-ons.',
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19',
    temperature: Temperature.HOT,
    cost: 10500,
    minimum: 5,
    station: 'assembly',
    allergens: [],
    tags: ['Vegetarian'],
  },
  {
    key: 'poha',
    name: 'Masala Poha',
    sku: 'BRK-MPH-001',
    description: 'Flattened rice with peanuts, curry leaves, and fresh lime.',
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950',
    temperature: Temperature.HOT,
    cost: 6200,
    minimum: null,
    station: 'hot',
    allergens: ['Nuts'],
    tags: ['Vegan', 'Gluten-Free'],
  },
  {
    key: 'breakfast-wrap',
    name: 'Paneer Breakfast Wrap',
    sku: 'BRK-PWR-002',
    description: 'Spiced paneer, peppers, and mint chutney in a soft wrap.',
    imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f',
    temperature: Temperature.HOT,
    cost: 9800,
    minimum: null,
    station: 'assembly',
    allergens: ['Dairy', 'Gluten'],
    tags: ['Vegetarian', 'High Protein'],
  },
  {
    key: 'brownie',
    name: 'Chocolate Brownie',
    sku: 'DST-CBR-001',
    description: 'Dense dark chocolate brownie with toasted walnut crumb.',
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c',
    temperature: Temperature.COLD,
    cost: 5200,
    minimum: null,
    station: 'bakery',
    allergens: ['Dairy', 'Gluten', 'Nuts'],
    tags: ['Vegetarian'],
  },
  {
    key: 'fruit-yogurt',
    name: 'Fruit & Yogurt Cup',
    sku: 'DST-FYC-002',
    description: 'Seasonal fruit, yogurt, toasted seeds, and date syrup.',
    imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777',
    temperature: Temperature.COLD,
    cost: 6800,
    minimum: null,
    station: 'cold',
    allergens: ['Dairy'],
    tags: ['Vegetarian', 'Gluten-Free'],
  },
  {
    key: 'millet-bowl',
    name: "Chef's Special Millet Bowl",
    sku: 'SEC-MIL-001',
    description:
      'Roasted vegetables, foxtail millet, and sesame-citrus dressing.',
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061',
    temperature: Temperature.HOT,
    cost: 13800,
    minimum: null,
    station: 'hot',
    allergens: ['Sesame'],
    tags: ['Vegan', 'Gluten-Free'],
  },
] as const;

const standardDishPrices: Record<string, number> = {
  'paneer-bowl': 28900,
  'tofu-bowl': 26900,
  'jain-bowl': 24900,
  'custom-bowl': 21900,
  poha: 13900,
  'breakfast-wrap': 20900,
  brownie: 11900,
  'fruit-yogurt': 14900,
  'millet-bowl': 27900,
};

const standardOptionPrices: Record<string, number> = {
  paneer: 7000,
  tofu: 6000,
  chickpeas: 4000,
  'brown-rice': 2500,
  'jeera-rice': 2000,
  raita: 3500,
  'mint-chutney': 1500,
  'greek-yogurt': 3000,
  'coconut-yogurt': 4000,
};

const companySeeds = [
  {
    key: 'acme',
    name: 'Acme Technologies',
    domain: 'acmetech.example',
    billingName: 'Ritika Sharma',
    billingEmail: 'billing@acmetech.example',
    phone: '+91 80 4000 1200',
    tier: null,
    packaging: 'eco',
    hour: 13,
    minute: 0,
    lead: 60,
    driver: true,
    instructions: 'Use the service entrance and call reception on arrival.',
  },
  {
    key: 'bluepeak',
    name: 'BluePeak Finance',
    domain: 'bluepeak.example',
    billingName: 'Maya Iyer',
    billingEmail: 'accounts@bluepeak.example',
    phone: '+91 22 4100 8800',
    tier: 'enterprise',
    packaging: 'premium',
    hour: 12,
    minute: 30,
    lead: 75,
    driver: false,
    instructions: 'Security requires the delivery manifest at the lobby desk.',
  },
  {
    key: 'northstar',
    name: 'Northstar Labs',
    domain: 'northstarlabs.example',
    billingName: 'Arjun Rao',
    billingEmail: 'finance@northstarlabs.example',
    phone: null,
    tier: 'partner',
    packaging: 'standard',
    hour: 13,
    minute: 30,
    lead: 60,
    driver: false,
    instructions: 'Deliver to the second-floor pantry.',
  },
] as const;

const addressSeeds: readonly AddressSeed[] = [
  {
    id: seedId('address:acme-hq'),
    companyKey: 'acme',
    label: 'Acme HQ',
    line1: '12 Innovation Park',
    line2: 'Outer Ring Road',
    city: 'Bengaluru',
    region: 'Karnataka',
    postalCode: '560103',
    country: 'India',
  },
  {
    id: seedId('address:acme-annex'),
    companyKey: 'acme',
    label: 'Acme Annex',
    line1: '44 Residency Road',
    line2: null,
    city: 'Bengaluru',
    region: 'Karnataka',
    postalCode: '560025',
    country: 'India',
  },
  {
    id: seedId('address:bluepeak'),
    companyKey: 'bluepeak',
    label: 'BluePeak Tower',
    line1: '8 Bandra Kurla Complex',
    line2: 'Bandra East',
    city: 'Mumbai',
    region: 'Maharashtra',
    postalCode: '400051',
    country: 'India',
  },
  {
    id: seedId('address:northstar'),
    companyKey: 'northstar',
    label: 'Northstar Campus',
    line1: '21 Genome Valley Road',
    line2: null,
    city: 'Hyderabad',
    region: 'Telangana',
    postalCode: '500078',
    country: 'India',
  },
];

const employeeSeeds = [
  [
    'acme-owner',
    'acme',
    'Nisha Menon',
    'nisha@acmetech.example',
    'acme-hq',
    true,
    true,
    true,
    ['Nuts'],
    ['Vegetarian'],
  ],
  [
    'acme-2',
    'acme',
    'Kabir Shah',
    'kabir@acmetech.example',
    'acme-hq',
    false,
    false,
    false,
    ['Dairy'],
    ['Vegan'],
  ],
  [
    'acme-3',
    'acme',
    'Leena Joseph',
    'leena@acmetech.example',
    'acme-annex',
    true,
    false,
    true,
    [],
    ['Gluten-Free'],
  ],
  [
    'acme-4',
    'acme',
    'Dev Patel',
    null,
    'acme-hq',
    false,
    true,
    false,
    ['Soy'],
    ['High Protein'],
  ],
  [
    'bluepeak-owner',
    'bluepeak',
    'Maya Iyer',
    'maya@bluepeak.example',
    'bluepeak',
    true,
    true,
    true,
    ['Gluten'],
    ['Vegetarian'],
  ],
  [
    'bluepeak-2',
    'bluepeak',
    'Rohan Mehta',
    'rohan@bluepeak.example',
    'bluepeak',
    false,
    false,
    false,
    [],
    ['High Protein'],
  ],
  [
    'bluepeak-3',
    'bluepeak',
    "Sara D'Souza",
    'sara@bluepeak.example',
    'bluepeak',
    true,
    false,
    false,
    ['Sesame'],
    ['Gluten-Free'],
  ],
  [
    'bluepeak-4',
    'bluepeak',
    'Vikram Sethi',
    null,
    'bluepeak',
    false,
    true,
    true,
    [],
    ['Vegetarian'],
  ],
  [
    'northstar-owner',
    'northstar',
    'Arjun Rao',
    'arjun@northstarlabs.example',
    'northstar',
    true,
    true,
    true,
    [],
    ['Vegan'],
  ],
  [
    'northstar-2',
    'northstar',
    'Farah Khan',
    'farah@northstarlabs.example',
    'northstar',
    false,
    false,
    false,
    ['Nuts'],
    ['Jain'],
  ],
  [
    'northstar-3',
    'northstar',
    'Neil Thomas',
    'neil@northstarlabs.example',
    'northstar',
    true,
    false,
    true,
    ['Dairy'],
    ['Vegan'],
  ],
  [
    'northstar-4',
    'northstar',
    'Isha Gupta',
    null,
    'northstar',
    false,
    true,
    false,
    [],
    ['Gluten-Free'],
  ],
] as const;

const optionGroupSeeds = [
  {
    key: 'custom-protein',
    dish: 'custom-bowl',
    name: 'Choose Protein',
    required: true,
    portions: true,
    order: 1,
    options: ['paneer', 'tofu', 'chickpeas'],
    portionKeys: ['regular', 'large'],
  },
  {
    key: 'custom-rice',
    dish: 'custom-bowl',
    name: 'Choose Rice',
    required: true,
    portions: false,
    order: 2,
    options: ['brown-rice', 'jeera-rice'],
    portionKeys: [],
  },
  {
    key: 'custom-addons',
    dish: 'custom-bowl',
    name: 'Add-ons',
    required: false,
    portions: false,
    order: 3,
    options: ['raita', 'mint-chutney'],
    portionKeys: [],
  },
  {
    key: 'paneer-rice',
    dish: 'paneer-bowl',
    name: 'Choose Rice',
    required: true,
    portions: false,
    order: 1,
    options: ['brown-rice', 'jeera-rice'],
    portionKeys: [],
  },
  {
    key: 'tofu-rice',
    dish: 'tofu-bowl',
    name: 'Choose Rice',
    required: true,
    portions: false,
    order: 1,
    options: ['brown-rice', 'jeera-rice'],
    portionKeys: [],
  },
  {
    key: 'yogurt-choice',
    dish: 'fruit-yogurt',
    name: 'Choose Yogurt',
    required: true,
    portions: false,
    order: 1,
    options: ['greek-yogurt', 'coconut-yogurt'],
    portionKeys: [],
  },
] as const;

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
  const categories = [
    {
      key: 'bowls',
      name: 'Bowls',
      slug: 'bowls',
      order: 1,
      secret: false,
      dishes: ['paneer-bowl', 'tofu-bowl', 'jain-bowl', 'custom-bowl'],
    },
    {
      key: 'breakfast',
      name: 'Breakfast',
      slug: 'breakfast',
      order: 2,
      secret: false,
      dishes: ['poha', 'breakfast-wrap'],
    },
    {
      key: 'desserts',
      name: 'Desserts',
      slug: 'desserts',
      order: 3,
      secret: false,
      dishes: ['brownie', 'fruit-yogurt'],
    },
    {
      key: 'chefs-table',
      name: "Chef's Table",
      slug: 'chefs-table',
      order: 4,
      secret: true,
      dishes: ['millet-bowl'],
    },
  ] as const;
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
      sourceAdjustmentBps: 1500,
      isActive: true,
    },
    update: {
      isDefault: false,
      strategy: PriceTierStrategy.TIER_PERCENTAGE,
      sourceTierId: tierIds.standard,
      sourceAdjustmentBps: 1500,
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
      costMultiplierBps: 22000,
      isActive: true,
    },
    update: {
      isDefault: false,
      strategy: PriceTierStrategy.COST_MULTIPLIER,
      sourceTierId: null,
      sourceAdjustmentBps: null,
      costMultiplierBps: 22000,
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
  const enterpriseOverrides = { 'custom-bowl': 22900, brownie: 12500 } as const;
  for (const [dishKey, priceCents] of Object.entries(enterpriseOverrides)) {
    await client.dishTierPrice.upsert({
      where: {
        dishId_priceTierId: {
          dishId: ids.dishIds[dishKey]!,
          priceTierId: tierIds.enterprise,
        },
      },
      create: {
        dishId: ids.dishIds[dishKey]!,
        priceTierId: tierIds.enterprise,
        priceCents,
      },
      update: { priceCents },
    });
  }
  await client.optionTierPrice.upsert({
    where: {
      optionId_priceTierId: {
        optionId: ids.optionIds.raita!,
        priceTierId: tierIds.enterprise,
      },
    },
    create: {
      optionId: ids.optionIds.raita!,
      priceTierId: tierIds.enterprise,
      priceCents: 3000,
    },
    update: { priceCents: 3000 },
  });
  await client.dishTierPrice.upsert({
    where: {
      dishId_priceTierId: {
        dishId: ids.dishIds['paneer-bowl']!,
        priceTierId: tierIds.partner,
      },
    },
    create: {
      dishId: ids.dishIds['paneer-bowl']!,
      priceTierId: tierIds.partner,
      priceCents: 30900,
    },
    update: { priceCents: 30900 },
  });

  return { categoryIds, tierIds };
}

async function seedCompaniesAndEmployees(
  client: PrismaClient,
  today: PlainDate,
  catalogue: Awaited<ReturnType<typeof seedReferenceAndCatalogue>>,
  menuPricing: Awaited<ReturnType<typeof seedMenuAndPricing>>,
) {
  const companyIds = Object.fromEntries(
    companySeeds.map((company) => [
      company.key,
      seedId(`company:${company.key}`),
    ]),
  );
  const addressIds = Object.fromEntries(
    addressSeeds.map((address) => [
      address.label.includes('Annex')
        ? 'acme-annex'
        : address.companyKey === 'acme'
          ? 'acme-hq'
          : address.companyKey,
      address.id,
    ]),
  );
  const employeeIds = Object.fromEntries(
    employeeSeeds.map(([key]) => [key, seedId(`employee:${key}`)]),
  );
  const driver = await client.staffUser.findUniqueOrThrow({
    where: { email: 'driver@test.com' },
  });

  for (const company of companySeeds) {
    await client.company.upsert({
      where: { id: companyIds[company.key]! },
      create: {
        id: companyIds[company.key]!,
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
      },
      update: {
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
      },
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
    const { companyKey, ...addressData } = address;
    await client.companyAddress.upsert({
      where: { id: address.id },
      create: {
        ...addressData,
        companyId: companyIds[companyKey]!,
        isActive: true,
      },
      update: {
        companyId: companyIds[companyKey]!,
        label: address.label,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        region: address.region,
        postalCode: address.postalCode,
        country: address.country,
        isActive: true,
      },
    });
  }

  const weekdays = Object.values(DayOfWeek);
  for (const company of companySeeds) {
    const expectedDays =
      company.key === 'acme' ? weekdays : weekdays.slice(0, 5);
    await client.companyWorkingDay.deleteMany({
      where: { companyId: companyIds[company.key]! },
    });
    await client.companyWorkingDay.createMany({
      data: expectedDays.map((value) => ({
        companyId: companyIds[company.key]!,
        dayOfWeek: value,
      })),
    });
  }
  const bluepeakHoliday = addDays(today, 14);
  await client.companyHoliday.upsert({
    where: { id: seedId('holiday:bluepeak-demo') },
    create: {
      id: seedId('holiday:bluepeak-demo'),
      companyId: companyIds.bluepeak!,
      date: asDateOnly(bluepeakHoliday),
      name: 'Company Foundation Day',
    },
    update: {
      companyId: companyIds.bluepeak!,
      date: asDateOnly(bluepeakHoliday),
      name: 'Company Foundation Day',
    },
  });

  for (const employee of employeeSeeds) {
    const [
      key,
      companyKey,
      name,
      email,
      addressKey,
      chooseAddress,
      changeTime,
      changePackaging,
      allergens,
      tags,
    ] = employee;
    await client.employee.upsert({
      where: { id: employeeIds[key]! },
      create: {
        id: employeeIds[key]!,
        companyId: companyIds[companyKey]!,
        name,
        email,
        defaultDeliveryAddressId: addressIds[addressKey]!,
        canChooseDeliveryAddress: chooseAddress,
        canChangeDeliveryTime: changeTime,
        canChangePackaging: changePackaging,
      },
      update: {
        companyId: companyIds[companyKey]!,
        name,
        email,
        defaultDeliveryAddressId: addressIds[addressKey]!,
        canChooseDeliveryAddress: chooseAddress,
        canChangeDeliveryTime: changeTime,
        canChangePackaging: changePackaging,
      },
    });
    for (const allergen of allergens) {
      await client.employeeAllergen.upsert({
        where: {
          employeeId_allergenId: {
            employeeId: employeeIds[key]!,
            allergenId: catalogue.allergenIds[allergen]!,
          },
        },
        create: {
          employeeId: employeeIds[key]!,
          allergenId: catalogue.allergenIds[allergen]!,
        },
        update: {},
      });
    }
    for (const tag of tags) {
      await client.employeeDietaryTag.upsert({
        where: {
          employeeId_dietaryTagId: {
            employeeId: employeeIds[key]!,
            dietaryTagId: catalogue.tagIds[tag]!,
          },
        },
        create: {
          employeeId: employeeIds[key]!,
          dietaryTagId: catalogue.tagIds[tag]!,
        },
        update: {},
      });
    }
  }
  for (const company of companySeeds) {
    await client.company.update({
      where: { id: companyIds[company.key]! },
      data: { ownerEmployeeId: employeeIds[`${company.key}-owner`]! },
    });
  }

  await client.companyHiddenCategory.upsert({
    where: {
      companyId_categoryId: {
        companyId: companyIds.bluepeak!,
        categoryId: menuPricing.categoryIds.desserts!,
      },
    },
    create: {
      companyId: companyIds.bluepeak!,
      categoryId: menuPricing.categoryIds.desserts!,
    },
    update: {},
  });
  await client.companyHiddenDish.upsert({
    where: {
      companyId_dishId: {
        companyId: companyIds.northstar!,
        dishId: catalogue.dishIds['paneer-bowl']!,
      },
    },
    create: {
      companyId: companyIds.northstar!,
      dishId: catalogue.dishIds['paneer-bowl']!,
    },
    update: {},
  });

  return { companyIds, addressIds, employeeIds };
}

async function seedSettings(client: PrismaClient, today: PlainDate) {
  await client.platformSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      businessTimezone: BUSINESS_TIME_ZONE,
      cutoffTime: timeOnly(16, 0),
      cutoffWorkingDayCount: 2,
      kitchenReadyBufferMinutes: 30,
      atRiskWindowMinutes: 30,
    },
    update: {
      businessTimezone: BUSINESS_TIME_ZONE,
      cutoffTime: timeOnly(16, 0),
      cutoffWorkingDayCount: 2,
      kitchenReadyBufferMinutes: 30,
      atRiskWindowMinutes: 30,
    },
  });
  for (const value of [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
  ]) {
    await client.kitchenWorkingDay.upsert({
      where: { dayOfWeek: value },
      create: { dayOfWeek: value },
      update: {},
    });
  }
  const holidayDate = addDays(today, 21);
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

function singleLine(
  key: string,
  dishKey: string,
  quantity: number,
  dishUnitPriceCents: number,
  selections: SelectionSeed[] = [],
): LineSeed {
  return {
    key,
    dishKey,
    quantity,
    dishUnitPriceCents,
    combinations: [{ key: 'main', quantity, selections }],
  };
}

function shiftToWeekday(date: PlainDate, direction: 1 | -1): PlainDate {
  let candidate = date;
  while (
    dayOfWeek(candidate) === DayOfWeek.SATURDAY ||
    dayOfWeek(candidate) === DayOfWeek.SUNDAY
  ) {
    candidate = addDays(candidate, direction);
  }
  return candidate;
}

function reviewDayKey(dayOffset: number): string {
  return String(dayOffset).padStart(2, '0');
}

function reviewDeliverySlot(today: PlainDate, dayOffset: number) {
  return {
    key: `review-day-${reviewDayKey(dayOffset)}`,
    date: addDays(today, dayOffset),
    hour: 12 + (dayOffset % 3),
    minute: dayOffset % 2 === 0 ? 15 : 45,
  };
}

function orderSeeds(today: PlainDate): OrderSeed[] {
  const rice = (
    groupKey: string,
    optionKey: 'brown-rice' | 'jeera-rice',
  ): SelectionSeed => ({
    groupKey,
    optionKey,
    optionPriceCents: standardOptionPrices[optionKey]!,
  });
  const future1 = addDays(today, 1);
  const future2 = shiftToWeekday(addDays(today, 3), 1);
  const future3 = shiftToWeekday(addDays(today, 6), 1);
  const bluepeakPast = shiftToWeekday(addDays(today, -4), -1);
  const northstarPast = shiftToWeekday(addDays(today, -2), -1);
  const baseOrders: OrderSeed[] = [
    {
      number: 'DEMO-PAST-DEL-001',
      companyKey: 'acme',
      employeeKey: 'acme-owner',
      addressKey: 'acme-hq',
      packagingKey: 'eco',
      date: addDays(today, -7),
      deliveryHour: 13,
      deliveryMinute: 0,
      status: OrderStatus.DELIVERED,
      lines: [
        singleLine(
          'paneer',
          'paneer-bowl',
          3,
          standardDishPrices['paneer-bowl']!,
          [rice('paneer-rice', 'brown-rice')],
        ),
      ],
      dropKey: 'past-grouped',
      prepState: 'DONE',
    },
    {
      number: 'DEMO-PAST-DEL-002',
      companyKey: 'acme',
      employeeKey: 'acme-2',
      addressKey: 'acme-hq',
      packagingKey: 'eco',
      date: addDays(today, -7),
      deliveryHour: 13,
      deliveryMinute: 0,
      status: OrderStatus.DELIVERED,
      lines: [
        singleLine('tofu', 'tofu-bowl', 2, standardDishPrices['tofu-bowl']!, [
          rice('tofu-rice', 'jeera-rice'),
        ]),
      ],
      dropKey: 'past-grouped',
      prepState: 'DONE',
    },
    {
      number: 'DEMO-PAST-CAN-001',
      companyKey: 'bluepeak',
      employeeKey: 'bluepeak-owner',
      addressKey: 'bluepeak',
      packagingKey: 'premium',
      date: bluepeakPast,
      deliveryHour: 12,
      deliveryMinute: 30,
      status: OrderStatus.CANCELLED,
      confirmedThenCancelled: true,
      lines: [
        singleLine(
          'wrap',
          'breakfast-wrap',
          4,
          standardDishPrices['breakfast-wrap']!,
        ),
      ],
    },
    {
      number: 'DEMO-PAST-REJ-001',
      companyKey: 'northstar',
      employeeKey: 'northstar-2',
      addressKey: 'northstar',
      packagingKey: 'standard',
      date: northstarPast,
      deliveryHour: 13,
      deliveryMinute: 30,
      status: OrderStatus.REJECTED,
      rejectionReason: 'Requested delivery time could not be fulfilled.',
      lines: [
        singleLine('jain', 'jain-bowl', 2, standardDishPrices['jain-bowl']!),
      ],
    },
    {
      number: 'DEMO-TODAY-CONF-001',
      companyKey: 'acme',
      employeeKey: 'acme-3',
      addressKey: 'acme-hq',
      packagingKey: 'eco',
      date: today,
      deliveryHour: 13,
      deliveryMinute: 0,
      status: OrderStatus.CONFIRMED,
      prepState: 'STARTED',
      lines: [
        {
          key: 'custom-ten',
          dishKey: 'custom-bowl',
          quantity: 10,
          dishUnitPriceCents: standardDishPrices['custom-bowl']!,
          combinations: [
            {
              key: 'paneer-six',
              quantity: 6,
              selections: [
                {
                  groupKey: 'custom-protein',
                  optionKey: 'paneer',
                  portionKey: 'regular',
                  optionPriceCents: standardOptionPrices.paneer!,
                  portionExtraCents: 0,
                },
                {
                  groupKey: 'custom-rice',
                  optionKey: 'brown-rice',
                  optionPriceCents: standardOptionPrices['brown-rice']!,
                },
              ],
            },
            {
              key: 'tofu-four',
              quantity: 4,
              selections: [
                {
                  groupKey: 'custom-protein',
                  optionKey: 'tofu',
                  portionKey: 'large',
                  optionPriceCents: standardOptionPrices.tofu!,
                  portionExtraCents: 1500,
                },
                {
                  groupKey: 'custom-rice',
                  optionKey: 'jeera-rice',
                  optionPriceCents: standardOptionPrices['jeera-rice']!,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      number: 'DEMO-TODAY-CONF-002',
      companyKey: 'acme',
      employeeKey: 'acme-4',
      addressKey: 'acme-annex',
      packagingKey: 'standard',
      date: today,
      deliveryHour: 14,
      deliveryMinute: 0,
      status: OrderStatus.CONFIRMED,
      lines: [singleLine('poha', 'poha', 5, standardDishPrices.poha!)],
      prepState: 'NOT_STARTED',
    },
    {
      number: 'DEMO-TODAY-DSP-001',
      companyKey: 'acme',
      employeeKey: 'acme-owner',
      addressKey: 'acme-hq',
      packagingKey: 'eco',
      date: today,
      deliveryHour: 15,
      deliveryMinute: 0,
      status: OrderStatus.CONFIRMED,
      lines: [
        singleLine(
          'paneer',
          'paneer-bowl',
          2,
          standardDishPrices['paneer-bowl']!,
          [rice('paneer-rice', 'jeera-rice')],
        ),
      ],
      dropKey: 'today-grouped',
      prepState: 'DONE',
    },
    {
      number: 'DEMO-TODAY-DSP-002',
      companyKey: 'acme',
      employeeKey: 'acme-2',
      addressKey: 'acme-hq',
      packagingKey: 'eco',
      date: today,
      deliveryHour: 15,
      deliveryMinute: 0,
      status: OrderStatus.CONFIRMED,
      lines: [singleLine('brownie', 'brownie', 6, standardDishPrices.brownie!)],
      dropKey: 'today-grouped',
      prepState: 'DONE',
    },
    {
      number: 'DEMO-TODAY-OUT-001',
      companyKey: 'acme',
      employeeKey: 'acme-3',
      addressKey: 'acme-annex',
      packagingKey: 'premium',
      date: today,
      deliveryHour: 16,
      deliveryMinute: 0,
      status: OrderStatus.CONFIRMED,
      lines: [
        singleLine(
          'fruit',
          'fruit-yogurt',
          4,
          standardDishPrices['fruit-yogurt']!,
          [
            {
              groupKey: 'yogurt-choice',
              optionKey: 'greek-yogurt',
              optionPriceCents: standardOptionPrices['greek-yogurt']!,
            },
          ],
        ),
      ],
      dropKey: 'today-out',
      prepState: 'DONE',
    },
    {
      number: 'DEMO-TODAY-DEL-001',
      companyKey: 'acme',
      employeeKey: 'acme-4',
      addressKey: 'acme-hq',
      packagingKey: 'eco',
      date: today,
      deliveryHour: 11,
      deliveryMinute: 30,
      status: OrderStatus.DELIVERED,
      lines: [
        singleLine(
          'wrap',
          'breakfast-wrap',
          3,
          standardDishPrices['breakfast-wrap']!,
        ),
      ],
      dropKey: 'today-delivered',
      prepState: 'DONE',
    },
    {
      number: 'DEMO-FUT-DRAFT-001',
      companyKey: 'acme',
      employeeKey: 'acme-owner',
      addressKey: 'acme-hq',
      packagingKey: 'eco',
      date: future1,
      deliveryHour: 13,
      deliveryMinute: 0,
      status: OrderStatus.DRAFT,
      lines: [
        singleLine('jain', 'jain-bowl', 2, standardDishPrices['jain-bowl']!),
      ],
    },
    {
      number: 'DEMO-FUT-DRAFT-002',
      companyKey: 'bluepeak',
      employeeKey: 'bluepeak-2',
      addressKey: 'bluepeak',
      packagingKey: 'premium',
      date: future2,
      deliveryHour: 12,
      deliveryMinute: 30,
      status: OrderStatus.DRAFT,
      lines: [singleLine('poha', 'poha', 4, standardDishPrices.poha!)],
    },
    {
      number: 'DEMO-FUT-PLACED-001',
      companyKey: 'acme',
      employeeKey: 'acme-2',
      addressKey: 'acme-annex',
      packagingKey: 'standard',
      date: future2,
      deliveryHour: 14,
      deliveryMinute: 0,
      status: OrderStatus.PLACED,
      lines: [
        singleLine('tofu', 'tofu-bowl', 3, standardDishPrices['tofu-bowl']!, [
          rice('tofu-rice', 'brown-rice'),
        ]),
      ],
    },
    {
      number: 'DEMO-FUT-PLACED-002',
      companyKey: 'northstar',
      employeeKey: 'northstar-3',
      addressKey: 'northstar',
      packagingKey: 'standard',
      date: future3,
      deliveryHour: 13,
      deliveryMinute: 30,
      status: OrderStatus.PLACED,
      lines: [
        singleLine(
          'millet',
          'millet-bowl',
          3,
          standardDishPrices['millet-bowl']!,
        ),
      ],
    },
    {
      number: 'DEMO-FUT-CONF-001',
      companyKey: 'acme',
      employeeKey: 'acme-3',
      addressKey: 'acme-hq',
      packagingKey: 'eco',
      date: future3,
      deliveryHour: 13,
      deliveryMinute: 0,
      status: OrderStatus.CONFIRMED,
      lines: [
        singleLine(
          'paneer',
          'paneer-bowl',
          4,
          standardDishPrices['paneer-bowl']!,
          [rice('paneer-rice', 'brown-rice')],
        ),
      ],
      prepState: 'NOT_STARTED',
    },
    {
      number: 'DEMO-FUT-CONF-002',
      companyKey: 'bluepeak',
      employeeKey: 'bluepeak-4',
      addressKey: 'bluepeak',
      packagingKey: 'premium',
      date: future3,
      deliveryHour: 12,
      deliveryMinute: 30,
      status: OrderStatus.CONFIRMED,
      lines: [singleLine('brownie', 'brownie', 5, standardDishPrices.brownie!)],
      prepState: 'NOT_STARTED',
    },
  ];

  const reviewEmployees = ['acme-owner', 'acme-2', 'acme-3', 'acme-4'];
  const reviewOrders: OrderSeed[] = Array.from(
    { length: REVIEW_WINDOW_DAYS },
    (_, index) => {
      const dayOffset = index + 1;
      const slot = reviewDeliverySlot(today, dayOffset);
      const quantity = 2 + (dayOffset % 4);
      const dishVariant = dayOffset % 7;
      let line: LineSeed;

      if (dishVariant === 0) {
        line = singleLine(
          'paneer-bowl',
          'paneer-bowl',
          quantity,
          standardDishPrices['paneer-bowl']!,
          [rice('paneer-rice', 'brown-rice')],
        );
      } else if (dishVariant === 1) {
        line = singleLine(
          'tofu-bowl',
          'tofu-bowl',
          quantity,
          standardDishPrices['tofu-bowl']!,
          [rice('tofu-rice', 'jeera-rice')],
        );
      } else if (dishVariant === 2) {
        line = singleLine(
          'jain-bowl',
          'jain-bowl',
          quantity,
          standardDishPrices['jain-bowl']!,
        );
      } else if (dishVariant === 3) {
        line = singleLine('poha', 'poha', quantity, standardDishPrices.poha!);
      } else if (dishVariant === 4) {
        line = singleLine(
          'breakfast-wrap',
          'breakfast-wrap',
          quantity,
          standardDishPrices['breakfast-wrap']!,
        );
      } else if (dishVariant === 5) {
        line = singleLine(
          'brownie',
          'brownie',
          quantity,
          standardDishPrices.brownie!,
        );
      } else {
        line = singleLine(
          'fruit-yogurt',
          'fruit-yogurt',
          quantity,
          standardDishPrices['fruit-yogurt']!,
          [
            {
              groupKey: 'yogurt-choice',
              optionKey:
                dayOffset % 2 === 0 ? 'greek-yogurt' : 'coconut-yogurt',
              optionPriceCents:
                dayOffset % 2 === 0
                  ? standardOptionPrices['greek-yogurt']!
                  : standardOptionPrices['coconut-yogurt']!,
            },
          ],
        );
      }

      const useAnnex = dayOffset % 4 === 0;
      return {
        number: `DEMO-WINDOW-${reviewDayKey(dayOffset)}`,
        companyKey: 'acme',
        employeeKey: reviewEmployees[index % reviewEmployees.length]!,
        addressKey: useAnnex ? 'acme-annex' : 'acme-hq',
        packagingKey: useAnnex ? 'standard' : 'eco',
        date: slot.date,
        deliveryHour: slot.hour,
        deliveryMinute: slot.minute,
        status: OrderStatus.CONFIRMED,
        lines: [line],
        dropKey: slot.key,
        prepState: 'DONE',
      };
    },
  );

  return [...baseOrders, ...reviewOrders];
}

function lineTotal(line: LineSeed): number {
  const combinationQuantity = line.combinations.reduce(
    (sum, combination) => sum + combination.quantity,
    0,
  );
  if (combinationQuantity !== line.quantity)
    throw new Error(
      `${line.key}: combination quantities do not match line quantity.`,
    );
  return line.combinations.reduce((sum, combination) => {
    const additions = combination.selections.reduce(
      (price, selection) =>
        price + selection.optionPriceCents + (selection.portionExtraCents ?? 0),
      0,
    );
    return sum + (line.dishUnitPriceCents + additions) * combination.quantity;
  }, 0);
}

async function seedDrops(
  client: PrismaClient,
  today: PlainDate,
  companies: Awaited<ReturnType<typeof seedCompaniesAndEmployees>>,
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
  const fixedDefinitions = [
    {
      key: 'past-grouped',
      company: 'acme',
      address: 'acme-hq',
      date: addDays(today, -7),
      hour: 13,
      minute: 0,
      status: DeliveryDropStatus.DELIVERED,
      deliveredOffset: -15,
      note: 'Delivered to reception; signed by security.',
      photo: 'https://images.unsplash.com/photo-1580674285054-bed31e145f59',
    },
    {
      key: 'today-grouped',
      company: 'acme',
      address: 'acme-hq',
      date: today,
      hour: 15,
      minute: 0,
      status: DeliveryDropStatus.DISPATCH_READY,
      deliveredOffset: null,
      note: null,
      photo: null,
    },
    {
      key: 'today-out',
      company: 'acme',
      address: 'acme-annex',
      date: today,
      hour: 16,
      minute: 0,
      status: DeliveryDropStatus.OUT_FOR_DELIVERY,
      deliveredOffset: null,
      note: null,
      photo: null,
    },
    {
      key: 'today-delivered',
      company: 'acme',
      address: 'acme-hq',
      date: today,
      hour: 11,
      minute: 30,
      status: DeliveryDropStatus.DELIVERED,
      deliveredOffset: 12,
      note: 'Handed to the facilities coordinator.',
      photo: 'https://images.unsplash.com/photo-1617347454431-f49d7ff5c3b1',
    },
  ] as const;
  const reviewDefinitions = Array.from(
    { length: REVIEW_WINDOW_DAYS },
    (_, index) => {
      const slot = reviewDeliverySlot(today, index + 1);
      return {
        ...slot,
        company: 'acme',
        address: (index + 1) % 4 === 0 ? 'acme-annex' : 'acme-hq',
        status: DeliveryDropStatus.DISPATCH_READY,
        deliveredOffset: null,
        note: null,
        photo: null,
      };
    },
  );
  const definitions = [...fixedDefinitions, ...reviewDefinitions];
  const dropIds: Record<string, string> = {};
  for (const drop of definitions) {
    const id = seedId(`drop:${drop.key}`);
    dropIds[drop.key] = id;
    const address = addresses[companies.addressIds[drop.address]!]!;
    const scheduled = businessInstant(drop.date, drop.hour, drop.minute);
    const dispatchReadyAt = new Date(
      Math.min(scheduled.getTime() - 60 * 60_000, Date.now() - 60_000),
    );
    const createdAt = new Date(dispatchReadyAt.getTime() - 2 * 60 * 60_000);
    const outForDeliveryAt =
      drop.status === DeliveryDropStatus.OUT_FOR_DELIVERY ||
      drop.status === DeliveryDropStatus.DELIVERED
        ? new Date(scheduled.getTime() - 35 * 60_000)
        : null;
    const deliveredAt =
      drop.deliveredOffset === null
        ? null
        : new Date(scheduled.getTime() + drop.deliveredOffset * 60_000);
    const data = {
      companyId: companies.companyIds[drop.company]!,
      scheduledDeliveryAt: scheduled,
      addressLabelSnapshot: address.label,
      addressLine1Snapshot: address.line1,
      addressLine2Snapshot: address.line2,
      addressCitySnapshot: address.city,
      addressRegionSnapshot: address.region,
      addressPostalCodeSnapshot: address.postalCode,
      addressCountrySnapshot: address.country,
      status: drop.status,
      driverStaffUserId: driver.id,
      dispatchReadyAt,
      outForDeliveryAt,
      deliveredAt,
      deliveryNote: drop.note,
      photoUrl: drop.photo,
      createdAt,
    };
    await client.deliveryDrop.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }
  return dropIds;
}

function eventsFor(
  order: OrderSeed,
  createdAt: Date,
  placedAt: Date | null,
  confirmedAt: Date | null,
  cancelledAt: Date | null,
  rejectedAt: Date | null,
  kitchenStartedAt: Date | null,
  kitchenReadyAt: Date | null,
  deliveryAt: Date,
) {
  const events: {
    type: OrderEventType;
    at: Date;
    actor: 'admin' | 'kitchen' | 'dispatch' | 'driver' | null;
    message?: string;
  }[] = [
    {
      type: OrderEventType.ORDER_CREATED,
      at: createdAt,
      actor: 'admin',
      message: 'Demo order created for employee.',
    },
  ];
  if (placedAt)
    events.push({
      type: OrderEventType.ORDER_PLACED,
      at: placedAt,
      actor: 'admin',
    });
  if (confirmedAt)
    events.push({
      type: OrderEventType.ORDER_CONFIRMED,
      at: confirmedAt,
      actor: null,
      message: 'Order confirmed at cutoff.',
    });
  if (rejectedAt)
    events.push({
      type: OrderEventType.ORDER_REJECTED,
      at: rejectedAt,
      actor: 'admin',
      message: order.rejectionReason,
    });
  if (cancelledAt)
    events.push({
      type: OrderEventType.ORDER_CANCELLED,
      at: cancelledAt,
      actor: 'admin',
      message: order.confirmedThenCancelled
        ? 'Cancelled after confirmation; amount remains billable.'
        : undefined,
    });
  if (kitchenStartedAt)
    events.push({
      type: OrderEventType.KITCHEN_STARTED,
      at: kitchenStartedAt,
      actor: 'kitchen',
    });
  if (kitchenReadyAt)
    events.push({
      type: OrderEventType.KITCHEN_READY,
      at: kitchenReadyAt,
      actor: 'kitchen',
    });
  if (order.dropKey) {
    const dispatchReadyAt = new Date(
      Math.min(deliveryAt.getTime() - 60 * 60_000, Date.now() - 60_000),
    );
    events.push({
      type: OrderEventType.DISPATCH_READY,
      at: dispatchReadyAt,
      actor: 'dispatch',
    });
    if (order.dropKey.includes('out') || order.status === OrderStatus.DELIVERED)
      events.push({
        type: OrderEventType.OUT_FOR_DELIVERY,
        at: new Date(deliveryAt.getTime() - 35 * 60_000),
        actor: 'dispatch',
      });
    if (order.status === OrderStatus.DELIVERED)
      events.push({
        type: OrderEventType.DELIVERED,
        at: new Date(
          deliveryAt.getTime() +
            (order.number.includes('TODAY') ? 12 : -15) * 60_000,
        ),
        actor: 'driver',
      });
  }
  return events;
}

async function seedOrders(
  client: PrismaClient,
  today: PlainDate,
  catalogue: Awaited<ReturnType<typeof seedReferenceAndCatalogue>>,
  companies: Awaited<ReturnType<typeof seedCompaniesAndEmployees>>,
  dropIds: Record<string, string>,
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
  const orders = orderSeeds(today);
  const orderTotals: Record<string, number> = {};

  for (const order of orders) {
    const orderId = seedId(`order:${order.number}`);
    const address = addresses[companies.addressIds[order.addressKey]!]!;
    const packagingItem =
      packaging[catalogue.packagingIds[order.packagingKey]!]!;
    const company = companySeeds.find((item) => item.key === order.companyKey)!;
    const deliveryAt = businessInstant(
      order.date,
      order.deliveryHour,
      order.deliveryMinute,
    );
    const totalCents = order.lines.reduce(
      (sum, line) => sum + lineTotal(line),
      0,
    );
    orderTotals[order.number] = totalCents;
    const createdAt = new Date(
      Math.min(
        deliveryAt.getTime() - 10 * 24 * 60 * 60_000,
        Date.now() - 2 * 60 * 60_000,
      ),
    );
    const placedAt =
      order.status === OrderStatus.DRAFT
        ? null
        : new Date(createdAt.getTime() + 45 * 60_000);
    const confirmedAt =
      order.status === OrderStatus.CONFIRMED ||
      order.status === OrderStatus.DELIVERED ||
      order.confirmedThenCancelled
        ? new Date(
            Math.min(
              createdAt.getTime() + 24 * 60 * 60_000,
              Date.now() - 30 * 60_000,
            ),
          )
        : null;
    const cancelledAt =
      order.status === OrderStatus.CANCELLED
        ? new Date(deliveryAt.getTime() - 30 * 60 * 60_000)
        : null;
    const rejectedAt =
      order.status === OrderStatus.REJECTED
        ? new Date((placedAt ?? createdAt).getTime() + 60 * 60_000)
        : null;
    const kitchenReadyAt =
      order.prepState === 'DONE'
        ? new Date(
            Math.min(
              deliveryAt.getTime() - 90 * 60_000,
              Date.now() - 5 * 60_000,
            ),
          )
        : null;
    const kitchenStartedAt =
      order.prepState === 'STARTED' || order.prepState === 'DONE'
        ? new Date(
            kitchenReadyAt
              ? kitchenReadyAt.getTime() - 60 * 60_000
              : Math.min(
                  deliveryAt.getTime() - 150 * 60_000,
                  Date.now() - 65 * 60_000,
                ),
          )
        : null;
    const billable = confirmedAt ? totalCents : null;
    const orderData = {
      employeeId: companies.employeeIds[order.employeeKey]!,
      companyId: companies.companyIds[order.companyKey]!,
      status: order.status,
      deliveryDate: asDateOnly(order.date),
      deliveryAt,
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
      billableTotalCents: billable,
      placedAt,
      confirmedAt,
      cancelledAt,
      rejectedAt,
      rejectionReason: order.rejectionReason ?? null,
      kitchenStartedAt,
      kitchenReadyAt,
      deliveryDropId: order.dropKey ? dropIds[order.dropKey]! : null,
      createdByStaffUserId: staff.admin!,
      createdAt,
    };
    await client.order.upsert({
      where: { orderNumber: order.number },
      create: { id: orderId, orderNumber: order.number, ...orderData },
      update: orderData,
    });

    for (const line of order.lines) {
      const lineId = seedId(`order-line:${order.number}:${line.key}`);
      const dish = dishes[line.dishKey]!;
      const calculatedLineTotal = lineTotal(line);
      await client.orderLine.upsert({
        where: { id: lineId },
        create: {
          id: lineId,
          orderId,
          dishId: catalogue.dishIds[line.dishKey]!,
          dishNameSnapshot: dish.name,
          dishSkuSnapshot: dish.sku,
          quantity: line.quantity,
          dishUnitPriceCents: line.dishUnitPriceCents,
          lineTotalCents: calculatedLineTotal,
          createdAt,
        },
        update: {
          orderId,
          dishId: catalogue.dishIds[line.dishKey]!,
          dishNameSnapshot: dish.name,
          dishSkuSnapshot: dish.sku,
          quantity: line.quantity,
          dishUnitPriceCents: line.dishUnitPriceCents,
          lineTotalCents: calculatedLineTotal,
          createdAt,
        },
      });
      for (const combination of line.combinations) {
        const combinationId = seedId(
          `combination:${order.number}:${line.key}:${combination.key}`,
        );
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
        const combinationTotal = assertIntegerMoney(
          unitPriceCents * combination.quantity,
          'combination total',
        );
        await client.orderCombination.upsert({
          where: { id: combinationId },
          create: {
            id: combinationId,
            orderLineId: lineId,
            quantity: combination.quantity,
            unitPriceCents,
            totalCents: combinationTotal,
          },
          update: {
            orderLineId: lineId,
            quantity: combination.quantity,
            unitPriceCents,
            totalCents: combinationTotal,
          },
        });
        for (const selection of combination.selections) {
          const selectionId = seedId(
            `combination-option:${order.number}:${line.key}:${combination.key}:${selection.groupKey}`,
          );
          const group = groups[selection.groupKey]!;
          const option = options[selection.optionKey]!;
          await client.orderCombinationOption.upsert({
            where: { id: selectionId },
            create: {
              id: selectionId,
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
            },
            update: {
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
            },
          });
        }

        if (order.prepState) {
          const dishStationId = catalogue.stationIds[dish.station]!;
          const stationName = stationSeeds.find(
            ([key]) => key === dish.station,
          )![1];
          const prepId = seedId(
            `prep:${order.number}:${line.key}:${combination.key}`,
          );
          const startedAt =
            order.prepState === 'NOT_STARTED' ? null : kitchenStartedAt;
          const doneAt = order.prepState === 'DONE' ? kitchenReadyAt : null;
          await client.prepUnit.upsert({
            where: { combinationId },
            create: {
              id: prepId,
              orderId,
              combinationId,
              stationId: dishStationId,
              stationNameSnapshot: stationName,
              quantity: combination.quantity,
              startedAt,
              startedByStaffUserId: startedAt ? staff.kitchen! : null,
              doneAt,
              doneByStaffUserId: doneAt ? staff.kitchen! : null,
              createdAt: confirmedAt ?? createdAt,
            },
            update: {
              orderId,
              stationId: dishStationId,
              stationNameSnapshot: stationName,
              quantity: combination.quantity,
              startedAt,
              startedByStaffUserId: startedAt ? staff.kitchen! : null,
              doneAt,
              doneByStaffUserId: doneAt ? staff.kitchen! : null,
            },
          });
        }
      }
    }

    const events = eventsFor(
      order,
      createdAt,
      placedAt,
      confirmedAt,
      cancelledAt,
      rejectedAt,
      kitchenStartedAt,
      kitchenReadyAt,
      deliveryAt,
    );
    for (const [index, event] of events.entries()) {
      const eventId = seedId(`event:${order.number}:${index}:${event.type}`);
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
  }
  return { orders, orderTotals };
}

async function seedInvoices(
  client: PrismaClient,
  today: PlainDate,
  orderTotals: Record<string, number>,
) {
  const admin = await client.staffUser.findUniqueOrThrow({
    where: { email: 'admin@test.com' },
  });
  const companies = Object.fromEntries(
    companySeeds.map((company) => [
      company.key,
      seedId(`company:${company.key}`),
    ]),
  );
  const definitions = [
    {
      number: 'DEMO-INV-PAID-001',
      company: 'acme',
      status: InvoiceStatus.PAID,
      orders: ['DEMO-PAST-DEL-001', 'DEMO-PAST-DEL-002'],
    },
    {
      number: 'DEMO-INV-UNPAID-001',
      company: 'acme',
      status: InvoiceStatus.UNPAID,
      orders: ['DEMO-TODAY-DEL-001'],
    },
  ] as const;
  for (const invoice of definitions) {
    const invoiceId = seedId(`invoice:${invoice.number}`);
    const totalCents = invoice.orders.reduce(
      (sum, orderNumber) => sum + orderTotals[orderNumber]!,
      0,
    );
    const createdAt =
      invoice.status === InvoiceStatus.PAID
        ? businessInstant(addDays(today, -6), 9, 30)
        : businessInstant(today, 9, 30);
    const paidAt =
      invoice.status === InvoiceStatus.PAID
        ? businessInstant(addDays(today, -5), 10, 0)
        : null;
    await client.invoice.upsert({
      where: { invoiceNumber: invoice.number },
      create: {
        id: invoiceId,
        invoiceNumber: invoice.number,
        companyId: companies[invoice.company]!,
        status: invoice.status,
        totalCents,
        createdByStaffUserId: admin.id,
        createdAt,
        paidAt,
        paidByStaffUserId: paidAt ? admin.id : null,
      },
      update: {
        companyId: companies[invoice.company]!,
        status: invoice.status,
        totalCents,
        createdByStaffUserId: admin.id,
        createdAt,
        paidAt,
        paidByStaffUserId: paidAt ? admin.id : null,
      },
    });
    for (const orderNumber of invoice.orders) {
      const orderId = seedId(`order:${orderNumber}`);
      await client.invoiceOrder.upsert({
        where: { orderId },
        create: { invoiceId, orderId, amountCents: orderTotals[orderNumber]! },
        update: { invoiceId, amountCents: orderTotals[orderNumber]! },
      });
    }
  }
}

async function main() {
  const today = businessToday();
  console.log(
    `Seeding demo data for business date ${dateKey(today)} (${BUSINESS_TIME_ZONE})...`,
  );
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
  const dropIds = await seedDrops(prisma, today, companies);
  const { orderTotals } = await seedOrders(
    prisma,
    today,
    catalogue,
    companies,
    dropIds,
  );
  await seedInvoices(prisma, today, orderTotals);
  console.log(
    'Demo seed completed: 4 staff accounts, 3 companies, 9 dishes, 30 orders, 18 drops, and 2 invoices.',
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
