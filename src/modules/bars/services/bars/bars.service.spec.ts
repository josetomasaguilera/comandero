import { BarsService } from './bars.service';

// Isolate the service from Mongoose's ESM decorators in this unit test.
jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  InjectConnection: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ virtual: jest.fn() }) },
}));

describe('BarsService.createBarWithAdmin', () => {
  it('links copied products to the category ID actually saved', async () => {
    const query = (value: unknown) => ({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(value),
    });
    const bars = {
      findOne: jest.fn()
        .mockReturnValueOnce(query(null))
        .mockReturnValueOnce(query({ id: 1 })),
      create: jest.fn().mockImplementation(async (value) => value),
    };
    const users = {
      findOne: jest.fn().mockReturnValue(query(null)),
      create: jest.fn().mockImplementation(async (value) => value),
    };
    const categories = {
      find: jest.fn().mockReturnValue(query([
        { id: 5, name: 'Comida', order: 1, destination: 'cocina' },
      ])),
      create: jest.fn().mockResolvedValue(undefined),
    };
    const products = {
      find: jest.fn().mockReturnValue(query([
        { id: 3, name: 'Tostada', categoryId: 5, price: 2, active: true },
      ])),
      create: jest.fn().mockResolvedValue(undefined),
    };
    const tables = { find: jest.fn().mockReturnValue(query([])) };
    let nextId = 10;
    const ids = { next: jest.fn(async (_collection: string) => ++nextId) };
    const service = new BarsService(
      bars as never, users as never, tables as never,
      categories as never, products as never, ids as never,
    );

    await service.createBarWithAdmin('Nuevo bar', 'admin', 'hash', 'admin@example.com');

    const savedCategory = categories.create.mock.calls[0][0];
    expect(products.create).toHaveBeenCalledWith(expect.objectContaining({
      categoryId: savedCategory.id,
      barId: savedCategory.barId,
    }));
    expect(ids.next.mock.calls.filter(([collection]) => collection === 'categories')).toHaveLength(1);
    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'admin@example.com' }));
  });
});
