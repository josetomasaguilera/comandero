import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AppModule } from './app.module';
import { IdGeneratorService } from './modules/database/id-generator.service';
import { Bar } from './modules/bars/entities/bar.schema';
import { User } from './modules/users/entities/user.schema';
import { Table, TableZone } from './modules/tables/entities/table.schema';
import { Category } from './modules/categories/entities/category.schema';
import { Product } from './modules/products/entities/product.schema';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ids = app.get(IdGeneratorService);
  const bars = app.get<Model<Bar>>(getModelToken(Bar.name));
  const users = app.get<Model<User>>(getModelToken(User.name));
  const tables = app.get<Model<Table>>(getModelToken(Table.name));
  const categories = app.get<Model<Category>>(getModelToken(Category.name));
  const products = app.get<Model<Product>>(getModelToken(Product.name));
  let bar = await bars.findOne({ name: 'Mi cafetería' }).exec();
  if (!bar) bar = await bars.create({ id: await ids.next('bars'), name: 'Mi cafetería' });
  if (!await tables.exists({ barId: bar.id })) {
    const zones: { zone: TableZone; label: string }[] = [{ zone: 'interior', label: 'Interior' }, { zone: 'terraza_a', label: 'Terraza A' }, { zone: 'terraza_b', label: 'Terraza B' }];
    for (const { zone, label } of zones) for (let i = 1; i <= 4; i++) await tables.create({ id: await ids.next('tables'), name: `${label} ${i}`, zone, status: 'libre', barId: bar.id });
  }
  if (!await users.exists({ barId: bar.id })) for (const user of [{ username: 'admin', role: 'admin' as const, password: 'admin123' }, { username: 'camarero', role: 'waiter' as const, password: 'camarero123' }, { username: 'cocina', role: 'kitchen' as const, password: 'cocina123' }]) await users.create({ id: await ids.next('users'), username: user.username, role: user.role, passwordHash: await bcrypt.hash(user.password, 10), barId: bar.id });
  if (!await categories.exists({ barId: bar.id })) {
    const categoryData = [['Cafés', 1, 'barra'], ['Bebidas', 2, 'barra'], ['Bollería', 3, 'barra'], ['Tostas', 4, 'cocina'], ['Platos combinados', 5, 'cocina']] as const;
    const created = new Map<string, Category>();
    for (const [name, order, destination] of categoryData) created.set(name, await categories.create({ id: await ids.next('categories'), name, order, destination, barId: bar.id }));
    const data = [['Café solo', 1.30, 'Cafés'], ['Café con leche', 1.60, 'Cafés'], ['Cortado', 1.50, 'Cafés'], ['Agua mineral', 1.50, 'Bebidas'], ['Refresco', 2.00, 'Bebidas'], ['Zumo natural', 2.50, 'Bebidas'], ['Croissant', 1.80, 'Bollería'], ['Napolitana de chocolate', 1.90, 'Bollería'], ['Tosta de tomate y jamón', 3.50, 'Tostas'], ['Tosta de aguacate', 3.80, 'Tostas'], ['Plato combinado 1 (huevo, bacon, patatas)', 7.50, 'Platos combinados'], ['Plato combinado 2 (pollo, ensalada, patatas)', 8.00, 'Platos combinados']] as const;
    for (const [name, price, categoryName] of data) await products.create({ id: await ids.next('products'), name, price, active: true, categoryId: created.get(categoryName)!.id, barId: bar.id });
  }
  await app.close();
}
seed().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
