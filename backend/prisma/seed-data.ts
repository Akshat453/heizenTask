/**
 * Pure demo-seed data and planning (no database access): catalogue, companies,
 * employees and the date-relative order/drop/invoice plan. seed.ts writes it;
 * verify-seed.ts and simulations can import it without touching a database.
 */
import {
  DayOfWeek,
  DeliveryDropStatus,
  InvoiceStatus,
  OrderStatus,
  Temperature,
} from '../src/generated/prisma/enums.js';
import {
  addDays,
  businessInstant,
  compareDates,
  dateKey,
  dayOfWeek,
  scaledPrice,
  seedId,
  type PlainDate,
} from './seed-support.js';

export const REVIEW_WINDOW_DAYS = 28;
export const HISTORY_DAYS = 7;
export type AddressSeed = {
  key: string;
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

export type SelectionSeed = {
  groupKey: string;
  optionKey: string;
  portionKey?: string;
  optionPriceCents: number;
  portionExtraCents?: number;
};

export type CombinationSeed = {
  key: string;
  quantity: number;
  selections: SelectionSeed[];
};

export type LineSeed = {
  key: string;
  dishKey: string;
  quantity: number;
  dishUnitPriceCents: number;
  combinations: CombinationSeed[];
};

export type PrepState = 'NOT_STARTED' | 'STARTED' | 'DONE';

export type OrderSeed = {
  number: string;
  companyKey: string;
  employeeKey: string;
  addressKey: string;
  packagingKey: string;
  date: PlainDate;
  /** Days from the seed's business date (negative = history). */
  dayOffset: number;
  deliveryHour: number;
  deliveryMinute: number;
  status: OrderStatus;
  lines: LineSeed[];
  prepState?: PrepState;
  /** A kitchen-ready CONFIRMED order is in a Drop; OUT puts that Drop on the road. */
  dropStage?: 'OUT';
  confirmedThenCancelled?: boolean;
  /** A DRAFT the cut-off cancelled (never placed, never billable). */
  draftCancelled?: boolean;
  rejectionReason?: string;
};

export const permissions = [
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

export const rolePermissions: Record<string, readonly string[]> = {
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

export const staffSeeds = [
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

export const stationSeeds = [
  ['hot', 'Hot Kitchen', 1],
  ['cold', 'Cold Prep', 2],
  ['assembly', 'Assembly', 3],
  ['bakery', 'Bakery', 4],
] as const;

export const packagingSeeds = [
  ['standard', 'Standard Box', 1],
  ['eco', 'Eco Box', 2],
  ['premium', 'Premium Box', 3],
] as const;

export const portionSeeds = [
  ['regular', 'Regular', 1],
  ['large', 'Large', 2],
] as const;

export const allergenSeeds = ['Dairy', 'Gluten', 'Nuts', 'Soy', 'Sesame'] as const;
export const dietaryTagSeeds = [
  'Vegetarian',
  'Vegan',
  'Jain',
  'Gluten-Free',
  'High Protein',
] as const;

export const optionSeeds = [
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

export const dishSeeds = [
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

export const standardDishPrices: Record<string, number> = {
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

export const standardOptionPrices: Record<string, number> = {
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

export type CompanyCalendar = 'ALL' | 'MON_SAT' | 'WEEKDAYS';

/**
 * Fictional customer companies. Calendars, tiers, default drivers and menu hiding
 * vary on purpose so every admin screen has something to show. Acme and
 * Greenfield deliver every day, so today's scenario works on any weekday.
 */
export const companySeeds = [
  { key: 'acme', name: 'Acme Technologies', domain: 'acmetech.example', billingName: 'Ritika Sharma', billingEmail: 'billing@acmetech.example', phone: '+91 80 4000 1200', tier: null, packaging: 'eco', hour: 13, minute: 0, lead: 60, driver: true, calendar: 'ALL', instructions: 'Use the service entrance and call reception on arrival.' },
  { key: 'bluepeak', name: 'BluePeak Finance', domain: 'bluepeak.example', billingName: 'Maya Iyer', billingEmail: 'accounts@bluepeak.example', phone: '+91 22 4100 8800', tier: 'enterprise', packaging: 'premium', hour: 12, minute: 30, lead: 75, driver: false, calendar: 'WEEKDAYS', instructions: 'Security requires the delivery manifest at the lobby desk.' },
  { key: 'northstar', name: 'Northstar Labs', domain: 'northstarlabs.example', billingName: 'Arjun Rao', billingEmail: 'finance@northstarlabs.example', phone: null, tier: 'partner', packaging: 'standard', hour: 13, minute: 30, lead: 60, driver: false, calendar: 'WEEKDAYS', instructions: 'Deliver to the second-floor pantry.' },
  { key: 'vertex', name: 'Vertex Consulting', domain: 'vertexconsulting.example', billingName: 'Pooja Kulkarni', billingEmail: 'ap@vertexconsulting.example', phone: '+91 20 6700 2100', tier: null, packaging: 'standard', hour: 12, minute: 30, lead: 45, driver: true, calendar: 'WEEKDAYS', instructions: 'Ask for the office manager at the 4th-floor front desk.' },
  { key: 'greenfield', name: 'Greenfield Health', domain: 'greenfieldhealth.example', billingName: 'Dr. Anand Krishnan', billingEmail: 'payables@greenfieldhealth.example', phone: '+91 44 2810 4400', tier: 'enterprise', packaging: 'eco', hour: 12, minute: 0, lead: 60, driver: false, calendar: 'ALL', instructions: 'Hospital site: use the staff entrance, never the emergency bay.' },
  { key: 'orbit', name: 'Orbit Systems', domain: 'orbitsystems.example', billingName: 'Karan Malhotra', billingEmail: 'finance@orbitsystems.example', phone: '+91 120 455 9000', tier: null, packaging: 'standard', hour: 13, minute: 15, lead: 90, driver: true, calendar: 'MON_SAT', instructions: 'Gate 2 security needs the driver name in advance.' },
  { key: 'crestline', name: 'Crestline Legal', domain: 'crestlinelegal.example', billingName: 'Meera Bhatia', billingEmail: 'accounts@crestlinelegal.example', phone: '+91 11 4300 7700', tier: 'partner', packaging: 'premium', hour: 13, minute: 0, lead: 60, driver: true, calendar: 'WEEKDAYS', instructions: 'Leave with the chambers clerk; do not enter meeting rooms.' },
  { key: 'summit', name: 'Summit Analytics', domain: 'summitanalytics.example', billingName: 'Rahul Verma', billingEmail: 'billing@summitanalytics.example', phone: '+91 124 488 3300', tier: null, packaging: 'eco', hour: 12, minute: 45, lead: 75, driver: true, calendar: 'WEEKDAYS', instructions: 'Deliver to the cafeteria counter on the ground floor.' },
] as const satisfies readonly {
  key: string; name: string; domain: string; billingName: string; billingEmail: string; phone: string | null;
  tier: 'enterprise' | 'partner' | null; packaging: 'standard' | 'eco' | 'premium'; hour: number; minute: number;
  lead: number; driver: boolean; calendar: CompanyCalendar; instructions: string;
}[];

export type CompanyKey = (typeof companySeeds)[number]['key'];

export function companySeed(key: string) {
  const company = companySeeds.find((item) => item.key === key);
  if (!company) throw new Error(`Unknown seed company ${key}.`);
  return company;
}

const CALENDAR_DAYS: Record<CompanyCalendar, readonly DayOfWeek[]> = {
  ALL: Object.values(DayOfWeek),
  MON_SAT: Object.values(DayOfWeek).filter((day) => day !== DayOfWeek.SUNDAY),
  WEEKDAYS: Object.values(DayOfWeek).filter((day) => day !== DayOfWeek.SATURDAY && day !== DayOfWeek.SUNDAY),
};

export function companyWorkingDays(key: string): readonly DayOfWeek[] {
  return CALENDAR_DAYS[companySeed(key).calendar];
}

/** Company delivery holidays, relative to the seed's business date. */
export const companyHolidaySeeds = [
  { id: 'holiday:bluepeak-demo', company: 'bluepeak', offset: 14, name: 'Company Foundation Day' },
  { id: 'holiday:crestline-demo', company: 'crestline', offset: 9, name: 'Firm offsite' },
] as const;

/** Kitchen holiday (affects cut-off counting only), relative to the seed date. */
export const KITCHEN_HOLIDAY_OFFSET = 21;

export function deliversOn(companyKey: string, date: PlainDate, today: PlainDate): boolean {
  if (!companyWorkingDays(companyKey).includes(dayOfWeek(date))) return false;
  return !companyHolidaySeeds.some(
    (holiday) => holiday.company === companyKey && dateKey(addDays(today, holiday.offset)) === dateKey(date),
  );
}

/** Menu hiding per company: a hidden category or a single hidden dish. */
export const hiddenMenuSeeds = [
  { company: 'bluepeak', category: 'desserts' },
  { company: 'crestline', category: 'breakfast' },
  { company: 'northstar', dish: 'paneer-bowl' },
  { company: 'greenfield', dish: 'brownie' },
] as const satisfies readonly ({ company: string; category: string } | { company: string; dish: string })[];

export const addressSeeds: readonly AddressSeed[] = [
  { key: 'acme-hq', id: seedId('address:acme-hq'), companyKey: 'acme', label: 'Acme HQ', line1: '12 Innovation Park', line2: 'Outer Ring Road', city: 'Bengaluru', region: 'Karnataka', postalCode: '560103', country: 'India' },
  { key: 'acme-annex', id: seedId('address:acme-annex'), companyKey: 'acme', label: 'Acme Annex', line1: '44 Residency Road', line2: null, city: 'Bengaluru', region: 'Karnataka', postalCode: '560025', country: 'India' },
  { key: 'bluepeak', id: seedId('address:bluepeak'), companyKey: 'bluepeak', label: 'BluePeak Tower', line1: '8 Bandra Kurla Complex', line2: 'Bandra East', city: 'Mumbai', region: 'Maharashtra', postalCode: '400051', country: 'India' },
  { key: 'northstar', id: seedId('address:northstar'), companyKey: 'northstar', label: 'Northstar Campus', line1: '21 Genome Valley Road', line2: null, city: 'Hyderabad', region: 'Telangana', postalCode: '500078', country: 'India' },
  { key: 'vertex-office', id: seedId('address:vertex-office'), companyKey: 'vertex', label: 'Vertex Pune Office', line1: '5 Senapati Bapat Road', line2: 'Tower B', city: 'Pune', region: 'Maharashtra', postalCode: '411016', country: 'India' },
  { key: 'vertex-client', id: seedId('address:vertex-client'), companyKey: 'vertex', label: 'Vertex Client Centre', line1: '18 Koregaon Park Lane 7', line2: null, city: 'Pune', region: 'Maharashtra', postalCode: '411001', country: 'India' },
  { key: 'greenfield-main', id: seedId('address:greenfield-main'), companyKey: 'greenfield', label: 'Greenfield Main Hospital', line1: '90 Anna Salai', line2: 'Staff Block', city: 'Chennai', region: 'Tamil Nadu', postalCode: '600002', country: 'India' },
  { key: 'greenfield-opd', id: seedId('address:greenfield-opd'), companyKey: 'greenfield', label: 'Greenfield Outpatient Wing', line1: '92 Anna Salai', line2: null, city: 'Chennai', region: 'Tamil Nadu', postalCode: '600002', country: 'India' },
  { key: 'orbit', id: seedId('address:orbit'), companyKey: 'orbit', label: 'Orbit Systems Campus', line1: 'Plot 7, Sector 62', line2: null, city: 'Noida', region: 'Uttar Pradesh', postalCode: '201309', country: 'India' },
  { key: 'crestline', id: seedId('address:crestline'), companyKey: 'crestline', label: 'Crestline Chambers', line1: '3 Barakhamba Road', line2: '11th Floor', city: 'New Delhi', region: 'Delhi', postalCode: '110001', country: 'India' },
  { key: 'summit-hq', id: seedId('address:summit-hq'), companyKey: 'summit', label: 'Summit Analytics HQ', line1: '25 Cyber City', line2: 'DLF Phase 2', city: 'Gurugram', region: 'Haryana', postalCode: '122002', country: 'India' },
  { key: 'summit-lab', id: seedId('address:summit-lab'), companyKey: 'summit', label: 'Summit Data Lab', line1: '9 Golf Course Road', line2: null, city: 'Gurugram', region: 'Haryana', postalCode: '122011', country: 'India' },
];

export type EmployeeSeed = {
  key: string; companyKey: string; name: string; email: string | null; addressKey: string;
  chooseAddress: boolean; changeTime: boolean; changePackaging: boolean;
  allergens: readonly string[]; tags: readonly string[];
};

/** The original twelve employees (keys and ids unchanged). */
const coreEmployees: EmployeeSeed[] = [
  { key: 'acme-owner', companyKey: 'acme', name: 'Nisha Menon', email: 'nisha@acmetech.example', addressKey: 'acme-hq', chooseAddress: true, changeTime: true, changePackaging: true, allergens: ['Nuts'], tags: ['Vegetarian'] },
  { key: 'acme-2', companyKey: 'acme', name: 'Kabir Shah', email: 'kabir@acmetech.example', addressKey: 'acme-hq', chooseAddress: false, changeTime: false, changePackaging: false, allergens: ['Dairy'], tags: ['Vegan'] },
  { key: 'acme-3', companyKey: 'acme', name: 'Leena Joseph', email: 'leena@acmetech.example', addressKey: 'acme-annex', chooseAddress: true, changeTime: false, changePackaging: true, allergens: [], tags: ['Gluten-Free'] },
  { key: 'acme-4', companyKey: 'acme', name: 'Dev Patel', email: null, addressKey: 'acme-hq', chooseAddress: false, changeTime: true, changePackaging: false, allergens: ['Soy'], tags: ['High Protein'] },
  { key: 'bluepeak-owner', companyKey: 'bluepeak', name: 'Maya Iyer', email: 'maya@bluepeak.example', addressKey: 'bluepeak', chooseAddress: true, changeTime: true, changePackaging: true, allergens: ['Gluten'], tags: ['Vegetarian'] },
  { key: 'bluepeak-2', companyKey: 'bluepeak', name: 'Rohan Mehta', email: 'rohan@bluepeak.example', addressKey: 'bluepeak', chooseAddress: false, changeTime: false, changePackaging: false, allergens: [], tags: ['High Protein'] },
  { key: 'bluepeak-3', companyKey: 'bluepeak', name: "Sara D'Souza", email: 'sara@bluepeak.example', addressKey: 'bluepeak', chooseAddress: true, changeTime: false, changePackaging: false, allergens: ['Sesame'], tags: ['Gluten-Free'] },
  { key: 'bluepeak-4', companyKey: 'bluepeak', name: 'Vikram Sethi', email: null, addressKey: 'bluepeak', chooseAddress: false, changeTime: true, changePackaging: true, allergens: [], tags: ['Vegetarian'] },
  { key: 'northstar-owner', companyKey: 'northstar', name: 'Arjun Rao', email: 'arjun@northstarlabs.example', addressKey: 'northstar', chooseAddress: true, changeTime: true, changePackaging: true, allergens: [], tags: ['Vegan'] },
  { key: 'northstar-2', companyKey: 'northstar', name: 'Farah Khan', email: 'farah@northstarlabs.example', addressKey: 'northstar', chooseAddress: false, changeTime: false, changePackaging: false, allergens: ['Nuts'], tags: ['Jain'] },
  { key: 'northstar-3', companyKey: 'northstar', name: 'Neil Thomas', email: 'neil@northstarlabs.example', addressKey: 'northstar', chooseAddress: true, changeTime: false, changePackaging: true, allergens: ['Dairy'], tags: ['Vegan'] },
  { key: 'northstar-4', companyKey: 'northstar', name: 'Isha Gupta', email: null, addressKey: 'northstar', chooseAddress: false, changeTime: true, changePackaging: false, allergens: [], tags: ['Gluten-Free'] },
];

/** Additional fictional people per company; the first name of a new company is its owner. */
const extraEmployeeNames: Record<string, readonly string[]> = {
  acme: ['Priya Nair', 'Tarun Bose'],
  bluepeak: ['Ananya Reddy', 'Siddharth Jain'],
  northstar: ['Kavya Pillai', 'Omar Siddiqui'],
  vertex: ['Pooja Kulkarni', 'Aditya Deshmukh', 'Sneha Joshi', 'Rahul Pawar', 'Zara Sheikh', 'Manish Gokhale'],
  greenfield: ['Anand Krishnan', 'Lakshmi Subramanian', 'Ravi Shankar', 'Divya Raman', 'Joseph Mathew', 'Fatima Begum'],
  orbit: ['Karan Malhotra', 'Simran Kaur', 'Varun Arora', 'Neha Saxena', 'Imran Qureshi', 'Ritu Agarwal'],
  crestline: ['Meera Bhatia', 'Harsh Vardhan', 'Tanya Kapoor', 'Nikhil Chawla', 'Ayesha Rizvi'],
  summit: ['Rahul Verma', 'Shreya Ghosh', 'Aman Khanna', 'Nandini Rao', 'Gaurav Mittal', 'Pallavi Sinha', 'Yusuf Ali'],
};
const ALLERGEN_ROTATION: readonly (readonly string[])[] = [[], ['Nuts'], ['Dairy'], [], ['Gluten'], ['Soy', 'Sesame'], []];
const TAG_ROTATION: readonly (readonly string[])[] = [['Vegetarian'], ['Vegan'], ['High Protein'], ['Gluten-Free'], ['Jain'], [], ['Vegetarian', 'High Protein']];

function generatedEmployees(): EmployeeSeed[] {
  const core = new Set(coreEmployees.map((employee) => employee.companyKey));
  return Object.entries(extraEmployeeNames).flatMap(([companyKey, names]) => {
    const company = companySeed(companyKey);
    const addresses = addressSeeds.filter((address) => address.companyKey === companyKey);
    const offset = core.has(companyKey) ? 5 : 1; // core companies already have owner + 2..4
    return names.map((name, index) => {
      const number = index + offset;
      const owner = !core.has(companyKey) && index === 0;
      const first = name.split(' ')[0]!.toLowerCase().replace(/[^a-z]/g, '');
      return {
        key: owner ? `${companyKey}-owner` : `${companyKey}-${number}`,
        companyKey,
        name,
        email: number % 5 === 4 ? null : `${first}@${company.domain}`,
        addressKey: addresses[number % addresses.length]!.key,
        chooseAddress: owner || number % 2 === 1,
        changeTime: owner || number % 3 === 1,
        changePackaging: owner || number % 4 === 1,
        allergens: ALLERGEN_ROTATION[number % ALLERGEN_ROTATION.length]!,
        tags: TAG_ROTATION[(number + companyKey.length) % TAG_ROTATION.length]!,
      };
    });
  });
}

export const employeeSeeds: readonly EmployeeSeed[] = [...coreEmployees, ...generatedEmployees()];

export function employeesOf(companyKey: string): EmployeeSeed[] {
  return employeeSeeds.filter((employee) => employee.companyKey === companyKey);
}

export const optionGroupSeeds = [
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

// ─── Menu, prices and order lines ───────────────────────────────────────────

export const menuCategorySeeds = [
  { key: 'bowls', name: 'Bowls', slug: 'bowls', order: 1, secret: false, dishes: ['paneer-bowl', 'tofu-bowl', 'jain-bowl', 'custom-bowl'] },
  { key: 'breakfast', name: 'Breakfast', slug: 'breakfast', order: 2, secret: false, dishes: ['poha', 'breakfast-wrap'] },
  { key: 'desserts', name: 'Desserts', slug: 'desserts', order: 3, secret: false, dishes: ['brownie', 'fruit-yogurt'] },
  { key: 'chefs-table', name: "Chef's Table", slug: 'chefs-table', order: 4, secret: true, dishes: ['millet-bowl'] },
] as const;

/** Enterprise = Standard +15% (TIER_PERCENTAGE) with these overrides. */
export const ENTERPRISE_SOURCE_ADJUSTMENT_BPS = 1_500;
export const enterpriseDishOverrides: Record<string, number> = { 'custom-bowl': 22900, brownie: 12500 };
export const enterpriseOptionOverrides: Record<string, number> = { raita: 3000 };
/** Partner = cost × 2.2 (COST_MULTIPLIER) with this override. */
export const PARTNER_COST_MULTIPLIER_BPS = 22_000;
export const partnerDishOverrides: Record<string, number> = { 'paneer-bowl': 30900 };
export const LARGE_PORTION_EXTRA_CENTS = 1500;

/** The price the resolver gives this company's tier (override → strategy → round up to 5 cents). */
export function dishPrice(companyKey: string, dishKey: string): number {
  const tier = companySeed(companyKey).tier;
  const standard = standardDishPrices[dishKey]!;
  if (tier === 'enterprise')
    return enterpriseDishOverrides[dishKey] ?? scaledPrice(standard, 10_000 + ENTERPRISE_SOURCE_ADJUSTMENT_BPS);
  if (tier === 'partner')
    return partnerDishOverrides[dishKey] ?? scaledPrice(dishSeeds.find((dish) => dish.key === dishKey)!.cost, PARTNER_COST_MULTIPLIER_BPS);
  return standard;
}

export function optionPrice(companyKey: string, optionKey: string): number {
  const tier = companySeed(companyKey).tier;
  const standard = standardOptionPrices[optionKey]!;
  if (tier === 'enterprise')
    return enterpriseOptionOverrides[optionKey] ?? scaledPrice(standard, 10_000 + ENTERPRISE_SOURCE_ADJUSTMENT_BPS);
  if (tier === 'partner')
    return scaledPrice(optionSeeds.find((option) => option.key === optionKey)!.cost, PARTNER_COST_MULTIPLIER_BPS);
  return standard;
}

/** Dishes on the company's normal (non-secret) menu after its category and dish hiding. */
export function orderableDishes(companyKey: string): string[] {
  const hiding = hiddenMenuSeeds.filter((row) => row.company === companyKey);
  const hiddenCategories = hiding.flatMap((row) => ('category' in row ? [row.category as string] : []));
  const hiddenDishes = hiding.flatMap((row) => ('dish' in row ? [row.dish as string] : []));
  return menuCategorySeeds
    .filter((category) => !category.secret && !hiddenCategories.includes(category.key))
    .flatMap((category) => [...category.dishes] as string[])
    .filter((dish) => !hiddenDishes.includes(dish));
}

export function isHiddenFor(companyKey: string, dishKey: string): boolean {
  return hiddenMenuSeeds.some(
    (row) =>
      row.company === companyKey &&
      ('dish' in row
        ? row.dish === dishKey
        : menuCategorySeeds.find((category) => category.key === row.category)!.dishes.some((dish) => dish === dishKey)),
  );
}

export function stationOf(dishKey: string): string {
  return dishSeeds.find((dish) => dish.key === dishKey)!.station;
}

const SINGLE_REQUIRED_GROUP: Record<string, { group: string; options: readonly [string, string] }> = {
  'paneer-bowl': { group: 'paneer-rice', options: ['brown-rice', 'jeera-rice'] },
  'tofu-bowl': { group: 'tofu-rice', options: ['brown-rice', 'jeera-rice'] },
  'fruit-yogurt': { group: 'yogurt-choice', options: ['greek-yogurt', 'coconut-yogurt'] },
};

/**
 * One order line priced for the company's tier, with every required group
 * answered. The build-your-own bowl (minimum 5) is split into two
 * combinations — regular paneer and a large-portion protein — so it shows
 * split dishes and the portion surcharge.
 */
export function dishLine(companyKey: string, key: string, dishKey: string, quantity: number, variant = 0): LineSeed {
  const selection = (groupKey: string, optionKey: string, portionKey?: 'regular' | 'large'): SelectionSeed => ({
    groupKey,
    optionKey,
    optionPriceCents: optionPrice(companyKey, optionKey),
    ...(portionKey ? { portionKey, portionExtraCents: portionKey === 'large' ? LARGE_PORTION_EXTRA_CENTS : 0 } : {}),
  });
  const dishUnitPriceCents = dishPrice(companyKey, dishKey);
  if (dishKey === 'custom-bowl') {
    if (quantity < 5) throw new Error(`${key}: the build-your-own bowl has a minimum of 5.`);
    const first = Math.ceil(quantity * 0.6);
    const protein = variant % 2 === 0 ? 'tofu' : 'chickpeas';
    return {
      key,
      dishKey,
      quantity,
      dishUnitPriceCents,
      combinations: [
        {
          key: 'paneer-regular',
          quantity: first,
          selections: [
            selection('custom-protein', 'paneer', 'regular'),
            selection('custom-rice', 'brown-rice'),
            ...(variant % 2 === 1 ? [selection('custom-addons', 'raita')] : []),
          ],
        },
        {
          key: `${protein}-large`,
          quantity: quantity - first,
          selections: [selection('custom-protein', protein, 'large'), selection('custom-rice', 'jeera-rice')],
        },
      ],
    };
  }
  const required = SINGLE_REQUIRED_GROUP[dishKey];
  return {
    key,
    dishKey,
    quantity,
    dishUnitPriceCents,
    combinations: [
      { key: 'main', quantity, selections: required ? [selection(required.group, required.options[variant % 2]!)] : [] },
    ],
  };
}

export function lineTotal(line: LineSeed): number {
  const combinationQuantity = line.combinations.reduce((sum, combination) => sum + combination.quantity, 0);
  if (combinationQuantity !== line.quantity)
    throw new Error(`${line.key}: combination quantities do not match line quantity.`);
  return line.combinations.reduce((sum, combination) => {
    const additions = combination.selections.reduce(
      (price, selection) => price + selection.optionPriceCents + (selection.portionExtraCents ?? 0),
      0,
    );
    return sum + (line.dishUnitPriceCents + additions) * combination.quantity;
  }, 0);
}

export function orderTotal(order: OrderSeed): number {
  return order.lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

// ─── Dates ──────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60_000;
const mod = (value: number, size: number) => ((value % size) + size) % size;

export function daysBetween(from: PlainDate, to: PlainDate): number {
  return Math.round((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / DAY_MS);
}

export function shiftToWeekday(date: PlainDate, direction: 1 | -1): PlainDate {
  let candidate = date;
  while (dayOfWeek(candidate) === DayOfWeek.SATURDAY || dayOfWeek(candidate) === DayOfWeek.SUNDAY)
    candidate = addDays(candidate, direction);
  return candidate;
}

/** Seed settings: cut-off 16:00, two kitchen working days (Mon–Fri) before delivery. */
export const CUTOFF_HOUR = 16;
export const CUTOFF_WORKING_DAY_COUNT = 2;
const KITCHEN_DAYS: readonly DayOfWeek[] = CALENDAR_DAYS.WEEKDAYS;

/** Same walk-back as BusinessTimeService (kitchen working days, skipping the kitchen holiday). */
export function cutoffInstant(date: PlainDate, today: PlainDate): Date {
  const holiday = dateKey(addDays(today, KITCHEN_HOLIDAY_OFFSET));
  let cursor = date;
  let remaining = CUTOFF_WORKING_DAY_COUNT;
  while (remaining > 0) {
    cursor = addDays(cursor, -1);
    if (KITCHEN_DAYS.includes(dayOfWeek(cursor)) && dateKey(cursor) !== holiday) remaining -= 1;
  }
  return businessInstant(cursor, CUTOFF_HOUR, 0);
}

// ─── The order plan ─────────────────────────────────────────────────────────

type ScenarioInput = Omit<OrderSeed, 'dayOffset' | 'lines' | 'companyKey'> & {
  employeeKey: string;
  line: [dishKey: string, quantity: number, variant?: number];
};

function scenario(today: PlainDate, input: ScenarioInput): OrderSeed {
  const employee = employeeSeeds.find((item) => item.key === input.employeeKey);
  if (!employee) throw new Error(`${input.number}: unknown employee ${input.employeeKey}.`);
  const { line, ...rest } = input;
  return {
    ...rest,
    companyKey: employee.companyKey,
    dayOffset: daysBetween(today, input.date),
    lines: [dishLine(employee.companyKey, line[0], line[0], line[1], line[2] ?? 0)],
  };
}

/** Hand-written scenarios: every status, split dishes, today's mixed operations. */
function scenarioOrders(today: PlainDate): OrderSeed[] {
  const at = (offset: number) => addDays(today, offset);
  const s = (input: ScenarioInput) => scenario(today, input);
  const C = OrderStatus;
  return [
    // History
    s({ number: 'DEMO-PAST-DEL-001', employeeKey: 'acme-owner', addressKey: 'acme-hq', packagingKey: 'eco', date: at(-7), deliveryHour: 13, deliveryMinute: 0, status: C.DELIVERED, prepState: 'DONE', line: ['paneer-bowl', 3] }),
    s({ number: 'DEMO-PAST-DEL-002', employeeKey: 'acme-2', addressKey: 'acme-hq', packagingKey: 'eco', date: at(-7), deliveryHour: 13, deliveryMinute: 0, status: C.DELIVERED, prepState: 'DONE', line: ['tofu-bowl', 2, 1] }),
    s({ number: 'DEMO-PAST-CAN-001', employeeKey: 'bluepeak-owner', addressKey: 'bluepeak', packagingKey: 'premium', date: shiftToWeekday(at(-4), -1), deliveryHour: 12, deliveryMinute: 30, status: C.CANCELLED, confirmedThenCancelled: true, prepState: 'NOT_STARTED', line: ['breakfast-wrap', 4] }),
    s({ number: 'DEMO-PAST-CAN-002', employeeKey: 'vertex-2', addressKey: 'vertex-office', packagingKey: 'standard', date: shiftToWeekday(at(-3), -1), deliveryHour: 12, deliveryMinute: 30, status: C.CANCELLED, draftCancelled: true, line: ['poha', 6] }),
    s({ number: 'DEMO-PAST-REJ-001', employeeKey: 'northstar-2', addressKey: 'northstar', packagingKey: 'standard', date: shiftToWeekday(at(-2), -1), deliveryHour: 13, deliveryMinute: 30, status: C.REJECTED, rejectionReason: 'Requested delivery time could not be fulfilled.', line: ['jain-bowl', 2] }),
    s({ number: 'DEMO-PAST-REJ-002', employeeKey: 'summit-2', addressKey: 'summit-hq', packagingKey: 'eco', date: shiftToWeekday(at(-5), -1), deliveryHour: 12, deliveryMinute: 45, status: C.REJECTED, rejectionReason: 'Kitchen capacity exceeded for that slot.', line: ['custom-bowl', 6] }),
    // Today (Acme and Greenfield deliver every day)
    s({ number: 'DEMO-TODAY-CONF-001', employeeKey: 'acme-3', addressKey: 'acme-hq', packagingKey: 'eco', date: today, deliveryHour: 13, deliveryMinute: 0, status: C.CONFIRMED, prepState: 'STARTED', line: ['custom-bowl', 10] }),
    s({ number: 'DEMO-TODAY-CONF-002', employeeKey: 'acme-owner', addressKey: 'acme-annex', packagingKey: 'standard', date: today, deliveryHour: 14, deliveryMinute: 0, status: C.CONFIRMED, prepState: 'NOT_STARTED', line: ['poha', 5] }),
    s({ number: 'DEMO-TODAY-DSP-001', employeeKey: 'acme-4', addressKey: 'acme-hq', packagingKey: 'eco', date: today, deliveryHour: 15, deliveryMinute: 0, status: C.CONFIRMED, prepState: 'DONE', line: ['paneer-bowl', 2, 1] }),
    s({ number: 'DEMO-TODAY-DSP-002', employeeKey: 'acme-owner', addressKey: 'acme-hq', packagingKey: 'eco', date: today, deliveryHour: 15, deliveryMinute: 0, status: C.CONFIRMED, prepState: 'DONE', line: ['brownie', 6] }),
    s({ number: 'DEMO-TODAY-OUT-001', employeeKey: 'acme-owner', addressKey: 'acme-annex', packagingKey: 'premium', date: today, deliveryHour: 16, deliveryMinute: 0, status: C.CONFIRMED, prepState: 'DONE', dropStage: 'OUT', line: ['fruit-yogurt', 4] }),
    s({ number: 'DEMO-TODAY-DEL-001', employeeKey: 'acme-4', addressKey: 'acme-hq', packagingKey: 'eco', date: today, deliveryHour: 11, deliveryMinute: 30, status: C.DELIVERED, prepState: 'DONE', line: ['breakfast-wrap', 3] }),
    s({ number: 'DEMO-TODAY-PLACED-001', employeeKey: 'acme-2', addressKey: 'acme-hq', packagingKey: 'eco', date: today, deliveryHour: 13, deliveryMinute: 0, status: C.PLACED, line: ['jain-bowl', 2] }),
    s({ number: 'DEMO-TODAY-DRAFT-001', employeeKey: 'greenfield-2', addressKey: 'greenfield-main', packagingKey: 'eco', date: today, deliveryHour: 12, deliveryMinute: 0, status: C.DRAFT, line: ['poha', 3] }),
    s({ number: 'DEMO-TODAY-GF-DEL-001', employeeKey: 'greenfield-6', addressKey: 'greenfield-main', packagingKey: 'eco', date: today, deliveryHour: 12, deliveryMinute: 0, status: C.DELIVERED, prepState: 'DONE', line: ['tofu-bowl', 4] }),
    s({ number: 'DEMO-TODAY-GF-DEL-002', employeeKey: 'greenfield-4', addressKey: 'greenfield-main', packagingKey: 'eco', date: today, deliveryHour: 12, deliveryMinute: 0, status: C.DELIVERED, prepState: 'DONE', line: ['jain-bowl', 3] }),
    s({ number: 'DEMO-TODAY-GF-RDY-001', employeeKey: 'greenfield-3', addressKey: 'greenfield-opd', packagingKey: 'eco', date: today, deliveryHour: 12, deliveryMinute: 0, status: C.CONFIRMED, prepState: 'DONE', line: ['paneer-bowl', 3] }),
    s({ number: 'DEMO-TODAY-GF-CONF-001', employeeKey: 'greenfield-4', addressKey: 'greenfield-main', packagingKey: 'eco', date: today, deliveryHour: 13, deliveryMinute: 30, status: C.CONFIRMED, prepState: 'STARTED', line: ['fruit-yogurt', 6, 1] }),
    s({ number: 'DEMO-TODAY-GF-CONF-002', employeeKey: 'greenfield-owner', addressKey: 'greenfield-opd', packagingKey: 'eco', date: today, deliveryHour: 13, deliveryMinute: 30, status: C.CONFIRMED, prepState: 'NOT_STARTED', line: ['custom-bowl', 8, 1] }),
    // Ahead (DRAFT/PLACED stay before their cut-off: ≥ 6 days out)
    s({ number: 'DEMO-FUT-DRAFT-001', employeeKey: 'acme-6', addressKey: 'acme-hq', packagingKey: 'eco', date: at(6), deliveryHour: 13, deliveryMinute: 0, status: C.DRAFT, line: ['jain-bowl', 2] }),
    s({ number: 'DEMO-FUT-DRAFT-002', employeeKey: 'bluepeak-2', addressKey: 'bluepeak', packagingKey: 'premium', date: shiftToWeekday(at(7), 1), deliveryHour: 12, deliveryMinute: 30, status: C.DRAFT, line: ['poha', 4] }),
    s({ number: 'DEMO-FUT-PLACED-001', employeeKey: 'acme-3', addressKey: 'acme-annex', packagingKey: 'eco', date: at(8), deliveryHour: 13, deliveryMinute: 0, status: C.PLACED, line: ['tofu-bowl', 3] }),
    // Secret "Chef's Table" dish, reachable only by the direct category path.
    s({ number: 'DEMO-FUT-PLACED-002', employeeKey: 'northstar-3', addressKey: 'northstar', packagingKey: 'standard', date: shiftToWeekday(at(8), 1), deliveryHour: 13, deliveryMinute: 30, status: C.PLACED, line: ['millet-bowl', 3] }),
    s({ number: 'DEMO-FUT-CONF-001', employeeKey: 'acme-2', addressKey: 'acme-hq', packagingKey: 'eco', date: at(2), deliveryHour: 13, deliveryMinute: 0, status: C.CONFIRMED, prepState: 'NOT_STARTED', line: ['paneer-bowl', 4] }),
    s({ number: 'DEMO-FUT-CONF-002', employeeKey: 'bluepeak-4', addressKey: 'bluepeak', packagingKey: 'premium', date: shiftToWeekday(at(3), 1), deliveryHour: 12, deliveryMinute: 30, status: C.CONFIRMED, prepState: 'NOT_STARTED', line: ['jain-bowl', 5] }),
  ];
}

/** Orders per day for days +1…+14 (cycled); weekends are capped by who delivers. */
const DAY_VOLUME = [5, 4, 7, 3, 8, 6, 5] as const;
const SCENARIO_COMPANIES_TODAY = ['acme', 'greenfield'];

function volumeFor(offset: number, eligible: number): number {
  const base =
    offset < 0 ? 3 + (Math.abs(offset) % 2) : offset === 0 ? 3 : offset <= 14 ? DAY_VOLUME[(offset - 1) % 7]! : 2 + (offset % 2);
  return Math.min(eligible <= 3 ? Math.min(base, 4) : base, eligible * 2);
}

/**
 * Generated orders for each day from -7 to +28, rotating companies, employees
 * and dishes deterministically. Every day from today on has at least two
 * kitchen-ready orders from different companies (two Drops, one with the demo
 * driver) on two stations, plus unfinished prep; later DRAFT/PLACED orders
 * appear only while their cut-off is still ahead.
 */
function generatedOrders(today: PlainDate, now: Date): OrderSeed[] {
  const orders: OrderSeed[] = [];
  for (let offset = -HISTORY_DAYS; offset <= REVIEW_WINDOW_DAYS; offset += 1) {
    const date = addDays(today, offset);
    const eligible = companySeeds
      .map((company) => company.key as string)
      .filter((key) => deliversOn(key, date, today))
      .filter((key) => offset !== 0 || !SCENARIO_COMPANIES_TODAY.includes(key));
    if (eligible.length === 0) continue;
    const volume = volumeFor(offset, eligible.length);
    const withDriver = eligible.filter((key) => companySeed(key).driver);
    const first = (withDriver.length ? withDriver : eligible)[mod(offset, (withDriver.length ? withDriver : eligible).length)]!;
    const others = eligible.filter((key) => key !== first);
    let firstStation: string | null = null;
    for (let index = 0; index < volume; index += 1) {
      const companyKey =
        index === 0 ? first : index === 1 && others.length ? others[mod(offset, others.length)]! : eligible[mod(offset * 2 + index, eligible.length)]!;
      const company = companySeed(companyKey);
      const people = employeesOf(companyKey);
      const employee = people[mod(offset * 3 + index, people.length)]!;
      const dishes = orderableDishes(companyKey);
      let dishKey = dishes[mod(offset * 5 + index * 3, dishes.length)]!;
      if (index === 0) firstStation = stationOf(dishKey);
      if (index === 1) dishKey = dishes.find((dish, at) => at >= dishes.indexOf(dishKey) && stationOf(dish) !== firstStation) ?? dishes.find((dish) => stationOf(dish) !== firstStation) ?? dishKey;
      const quantity = dishKey === 'custom-bowl' ? 5 + mod(offset + index, 4) : 2 + mod(offset + index, 5);

      let status: OrderStatus = OrderStatus.CONFIRMED;
      let prepState: PrepState | undefined = 'DONE';
      if (offset < 0) status = OrderStatus.DELIVERED;
      else if (offset === 0) prepState = index === 0 ? 'DONE' : index === 1 ? 'STARTED' : 'NOT_STARTED';
      else if (index >= 2 && index === volume - 1 && offset >= 6 && offset % 3 !== 2 && now < cutoffInstant(date, today)) {
        status = offset % 3 === 0 ? OrderStatus.PLACED : OrderStatus.DRAFT;
        prepState = undefined;
      } else if (index >= 2)
        // Mostly unfinished, so the kitchen board has work on whichever day a reviewer logs in.
        prepState = index % 4 === 3 ? 'DONE' : index % 4 === 2 && offset <= 2 ? 'STARTED' : 'NOT_STARTED';

      const sign = offset < 0 ? 'M' : offset > 0 ? 'P' : 'T';
      orders.push({
        number: `DEMO-GEN-${sign}${String(Math.abs(offset)).padStart(2, '0')}-${index + 1}`,
        companyKey,
        employeeKey: employee.key,
        addressKey: employee.addressKey,
        packagingKey: company.packaging,
        date,
        dayOffset: offset,
        deliveryHour: company.hour,
        deliveryMinute: company.minute,
        status,
        lines: [dishLine(companyKey, dishKey, dishKey, quantity, mod(offset + index, 2))],
        ...(prepState ? { prepState } : {}),
      });
    }
  }
  return orders;
}

// ─── Drops and invoices derived from the orders ─────────────────────────────

export type DropPlan = {
  key: string;
  id: string;
  companyKey: string;
  addressKey: string;
  date: PlainDate;
  dayOffset: number;
  hour: number;
  minute: number;
  status: DeliveryDropStatus;
  assignDriver: boolean;
  deliveredOffsetMinutes: number | null;
  note: string | null;
  orderNumbers: string[];
};

const DELIVERY_NOTES = ['Delivered to reception.', 'Handed to the facilities coordinator.', 'Signed for by security at the lobby.'];

function dropStatusOf(order: OrderSeed): DeliveryDropStatus | null {
  if (order.status === OrderStatus.DELIVERED) return DeliveryDropStatus.DELIVERED;
  if (order.status === OrderStatus.CONFIRMED && order.prepState === 'DONE')
    return order.dropStage === 'OUT' ? DeliveryDropStatus.OUT_FOR_DELIVERY : DeliveryDropStatus.DISPATCH_READY;
  return null;
}

/**
 * The app's grouping rule: kitchen-ready orders with the same company, address
 * and exact delivery time share one Drop. Mixed stages under one key would be
 * an impossible state, so they fail the plan.
 */
function planDrops(orders: OrderSeed[]): { drops: DropPlan[]; dropOf: Record<string, string> } {
  const byKey = new Map<string, DropPlan>();
  for (const order of orders) {
    const status = dropStatusOf(order);
    if (!status) continue;
    const hhmm = `${String(order.deliveryHour).padStart(2, '0')}${String(order.deliveryMinute).padStart(2, '0')}`;
    const key = `d${order.dayOffset}:${order.companyKey}:${order.addressKey}:${hhmm}`;
    const existing = byKey.get(key);
    if (existing) {
      if (existing.status !== status) throw new Error(`Drop ${key} mixes ${existing.status} and ${status} orders.`);
      existing.orderNumbers.push(order.number);
      continue;
    }
    byKey.set(key, {
      key,
      id: seedId(`drop:${key}`),
      companyKey: order.companyKey,
      addressKey: order.addressKey,
      date: order.date,
      dayOffset: order.dayOffset,
      hour: order.deliveryHour,
      minute: order.deliveryMinute,
      status,
      // Departed/delivered Drops always had a driver; a ready Drop gets the company default driver if it has one.
      assignDriver: status !== DeliveryDropStatus.DISPATCH_READY || companySeed(order.companyKey).driver,
      deliveredOffsetMinutes: null,
      note: null,
      orderNumbers: [order.number],
    });
  }
  const drops = [...byKey.values()];
  const perDay = new Map<number, number>();
  for (const drop of drops) {
    if (drop.status !== DeliveryDropStatus.DELIVERED) continue;
    const index = perDay.get(drop.dayOffset) ?? 0;
    perDay.set(drop.dayOffset, index + 1);
    // History alternates early and late so on-time has both values; today's are on time.
    drop.deliveredOffsetMinutes = drop.dayOffset === 0 ? -6 : mod(drop.dayOffset + index, 2) === 0 ? -10 : 8;
    drop.note = DELIVERY_NOTES[mod(drop.dayOffset + index, DELIVERY_NOTES.length)]!;
  }
  const dropOf: Record<string, string> = {};
  for (const drop of drops) for (const number of drop.orderNumbers) dropOf[number] = drop.key;
  return { drops, dropOf };
}

export type InvoicePlan = {
  number: string;
  companyKey: string;
  status: InvoiceStatus;
  orderNumbers: string[];
  /** Business-date offsets of the issue and payment days. */
  createdOffset: number;
  paidOffset: number | null;
};

export const MAX_DEMO_INVOICES = 12;

/**
 * Per company: delivered orders from days -7…-5 on a paid invoice, -4…-2 on an
 * unpaid one; yesterday's and today's stay uninvoiced, as does the
 * confirmed-then-cancelled order (billable, waiting to be invoiced).
 */
function planInvoices(orders: OrderSeed[]): InvoicePlan[] {
  const plans: InvoicePlan[] = [];
  for (const company of companySeeds) {
    const delivered = orders.filter((order) => order.companyKey === company.key && order.status === OrderStatus.DELIVERED);
    const windows = [
      { status: InvoiceStatus.PAID, from: -HISTORY_DAYS, to: -5, createdOffset: -4, paidOffset: -2 },
      { status: InvoiceStatus.UNPAID, from: -4, to: -2, createdOffset: -1, paidOffset: null },
    ];
    for (const window of windows) {
      const orderNumbers = delivered
        .filter((order) => order.dayOffset >= window.from && order.dayOffset <= window.to)
        .map((order) => order.number);
      if (!orderNumbers.length || plans.length >= MAX_DEMO_INVOICES) continue;
      const paid = window.status === InvoiceStatus.PAID;
      plans.push({
        // Acme keeps the original invoice numbers so an earlier seed's rows are updated in place.
        number: company.key === 'acme' ? (paid ? 'DEMO-INV-PAID-001' : 'DEMO-INV-UNPAID-001') : `DEMO-INV-${company.key.toUpperCase()}-${paid ? 'PAID' : 'UNPAID'}`,
        companyKey: company.key,
        status: window.status,
        orderNumbers,
        createdOffset: window.createdOffset,
        paidOffset: window.paidOffset,
      });
    }
  }
  return plans;
}

export type SeedPlan = {
  orders: OrderSeed[];
  drops: DropPlan[];
  /** Order number → drop key. */
  dropOf: Record<string, string>;
  invoices: InvoicePlan[];
};

/** The whole date-relative demo plan for a business date. Pure and deterministic for (today, now). */
export function planSeed(today: PlainDate, now: Date): SeedPlan {
  const orders = [...scenarioOrders(today), ...generatedOrders(today, now)];
  const numbers = new Set<string>();
  for (const order of orders) {
    if (numbers.has(order.number)) throw new Error(`Duplicate order number ${order.number}.`);
    numbers.add(order.number);
    if (!deliversOn(order.companyKey, order.date, today))
      throw new Error(`${order.number}: ${order.companyKey} does not deliver on ${dateKey(order.date)}.`);
    for (const line of order.lines)
      if (isHiddenFor(order.companyKey, line.dishKey))
        throw new Error(`${order.number}: ${line.dishKey} is hidden for ${order.companyKey}.`);
    const future = compareDates(order.date, today) > 0;
    if (future && (order.status === OrderStatus.DRAFT || order.status === OrderStatus.PLACED) && now >= cutoffInstant(order.date, today))
      throw new Error(`${order.number}: a ${order.status} order past its cut-off would already have been processed.`);
  }
  const { drops, dropOf } = planDrops(orders);
  return { orders, drops, dropOf, invoices: planInvoices(orders) };
}
