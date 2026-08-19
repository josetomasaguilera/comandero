import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { EventsModule } from '../events/events.module';
import { KitchenController } from './controllers/kitchen/kitchen.controller';

@Module({
  imports: [OrdersModule, EventsModule],
  controllers: [KitchenController],
})
export class KitchenModule {}
