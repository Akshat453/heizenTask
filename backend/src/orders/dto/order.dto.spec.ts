import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import {
  CreateOrderDto,
  ProcessCutoffDto,
  UpdateOrderDto,
} from './order.dto.js';

const UUID = '6f1c1a52-6f3b-5c6e-9a5e-0d6a1f2b3c4d';
const base = {
  employeeId: UUID,
  deliveryDate: '2026-10-05',
  placeOrder: false,
  lines: [
    { dishId: UUID, quantity: 1, combinations: [{ quantity: 1, options: [] }] },
  ],
};
const errorsFor = async <T extends object>(cls: new () => T, body: object) =>
  (
    await validate(plainToInstance(cls, body), {
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  ).map(({ property }) => property);

describe('Order DTO validation', () => {
  it('accepts a strict YYYY-MM-DD delivery date', async () => {
    expect(await errorsFor(CreateOrderDto, base)).toEqual([]);
  });

  it('rejects full ISO timestamps and impossible dates where a business date is expected', async () => {
    for (const deliveryDate of [
      '2026-10-05T00:00:00Z',
      '2026-10-05T10:00:00+05:30',
      '2026-02-30',
      '05-10-2026',
    ]) {
      expect(
        await errorsFor(CreateOrderDto, { ...base, deliveryDate }),
      ).toContain('deliveryDate');
    }
    expect(
      await errorsFor(ProcessCutoffDto, {
        deliveryDate: '2026-10-05T00:00:00Z',
      }),
    ).toContain('deliveryDate');
  });

  it('validates optional delivery choices', async () => {
    expect(
      await errorsFor(CreateOrderDto, {
        ...base,
        deliveryTime: '13:15',
        deliveryAddressId: UUID,
        packagingTypeId: UUID,
      }),
    ).toEqual([]);
    expect(
      await errorsFor(CreateOrderDto, { ...base, deliveryTime: '1:15' }),
    ).toContain('deliveryTime');
    expect(
      await errorsFor(UpdateOrderDto, { deliveryAddressId: 'not-a-uuid' }),
    ).toContain('deliveryAddressId');
  });

  it('requires a positive line quantity and at least one line/combination', async () => {
    expect(await errorsFor(CreateOrderDto, { ...base, lines: [] })).toContain(
      'lines',
    );
    expect(
      await errorsFor(CreateOrderDto, {
        ...base,
        lines: [
          {
            dishId: UUID,
            quantity: 0,
            combinations: [{ quantity: 1, options: [] }],
          },
        ],
      }),
    ).toContain('lines');
    expect(
      await errorsFor(CreateOrderDto, {
        ...base,
        lines: [{ dishId: UUID, quantity: 1, combinations: [] }],
      }),
    ).toContain('lines');
  });
});
