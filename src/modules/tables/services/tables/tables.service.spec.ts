import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TablesService } from './tables.service';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  InjectConnection: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ virtual: jest.fn() }) },
}));

describe('Table maintenance', () => {
  const setup = (table: unknown = { status: 'libre' }, hasOrders = false) => {
    const repository = {
      findOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(table) }),
      create: jest.fn().mockImplementation(async (data) => data),
      updateOne: jest
        .fn()
        .mockReturnValue({
          exec: jest.fn().mockResolvedValue({ matchedCount: 1 }),
        }),
      deleteOne: jest
        .fn()
        .mockReturnValue({
          exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
        }),
    };
    const orders = {
      exists: jest.fn().mockResolvedValue(hasOrders ? { _id: 'order' } : null),
    };
    const service = new TablesService(
      repository as any,
      { next: async () => 42 } as any,
      orders as any,
    );
    return { service, repository, orders };
  };

  it('creates a free table in the current bar with a generated ID', async () => {
    const { service } = setup();
    expect(
      await service.create(7, { name: 'Mesa 1', zone: 'interior' }),
    ).toEqual({
      id: 42,
      barId: 7,
      name: 'Mesa 1',
      zone: 'interior',
      status: 'libre',
    });
  });

  it('limits edits to the current bar and preserves operational status', async () => {
    const { service, repository } = setup();
    await service.update(42, 7, { name: 'Mesa 2', zone: 'terraza_a' });
    expect(repository.updateOne).toHaveBeenCalledWith(
      { id: 42, barId: 7 },
      { $set: { name: 'Mesa 2', zone: 'terraza_a' } },
      { runValidators: true },
    );
  });

  it('sets a trimmed temporary name only while the table is occupied', async () => {
    const { service, repository } = setup({ status: 'ocupada' });
    await service.setTemporaryName(42, 7, '  Cumpleaños  ');
    expect(repository.updateOne).toHaveBeenCalledWith(
      { id: 42, barId: 7, status: 'ocupada' },
      { $set: { temporaryName: 'Cumpleaños' } },
    );
  });

  it('rejects invalid temporary names and tables that are not occupied', async () => {
    const { service, repository } = setup({ status: 'libre' });
    await expect(service.setTemporaryName(42, 7, '  ')).rejects.toThrow(BadRequestException);
    await expect(service.setTemporaryName(42, 7, 'x'.repeat(61))).rejects.toThrow(BadRequestException);
    await expect(service.setTemporaryName(42, 7, 'Cumpleaños')).rejects.toThrow(BadRequestException);
    expect(repository.updateOne).not.toHaveBeenCalled();
  });

  it('clears a temporary name when freeing a table', async () => {
    const { service, repository } = setup();
    await service.setStatus(42, 7, 'libre');
    expect(repository.updateOne).toHaveBeenNthCalledWith(
      1,
      { id: 42, barId: 7 },
      { status: 'libre' },
    );
    expect(repository.updateOne).toHaveBeenNthCalledWith(
      2,
      { id: 42, barId: 7 },
      { $unset: { temporaryName: 1 } },
    );
  });

  it('does not clear the alias when a status update finds no table', async () => {
    const { service, repository } = setup();
    repository.updateOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ matchedCount: 0 }),
    });
    await expect(service.setStatus(42, 7, 'libre')).rejects.toThrow(NotFoundException);
    expect(repository.updateOne).toHaveBeenCalledTimes(1);
  });

  it('does not edit a missing table or one belonging to another bar', async () => {
    const { service, repository } = setup();
    repository.updateOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ matchedCount: 0 }),
    });
    await expect(
      service.update(42, 7, { name: 'Mesa', zone: 'interior' }),
    ).rejects.toThrow(NotFoundException);
  });

  it.each(['ocupada', 'reservada'])(
    'prevents deletion of a %s table',
    async (status) => {
      const { service, repository } = setup({ status });
      await expect(service.remove(42, 7)).rejects.toThrow(BadRequestException);
      expect(repository.deleteOne).not.toHaveBeenCalled();
    },
  );

  it('preserves tables referenced by historical orders', async () => {
    const { service, repository, orders } = setup({ status: 'libre' }, true);
    await expect(service.remove(42, 7)).rejects.toThrow(BadRequestException);
    expect(orders.exists).toHaveBeenCalledWith({ tableId: 42, barId: 7 });
    expect(repository.deleteOne).not.toHaveBeenCalled();
  });

  it('does not delete tables outside the current bar', async () => {
    const { service, repository } = setup(null);
    await expect(service.remove(42, 7)).rejects.toThrow(NotFoundException);
    expect(repository.findOne).toHaveBeenCalledWith({ id: 42, barId: 7 });
    expect(repository.deleteOne).not.toHaveBeenCalled();
  });

  it('deletes unused free tables in the current bar', async () => {
    const { service, repository } = setup();
    await service.remove(42, 7);
    expect(repository.deleteOne).toHaveBeenCalledWith({
      id: 42,
      barId: 7,
      status: 'libre',
    });
  });
});
