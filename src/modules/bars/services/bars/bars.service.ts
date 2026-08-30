import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Bar } from '../../entities/bar.entity';
import { User } from '../../../users/entities/user.entity';
import { Table } from '../../../tables/entities/table.entity';
import { Category } from '../../../categories/entities/category.entity';
import { Product } from '../../../products/entities/product.entity';
import { Order } from '../../../orders/entities/order.entity';
import { OrderItem } from '../../../orders/entities/order-item.entity';

const TEMPLATE_BAR_ID = 2;

@Injectable()
export class BarsService implements OnModuleInit {
  constructor(
    @InjectRepository(Bar) private readonly barsRepository: Repository<Bar>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Table) private readonly tablesRepository: Repository<Table>,
    @InjectRepository(Category) private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Product) private readonly productsRepository: Repository<Product>,
    @InjectRepository(Order) private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem) private readonly orderItemsRepository: Repository<OrderItem>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    let defaultBar = await this.barsRepository.findOne({ where: { name: 'Bar principal' } });
    if (!defaultBar) {
      defaultBar = await this.barsRepository.save(
        this.barsRepository.create({ name: 'Bar principal' }),
      );
    }

    const barId = defaultBar.id;
    await Promise.all([
      this.usersRepository.update({ barId: IsNull() }, { barId }),
      this.tablesRepository.update({ barId: IsNull() }, { barId }),
      this.categoriesRepository.update({ barId: IsNull() }, { barId }),
      this.productsRepository.update({ barId: IsNull() }, { barId }),
      this.ordersRepository.update({ barId: IsNull() }, { barId }),
      this.orderItemsRepository.update({ barId: IsNull() }, { barId }),
    ]);
  }

  async createBarWithAdmin(
    name: string,
    username: string,
    passwordHash: string,
  ): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const bars = manager.getRepository(Bar);
      const users = manager.getRepository(User);
      const categories = manager.getRepository(Category);
      const products = manager.getRepository(Product);
      const tables = manager.getRepository(Table);

      const [existingBar, existingUser] = await Promise.all([
        bars.findOne({ where: { name } }),
        users.findOne({ where: { username } }),
      ]);
      if (existingBar) {
        throw new ConflictException('Ya existe un bar con ese nombre');
      }
      if (existingUser) {
        throw new ConflictException('Ese usuario ya está en uso');
      }

      const templateBar = await bars.findOne({
        where: { id: TEMPLATE_BAR_ID },
      });
      if (!templateBar) {
        throw new NotFoundException('No se encontró el bar plantilla');
      }

      const bar = await bars.save(bars.create({ name }));
      const templateCategories = await categories.find({
        where: { barId: templateBar.id },
        order: { order: 'ASC', id: 'ASC' },
      });
      const copiedCategories = await categories.save(
        templateCategories.map((category) =>
          categories.create({
            name: category.name,
            order: category.order,
            destination: category.destination,
            imageUrl: category.imageUrl,
            barId: bar.id,
          }),
        ),
      );
      const categoryIds = new Map(
        templateCategories.map((category, index) => [
          category.id,
          copiedCategories[index].id,
        ]),
      );

      const templateProducts = await products.find({
        where: { barId: templateBar.id },
        order: { id: 'ASC' },
      });
      await products.save(
        templateProducts.map((product) => {
          const categoryId = categoryIds.get(product.categoryId);
          if (!categoryId) {
            throw new NotFoundException('Un producto de la plantilla no tiene categoría');
          }
          return products.create({
            name: product.name,
            price: product.price,
            active: product.active,
            categoryId,
            imageUrl: product.imageUrl,
            barId: bar.id,
          });
        }),
      );

      const templateTables = await tables.find({
        where: { barId: templateBar.id },
        order: { id: 'ASC' },
      });
      await tables.save(
        templateTables.map((table) =>
          tables.create({
            name: table.name,
            zone: table.zone,
            status: 'libre',
            barId: bar.id,
          }),
        ),
      );

      return users.save(
        users.create({ username, passwordHash, role: 'admin', barId: bar.id }),
      );
    });
  }
}
