import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bar } from './entities/bar.entity';
import { BarsService } from './services/bars/bars.service';
import { User } from '../users/entities/user.entity';
import { Table } from '../tables/entities/table.entity';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bar, User, Table, Category, Product, Order, OrderItem])],
  providers: [BarsService],
  exports: [BarsService],
})
export class BarsModule {}
