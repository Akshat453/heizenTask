import { summarizeDropOrders, type DropOrderRow } from './drop-orders.js';

const order = (
  orderNumber: string,
  packagingNameSnapshot: string,
  quantities: number[],
): DropOrderRow => ({
  id: `id-${orderNumber}`,
  orderNumber,
  packagingNameSnapshot,
  deliveryLeadMinutesSnapshot: 60,
  employee: { name: `Employee ${orderNumber}` },
  lines: quantities.map((quantity) => ({ quantity })),
});

describe('summarizeDropOrders', () => {
  it('sums meals per order and per drop, and counts orders per packaging type', () => {
    const summary = summarizeDropOrders([
      order('ORD-2', 'Eco tray', [2]),
      order('ORD-1', 'Boxed', [3, 1]),
      order('ORD-3', 'Boxed', [5]),
    ]);
    expect(summary.meals).toBe(11);
    expect(summary.orders).toEqual([
      {
        id: 'id-ORD-1',
        orderNumber: 'ORD-1',
        employeeName: 'Employee ORD-1',
        packagingName: 'Boxed',
        meals: 4,
      },
      {
        id: 'id-ORD-2',
        orderNumber: 'ORD-2',
        employeeName: 'Employee ORD-2',
        packagingName: 'Eco tray',
        meals: 2,
      },
      {
        id: 'id-ORD-3',
        orderNumber: 'ORD-3',
        employeeName: 'Employee ORD-3',
        packagingName: 'Boxed',
        meals: 5,
      },
    ]);
    expect(summary.packaging).toEqual([
      { name: 'Boxed', count: 2 },
      { name: 'Eco tray', count: 1 },
    ]);
  });

  it('returns zeros for a drop without orders', () => {
    expect(summarizeDropOrders([])).toEqual({
      orders: [],
      meals: 0,
      packaging: [],
    });
  });
});
