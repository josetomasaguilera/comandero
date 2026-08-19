import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Bar } from '../../entities/bar.entity';
import { User } from '../../../users/entities/user.entity';
import { Table } from '../../../tables/entities/table.entity';
import { Category } from '../../../categories/entities/category.entity';
import { Product } from '../../../products/entities/product.entity';
import { Order } from '../../../orders/entities/order.entity';
import { OrderItem } from '../../../orders/entities/order-item.entity';

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
}
