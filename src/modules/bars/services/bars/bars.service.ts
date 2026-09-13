import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bar } from '../../entities/bar.schema';
import { User } from '../../../users/entities/user.schema';
import { Table } from '../../../tables/entities/table.schema';
import { Category } from '../../../categories/entities/category.schema';
import { Product } from '../../../products/entities/product.schema';
import { IdGeneratorService } from '../../../database/id-generator.service';

const TEMPLATE_BAR_ID = 2;

@Injectable()
export class BarsService implements OnModuleInit {
  constructor(
    @InjectModel(Bar.name) private readonly bars: Model<Bar>,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Table.name) private readonly tables: Model<Table>,
    @InjectModel(Category.name) private readonly categories: Model<Category>,
    @InjectModel(Product.name) private readonly products: Model<Product>,
    private readonly ids: IdGeneratorService,
  ) {}

  async onModuleInit(): Promise<void> {
    let bar = await this.bars.findOne({ name: 'Mi cafetería' }).exec();
    if (!bar) bar = await this.bars.create({ id: await this.ids.next('bars'), name: 'Mi cafetería' });
  }

  async createBarWithAdmin(name: string, username: string, passwordHash: string): Promise<User> {
    const [existingBar, existingUser] = await Promise.all([
      this.bars.findOne({ name }).exec(), this.users.findOne({ username }).exec(),
    ]);
    if (existingBar) throw new ConflictException('Ya existe un bar con ese nombre');
    if (existingUser) throw new ConflictException('Ese usuario ya está en uso');
    const template = await this.bars.findOne({ id: TEMPLATE_BAR_ID }).exec();
    if (!template) throw new NotFoundException('No se encontró el bar plantilla');

    const bar = await this.bars.create({ id: await this.ids.next('bars'), name });
    const sourceCategories = await this.categories.find({ barId: template.id }).sort({ order: 1, id: 1 }).exec();
    const categoryIds = new Map<number, number>();
    for (const category of sourceCategories) {
      const id = await this.ids.next('categories');
      await this.categories.create({ id, name: category.name, order: category.order, destination: category.destination, imageUrl: category.imageUrl, barId: bar.id });
      categoryIds.set(category.id, id);
    }
    const sourceProducts = await this.products.find({ barId: template.id }).sort({ id: 1 }).exec();
    for (const product of sourceProducts) {
      const categoryId = categoryIds.get(product.categoryId);
      if (!categoryId) throw new NotFoundException('Un producto de la plantilla no tiene categoría');
      await this.products.create({ id: await this.ids.next('products'), name: product.name, price: product.price, active: product.active, categoryId, imageUrl: product.imageUrl, barId: bar.id });
    }
    const sourceTables = await this.tables.find({ barId: template.id }).sort({ id: 1 }).exec();
    for (const table of sourceTables) {
      await this.tables.create({ id: await this.ids.next('tables'), name: table.name, zone: table.zone, status: 'libre', barId: bar.id });
    }
    return this.users.create({ id: await this.ids.next('users'), username, passwordHash, role: 'admin', barId: bar.id });
  }
}
