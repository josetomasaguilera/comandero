import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Bar, BarSchema } from './entities/bar.schema';
import { BarsService } from './services/bars/bars.service';
import { User, UserSchema } from '../users/entities/user.schema';
import { Table, TableSchema } from '../tables/entities/table.schema';
import { Category, CategorySchema } from '../categories/entities/category.schema';
import { Product, ProductSchema } from '../products/entities/product.schema';
import { Order, OrderSchema } from '../orders/entities/order.schema';
import { OrderItem, OrderItemSchema } from '../orders/entities/order-item.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Bar.name, schema: BarSchema }, { name: User.name, schema: UserSchema },
    { name: Table.name, schema: TableSchema }, { name: Category.name, schema: CategorySchema },
    { name: Product.name, schema: ProductSchema }, { name: Order.name, schema: OrderSchema },
    { name: OrderItem.name, schema: OrderItemSchema },
  ])],
  providers: [BarsService],
  exports: [BarsService],
})
export class BarsModule {}
