import { BadRequestException } from '@nestjs/common';
import { SalesReportsService, salesDate } from './sales-reports.service';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ virtual: jest.fn() }) },
}));

describe('Monthly sales reports', () => {
  const setup = (data: unknown[] = []) => {
    const query = { populate: jest.fn().mockReturnThis(), lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(data) };
    const orders = {
      find: jest.fn().mockReturnValue(query),
      aggregate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([{ _id: '2024-02' }]) }),
    };
    return { service: new SalesReportsService(orders as never), orders, query };
  };

  it('groups Madrid closing dates, quantities and extras, preferring historical prices', async () => {
    const line = { productId: 1, quantity: 2, extrasCents: 20, product: { name: 'Café', price: 2 } };
    const { service, orders, query } = setup([
      { closedAt: new Date('2024-01-31T23:30:00Z'), items: [line] },
      { closedAt: new Date('2024-02-29T22:30:00Z'), items: [{ ...line, quantity: 3, saleUnitPriceCents: 150, saleProductName: 'Café' }] },
      { closedAt: new Date('2024-02-29T23:30:00Z'), items: [line] },
    ]);
    const report = await service.monthly(7, '2024-02');
    expect(report.days).toHaveLength(29);
    expect(report.days[0]).toMatchObject({ orders: 1, totalCents: 440 });
    expect(report.days[28]).toMatchObject({ orders: 1, totalCents: 450 });
    expect(report.days[1].totalCents).toBe(0);
    expect(report).toMatchObject({ totalCents: 890, quantity: 5, orderCount: 2, estimated: true, missingPrices: false });
    expect(report.products).toEqual([{ id: 1, name: 'Café', quantity: 5, totalCents: 890 }]);
    expect(orders.find).toHaveBeenCalledWith(expect.objectContaining({ barId: 7, status: 'cerrado' }));
    expect(query.populate).toHaveBeenCalledWith({ path: 'items', match: { barId: 7 }, populate: { path: 'product', match: { barId: 7 } } });
    expect(orders.aggregate.mock.calls[0][0][0].$match.barId).toBe(7);
  });

  it('uses Madrid dates across summer time and defaults to its current month', async () => {
    expect(salesDate(new Date('2024-03-31T22:30:00Z'))).toBe('2024-04-01');
    const report = await setup().service.monthly(7, undefined, new Date('2024-03-31T22:30:00Z'));
    expect(report.month).toBe('2024-04');
    expect(report.days).toHaveLength(30);
    expect(report).toMatchObject({ totalCents: 0, orderCount: 0, products: [], estimated: false });
    expect(report.months).toContainEqual({ value: '2024-02', label: 'febrero de 2024', selected: false });
  });

  it('preserves deleted products with snapshots and flags missing legacy prices', async () => {
    const { service } = setup([{ closedAt: new Date('2024-02-10T12:00:00Z'), items: [
      { productId: 1, quantity: 2, saleUnitPriceCents: 220, saleProductName: 'Antiguo' },
      { productId: 2, quantity: 1, extrasCents: 20 },
    ] }]);
    const report = await service.monthly(7, '2024-02');
    expect(report).toMatchObject({ totalCents: 460, estimated: true, missingPrices: true });
    expect(report.products[0]).toMatchObject({ name: 'Antiguo', totalCents: 440 });
  });

  it.each(['2024-13', '2024-00', '24-02', '', ['2024-02'], { $ne: null }])('rejects invalid month %j', async (month) => {
    const { service, orders } = setup();
    await expect(service.monthly(7, month)).rejects.toThrow(BadRequestException);
    expect(orders.find).not.toHaveBeenCalled();
  });
});
