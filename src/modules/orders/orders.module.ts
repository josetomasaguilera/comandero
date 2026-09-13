import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './entities/order.schema';
import { OrderItem, OrderItemSchema } from './entities/order-item.schema';
import { Product, ProductSchema } from '../products/entities/product.schema';
import { OrdersService } from './services/orders/orders.service';
import { OrdersController } from './controllers/orders/orders.controller';
import { TablesModule } from '../tables/tables.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';
import { EventsModule } from '../events/events.module';
import { VoiceOrderModule } from '../voice-order/voice-order.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderItem.name, schema: OrderItemSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    TablesModule,
    CategoriesModule,
    ProductsModule,
    EventsModule,
    VoiceOrderModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
