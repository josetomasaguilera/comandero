import { OrdersGateway } from './orders.gateway';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  InjectConnection: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ virtual: jest.fn() }) },
}));

describe('Socket session versions', () => {
  it.each([1, { id: 1, version: 0 }])(
    'accepts compatible sessions: %j',
    async (identity) => {
      const users = {
        findById: jest
          .fn()
          .mockResolvedValue({
            id: 1,
            barId: 2,
            role: 'admin',
            sessionVersion: 0,
          }),
      };
      const billing = {
        access: jest.fn().mockResolvedValue({ allowed: true }),
      };
      const gateway = new OrdersGateway(users as never, billing as never);
      const client = {
        request: { session: { passport: { user: identity } } },
        data: { billingTimer: true },
        join: jest.fn(),
        disconnect: jest.fn(),
      };
      await gateway.handleJoin(client as never, { barId: 2, role: 'kitchen' });
      expect(users.findById).toHaveBeenCalledWith(1);
      expect(client.join).toHaveBeenCalledWith('bar:2:kitchen');
      users.findById.mockResolvedValue({
        id: 1,
        barId: 2,
        role: 'admin',
        sessionVersion: 1,
      });
      await gateway.handleJoin(client as never, { barId: 2, role: 'kitchen' });
      expect(client.disconnect).toHaveBeenCalled();
    },
  );
});

describe('Table change notifications', () => {
  it('keeps status changes separate from alias changes', () => {
    const waiters = { emit: jest.fn() };
    const kitchen = { emit: jest.fn() };
    const gateway = new OrdersGateway({} as never, {} as never);
    gateway.server = {
      to: jest.fn((room: string) => room.endsWith(':waiters') ? waiters : kitchen),
    } as never;

    gateway.notifyTableStatusChanged(7);
    expect(waiters.emit).toHaveBeenCalledWith('waiter:tablesChanged');
    expect(waiters.emit).not.toHaveBeenCalledWith('waiter:tableAliasChanged');

    gateway.notifyTableAliasChanged(7);
    expect(waiters.emit).toHaveBeenCalledWith('waiter:tableAliasChanged');
    expect(kitchen.emit).toHaveBeenCalledWith('kitchen:tableChanged');
  });
});
