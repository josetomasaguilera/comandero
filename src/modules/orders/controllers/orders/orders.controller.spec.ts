import { OrdersController } from './orders.controller';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  InjectConnection: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ virtual: jest.fn() }) },
}));

describe('Cancel order endpoint', () => {
  const setup = () => {
    const orders = { cancelOrder: jest.fn().mockResolvedValue(undefined) };
    const gateway = { notifyKitchenItemsUpdated: jest.fn(), notifyTableStatusChanged: jest.fn() };
    const controller = new OrdersController(orders as never, {} as never, {} as never, {} as never, gateway as never, {} as never);
    const req = { user: { id: 1, barId: 7 } };
    const res = { redirect: jest.fn() };
    return { controller, orders, gateway, req, res };
  };

  it('uses the authenticated bar, notifies kitchen and tables, and returns to tables', async () => {
    const s = setup();
    await s.controller.cancel(3, 12, s.res as never, s.req as never);
    expect(s.orders.cancelOrder).toHaveBeenCalledWith(12, 3, 7);
    expect(s.gateway.notifyKitchenItemsUpdated).toHaveBeenCalledWith(7, 3, '');
    expect(s.gateway.notifyTableStatusChanged).toHaveBeenCalledWith(7);
    expect(s.res.redirect).toHaveBeenCalledWith(303, '/tables');
  });

  it('does not announce cancellation when it fails', async () => {
    const s = setup();
    s.orders.cancelOrder.mockRejectedValue(new Error('Cancellation failed'));
    await expect(s.controller.cancel(3, 12, s.res as never, s.req as never)).rejects.toThrow('Cancellation failed');
    expect(s.gateway.notifyKitchenItemsUpdated).not.toHaveBeenCalled();
    expect(s.gateway.notifyTableStatusChanged).not.toHaveBeenCalled();
    expect(s.res.redirect).not.toHaveBeenCalled();
  });

  it('rejects users without a bar', async () => {
    const s = setup();
    await expect(s.controller.cancel(3, 12, s.res as never, { user: {} } as never)).rejects.toThrow('Usuario sin bar asignado');
    expect(s.orders.cancelOrder).not.toHaveBeenCalled();
  });
});
