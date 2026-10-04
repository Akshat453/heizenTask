import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DayOfWeek } from '../../generated/prisma/enums.js';
import type { OrderableMenu } from '../../menu/orderability.service.js';
import type { PrismaDb } from '../../pricing/price-resolver.service.js';
import { OrderValidationService } from './order-validation.service.js';

const TZ = 'Asia/Kolkata';
const MONDAY = '2026-10-05';

const addresses: Record<
  string,
  { id: string; companyId: string; isActive: boolean }
> = {
  home: { id: 'home', companyId: 'acme', isActive: true },
  annex: { id: 'annex', companyId: 'acme', isActive: true },
  closed: { id: 'closed', companyId: 'acme', isActive: false },
  foreign: { id: 'foreign', companyId: 'other', isActive: true },
};
const packaging: Record<
  string,
  { id: string; name: string; isActive: boolean }
> = {
  box: { id: 'box', name: 'Box', isActive: true },
  tray: { id: 'tray', name: 'Tray', isActive: true },
  retired: { id: 'retired', name: 'Retired', isActive: false },
};

function fakeDb(
  options: { workingDays?: DayOfWeek[]; holiday?: boolean } = {},
): PrismaDb {
  const db = {
    company: {
      findUniqueOrThrow: async () => ({
        id: 'acme',
        defaultDeliveryTime: new Date(Date.UTC(1970, 0, 1, 12, 30)),
        defaultPackagingTypeId: 'box',
        deliveryLeadMinutes: 45,
        workingDays: (options.workingDays ?? [DayOfWeek.MONDAY]).map(
          (dayOfWeek) => ({ companyId: 'acme', dayOfWeek }),
        ),
        holidays: options.holiday ? [{ id: 'h' }] : [],
      }),
    },
    companyAddress: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        addresses[where.id]
          ? {
              ...addresses[where.id],
              label: where.id,
              line1: 'l1',
              line2: null,
              city: 'c',
              region: null,
              postalCode: null,
              country: 'IN',
            }
          : null,
    },
    packagingType: {
      findFirst: async ({
        where,
      }: {
        where: { id: string; isActive: boolean };
      }) => {
        const found = packaging[where.id];
        return found && found.isActive === where.isActive ? found : null;
      },
    },
  };
  return db as unknown as PrismaDb;
}

function menu(flags: Partial<OrderableMenu['employee']> = {}): OrderableMenu {
  return {
    categories: [],
    dishesById: new Map(),
    unpricedDishIds: new Set(),
    hiddenCategoryCount: 0,
    hiddenDishCount: 0,
    tierId: 'tier',
    employee: {
      id: 'emp',
      name: 'Emp',
      companyId: 'acme',
      defaultDeliveryAddressId: 'home',
      canChooseDeliveryAddress: false,
      canChangeDeliveryTime: false,
      canChangePackaging: false,
      allergens: [],
      dietaryTags: [],
      ...flags,
    },
  };
}

const service = new OrderValidationService();
const resolve = (
  params: Partial<Parameters<OrderValidationService['resolveDelivery']>[1]> & {
    db?: PrismaDb;
  } = {},
) =>
  service.resolveDelivery(params.db ?? fakeDb(), {
    menu: menu(),
    deliveryDate: MONDAY,
    timezone: TZ,
    request: {},
    ...params,
  });

describe('OrderValidationService.resolveDelivery', () => {
  it('CREATE: omitted choices resolve to Employee/Company defaults in business time', async () => {
    const { data, deliveryLeadMinutes } = await resolve();
    expect(data).toMatchObject({
      deliveryAddressId: 'home',
      packagingTypeId: 'box',
      packagingNameSnapshot: 'Box',
    });
    expect(data.deliveryAt!.toISOString()).toBe('2026-10-05T07:00:00.000Z'); // 12:30 IST
    expect(deliveryLeadMinutes).toBe(45);
  });

  it('enforces the Company delivery calendar', async () => {
    await expect(
      resolve({ db: fakeDb({ workingDays: [DayOfWeek.TUESDAY] }) }),
    ).rejects.toThrow(/day of the week/);
    await expect(resolve({ db: fakeDb({ holiday: true }) })).rejects.toThrow(
      /holiday/,
    );
  });

  it('requires canChooseDeliveryAddress for a non-default address', async () => {
    await expect(
      resolve({ request: { deliveryAddressId: 'annex' } }),
    ).rejects.toThrow(/non-default delivery address/);
    const { data } = await resolve({
      menu: menu({ canChooseDeliveryAddress: true }),
      request: { deliveryAddressId: 'annex' },
    });
    expect(data.deliveryAddressId).toBe('annex');
    // Requesting the default explicitly needs no flag.
    await expect(
      resolve({ request: { deliveryAddressId: 'home' } }),
    ).resolves.toBeDefined();
  });

  it('requires an active address of the Employee’s current Company', async () => {
    const allowed = menu({ canChooseDeliveryAddress: true });
    await expect(
      resolve({ menu: allowed, request: { deliveryAddressId: 'foreign' } }),
    ).rejects.toThrow(ConflictException);
    await expect(
      resolve({ menu: allowed, request: { deliveryAddressId: 'closed' } }),
    ).rejects.toThrow(ConflictException);
  });

  it('requires canChangeDeliveryTime for a non-default time', async () => {
    await expect(
      resolve({ request: { deliveryTime: '13:00' } }),
    ).rejects.toThrow(/non-default delivery time/);
    const { data } = await resolve({
      menu: menu({ canChangeDeliveryTime: true }),
      request: { deliveryTime: '13:00' },
    });
    expect(data.deliveryAt!.toISOString()).toBe('2026-10-05T07:30:00.000Z');
    await expect(
      resolve({ request: { deliveryTime: '12:30' } }),
    ).resolves.toBeDefined();
  });

  it('requires canChangePackaging for non-default packaging, which must be active', async () => {
    await expect(
      resolve({ request: { packagingTypeId: 'tray' } }),
    ).rejects.toThrow(/non-default packaging/);
    await expect(
      resolve({
        menu: menu({ canChangePackaging: true }),
        request: { packagingTypeId: 'retired' },
      }),
    ).rejects.toThrow(/active/);
    const { data } = await resolve({
      menu: menu({ canChangePackaging: true }),
      request: { packagingTypeId: 'tray' },
    });
    expect(data.packagingTypeId).toBe('tray');
  });

  it('UPDATE: omitted or unchanged fields preserve the current (possibly overridden) selection', async () => {
    const existing = {
      deliveryAddressId: 'annex',
      deliveryAt: new Date('2026-10-05T09:00:00.000Z'),
      packagingTypeId: 'tray',
    }; // 14:30 IST
    const omitted = await resolve({ existing });
    expect(omitted.data).toEqual({});
    // Echoing the current non-default values must not be rejected for lack of flags.
    const echoed = await resolve({
      existing,
      request: {
        deliveryAddressId: 'annex',
        deliveryTime: '14:30',
        packagingTypeId: 'tray',
      },
    });
    expect(echoed.data).toEqual({});
  });

  it('UPDATE: an explicit change follows the Employee flags', async () => {
    const existing = {
      deliveryAddressId: 'home',
      deliveryAt: new Date('2026-10-05T07:00:00.000Z'),
      packagingTypeId: 'box',
    };
    await expect(
      resolve({ existing, request: { deliveryTime: '15:00' } }),
    ).rejects.toThrow(/non-default delivery time/);
    const { data } = await resolve({
      existing,
      menu: menu({ canChangeDeliveryTime: true }),
      request: { deliveryTime: '15:00' },
    });
    expect(data).toEqual({ deliveryAt: new Date('2026-10-05T09:30:00.000Z') });
  });
});
