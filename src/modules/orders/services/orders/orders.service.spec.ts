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

describe('Order cancellation', () => {
  const setup = (order: unknown = { id: 12 }) => {
    const session = {};
    const query = (value: unknown) => ({ session: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(value) });
    const deletion = query(order);
    const itemDeletion = query({ deletedCount: 2 });
    const orders = {
      db: { transaction: jest.fn(async (work) => work(session)) },
      findOneAndDelete: jest.fn().mockReturnValue(deletion),
    };
    const items = { deleteMany: jest.fn().mockReturnValue(itemDeletion) };
    const tables = { setStatus: jest.fn().mockResolvedValue(undefined) };
    const service = new OrdersService(orders as never, items as never, {} as never, {} as never, tables as never);
    return { service, orders, items, tables, session, deletion, itemDeletion };
  };

  it('deletes the open order and its lines and frees the table in one transaction', async () => {
    const s = setup();
    await s.service.cancelOrder(12, 3, 7);
    expect(s.orders.findOneAndDelete).toHaveBeenCalledWith({ id: 12, tableId: 3, barId: 7, status: 'abierto' });
    expect(s.items.deleteMany).toHaveBeenCalledWith({ orderId: 12, barId: 7 });
    expect(s.deletion.session).toHaveBeenCalledWith(s.session);
    expect(s.itemDeletion.session).toHaveBeenCalledWith(s.session);
    expect(s.tables.setStatus).toHaveBeenCalledWith(3, 7, 'libre', s.session);
  });

  it('does not delete lines or free a table if the scoped open order is missing', async () => {
    const s = setup(null);
    await expect(s.service.cancelOrder(12, 3, 7)).rejects.toThrow('Pedido abierto no encontrado');
    expect(s.items.deleteMany).not.toHaveBeenCalled();
    expect(s.tables.setStatus).not.toHaveBeenCalled();
  });

  it('propagates deletion failures to abort the transaction without freeing the table', async () => {
    const s = setup();
    s.itemDeletion.exec.mockRejectedValue(new Error('Database error'));
    await expect(s.service.cancelOrder(12, 3, 7)).rejects.toThrow('Database error');
    expect(s.tables.setStatus).not.toHaveBeenCalled();
  });

  it('propagates table update failures to abort the transaction', async () => {
    const s = setup();
    s.tables.setStatus.mockRejectedValue(new Error('Table update failed'));
    await expect(s.service.cancelOrder(12, 3, 7)).rejects.toThrow('Table update failed');
  });
});

describe('Closed orders', () => {
  it('limits the list to the latest closed orders of the current bar', async () => {
    const query = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), populate: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([]) };
    const orders = { find: jest.fn().mockReturnValue(query) };
    const service = new OrdersService(orders as any, {} as any, {} as any, {} as any, {} as any);
    await service.findRecentClosed(7);
    expect(orders.find).toHaveBeenCalledWith({ barId: 7, status: 'cerrado' });
    expect(query.sort).toHaveBeenCalledWith({ closedAt: -1, id: -1 });
    expect(query.limit).toHaveBeenCalledWith(50);
  });

  it('only retrieves closed details in the current bar and rejects missing orders', async () => {
    const query = { populate: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(null) };
    const orders = { findOne: jest.fn().mockReturnValue(query) };
    const service = new OrdersService(orders as any, {} as any, {} as any, {} as any, {} as any);
    await expect(service.findClosed(12, 7)).rejects.toThrow('Orden cerrada no encontrada');
    expect(orders.findOne).toHaveBeenCalledWith({ id: 12, barId: 7, status: 'cerrado' });
  });
});
