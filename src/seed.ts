import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AppModule } from './app.module';
import { User } from './modules/users/entities/user.entity';
import { Table, TableZone } from './modules/tables/entities/table.entity';
import { Category } from './modules/categories/entities/category.entity';
import { Product } from './modules/products/entities/product.entity';
import { Bar } from './modules/bars/entities/bar.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const barsRepo = app.get<Repository<Bar>>(getRepositoryToken(Bar));
  const tablesRepo = app.get<Repository<Table>>(getRepositoryToken(Table));
  const categoriesRepo = app.get<Repository<Category>>(
    getRepositoryToken(Category),
  );
  const productsRepo = app.get<Repository<Product>>(
    getRepositoryToken(Product),
  );
  const bar = await barsRepo.findOneByOrFail({ name: 'Bar principal' });

  const existingTables = await tablesRepo.count();
  if (existingTables === 0) {
    const zones: { zone: TableZone; label: string }[] = [
      { zone: 'interior', label: 'Interior' },
      { zone: 'terraza_a', label: 'Terraza A' },
      { zone: 'terraza_b', label: 'Terraza B' },
    ];
    for (const { zone, label } of zones) {
      for (let i = 1; i <= 4; i++) {
        await tablesRepo.save(
          tablesRepo.create({ name: `${label} ${i}`, zone, status: 'libre', barId: bar.id }),
        );
      }
    }
    console.log('Mesas creadas: 12');
  }

  const existingUsers = await usersRepo.count();
  if (existingUsers === 0) {
    const users = [
      { username: 'admin', password: 'admin123', role: 'admin' as const },
      { username: 'camarero', password: 'camarero123', role: 'waiter' as const },
      { username: 'cocina', password: 'cocina123', role: 'kitchen' as const },
    ];
    for (const u of users) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await usersRepo.save(
        usersRepo.create({ username: u.username, passwordHash, role: u.role, barId: bar.id }),
      );
    }
    console.log('Usuarios creados: admin/admin123, camarero/camarero123, cocina/cocina123');
  }

  const existingCategories = await categoriesRepo.count();
  if (existingCategories === 0) {
    const categories = await categoriesRepo.save([
      categoriesRepo.create({ name: 'Cafés', order: 1, destination: 'barra', barId: bar.id }),
      categoriesRepo.create({ name: 'Bebidas', order: 2, destination: 'barra', barId: bar.id }),
      categoriesRepo.create({ name: 'Bollería', order: 3, destination: 'barra', barId: bar.id }),
      categoriesRepo.create({ name: 'Tostas', order: 4, destination: 'cocina', barId: bar.id }),
      categoriesRepo.create({ name: 'Platos combinados', order: 5, destination: 'cocina', barId: bar.id }),
    ]);
    console.log('Categorías creadas:', categories.length);

    const byName = Object.fromEntries(categories.map((c) => [c.name, c]));
    const products = [
      { name: 'Café solo', price: '1.30', categoryId: byName['Cafés'].id },
      { name: 'Café con leche', price: '1.60', categoryId: byName['Cafés'].id },
      { name: 'Cortado', price: '1.50', categoryId: byName['Cafés'].id },
      { name: 'Agua mineral', price: '1.50', categoryId: byName['Bebidas'].id },
      { name: 'Refresco', price: '2.00', categoryId: byName['Bebidas'].id },
      { name: 'Zumo natural', price: '2.50', categoryId: byName['Bebidas'].id },
      { name: 'Croissant', price: '1.80', categoryId: byName['Bollería'].id },
      { name: 'Napolitana de chocolate', price: '1.90', categoryId: byName['Bollería'].id },
      { name: 'Tosta de tomate y jamón', price: '3.50', categoryId: byName['Tostas'].id },
      { name: 'Tosta de aguacate', price: '3.80', categoryId: byName['Tostas'].id },
      { name: 'Plato combinado 1 (huevo, bacon, patatas)', price: '7.50', categoryId: byName['Platos combinados'].id },
      { name: 'Plato combinado 2 (pollo, ensalada, patatas)', price: '8.00', categoryId: byName['Platos combinados'].id },
    ];
    for (const p of products) {
      await productsRepo.save(productsRepo.create({ ...p, active: true, barId: bar.id }));
    }
    console.log('Productos creados:', products.length);
  }

  await app.close();
}

seed()
  .then(() => {
    console.log('Seed completado.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error en el seed:', err);
    process.exit(1);
  });
