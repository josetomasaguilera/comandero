import { SessionSerializer } from './session.serializer';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  InjectConnection: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ virtual: jest.fn() }) },
}));

describe('Session versions', () => {
  it('accepts legacy sessions until a password reset and rejects stale sessions', async () => {
    const user = { id: 1, sessionVersion: 0 };
    const users = { findById: jest.fn().mockResolvedValue(user) };
    const serializer = new SessionSerializer(users as never);
    const done = jest.fn();
    await serializer.deserializeUser(1, done);
    expect(done).toHaveBeenLastCalledWith(null, user);
    user.sessionVersion = 1;
    await serializer.deserializeUser(1, done);
    expect(done).toHaveBeenLastCalledWith(null, null);
    await serializer.deserializeUser({ id: 1, version: 0 }, done);
    expect(done).toHaveBeenLastCalledWith(null, null);
    await serializer.deserializeUser({ id: 1, version: 1 }, done);
    expect(done).toHaveBeenLastCalledWith(null, user);
    serializer.serializeUser(user as never, done);
    expect(done).toHaveBeenLastCalledWith(null, { id: 1, version: 1 });
  });
});
