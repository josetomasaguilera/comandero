import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';

// Isolate business rules from Mongoose's ESM decorators, as in other service tests.
jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  InjectConnection: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ virtual: jest.fn() }) },
}));

describe('Order extras', () => {
  const setup = (existing: unknown = null) => {
    const items = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(existing) }),
      create: jest.fn().mockImplementation(async (item) => item),
    };
    const products = { findOne: jest.fn().mockReturnValue({ populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ category: { destination: 'cocina' } }) }) }) };
    const service = new OrdersService({} as any, items as any, products as any, { next: async () => 1 } as any, {} as any);
    return { service, items };
  };

  it('saves extras per unit, preserves notes and avoids duplicate markers', async () => {
    const { service, items } = setup();
    const item = await service.addItem(1, 2, 3, 'sin cebolla; con extras; con extras', 4, 150);
    expect(item).toMatchObject({ extrasCents: 150, quantity: 3, notes: 'sin cebolla; con extras' });
    expect(items.findOne).toHaveBeenCalledWith(expect.objectContaining({ extrasCents: 150, barId: 4 }));
  });

  it('removes the extras marker at zero and also matches legacy items', async () => {
    const { service, items } = setup();
    const item = await service.addItem(1, 2, 1, 'sin sal; con extras', 4, 0);
    expect(item).toMatchObject({ extrasCents: 0, notes: 'sin sal' });
    expect(items.findOne).toHaveBeenCalledWith(expect.objectContaining({ $or: [{ extrasCents: 0 }, { extrasCents: { $exists: false } }] }));
  });

  it.each([-50, 25, 50.5, NaN, Infinity])('rejects invalid extras: %s', async (amount) => {
    const { service, items } = setup();
    await expect(service.addItem(1, 2, 1, null, 4, amount)).rejects.toThrow(BadRequestException);
    expect(items.create).not.toHaveBeenCalled();
  });

  it('increments a matching line while retaining its extras', async () => {
    const existing = { quantity: 1, extrasCents: 50, save: jest.fn() };
    const { service, items } = setup(existing);
    await service.addItem(1, 2, 2, null, 4, 50);
    expect(existing.quantity).toBe(3);
    expect(existing.extrasCents).toBe(50);
    expect(existing.save).toHaveBeenCalled();
    expect(items.create).not.toHaveBeenCalled();
  });
});
