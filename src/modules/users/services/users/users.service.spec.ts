import { UsersService } from './users.service';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  InjectConnection: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ virtual: jest.fn() }) },
}));

describe('User administration', () => {
  const query = (value: unknown) => ({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(value) });
  const setup = () => {
    const repository = {
      findOne: jest.fn().mockReturnValue(query({ id: 2 })),
      updateOne: jest.fn().mockReturnValue(query({ matchedCount: 1 })),
      deleteOne: jest.fn().mockReturnValue(query({ deletedCount: 1 })),
      create: jest.fn(),
    };
    return { repository, service: new UsersService(repository as never, { next: jest.fn().mockResolvedValue(3) } as never) };
  };
  const body = { username: 'camarero', email: '', role: 'waiter', password: '' };

  it('scopes updates to the current bar and preserves an unchanged password', async () => {
    const { repository, service } = setup();
    await service.saveForBar(10, 1, { ...body, barId: 999, passwordHash: 'injected' }, 2);
    expect(repository.findOne).toHaveBeenCalledWith({ id: 2, barId: 10 });
    expect(repository.updateOne).toHaveBeenCalledWith({ id: 2, barId: 10 }, { $set: { username: 'camarero', email: '', role: 'waiter' } }, { runValidators: true });
  });

  it('rejects updates to a user outside the bar', async () => {
    const { repository, service } = setup();
    repository.findOne.mockReturnValue(query(null));
    await expect(service.saveForBar(10, 1, body, 2)).rejects.toThrow('Usuario no encontrado');
    expect(repository.updateOne).not.toHaveBeenCalled();
  });

  it('prevents self-deletion and self-demotion', async () => {
    const { repository, service } = setup();
    await expect(service.removeForBar(1, 10, 1)).rejects.toThrow('propia cuenta');
    await expect(service.saveForBar(10, 1, body, 1)).rejects.toThrow('rol de administrador');
    expect(repository.deleteOne).not.toHaveBeenCalled();
    expect(repository.updateOne).not.toHaveBeenCalled();
  });

  it('scopes deletion to the bar', async () => {
    const { repository, service } = setup();
    await service.removeForBar(2, 10, 1);
    expect(repository.deleteOne).toHaveBeenCalledWith({ id: 2, barId: 10 });
  });

  it('requires a valid role and a password on creation', async () => {
    const { repository, service } = setup();
    await expect(service.saveForBar(10, 1, body)).rejects.toThrow('contraseña');
    await expect(service.saveForBar(10, 1, { ...body, role: 'owner' })).rejects.toThrow('rol válido');
    expect(repository.create).not.toHaveBeenCalled();
  });
});
