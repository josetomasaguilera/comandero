import { Module } from '@nestjs/common';
import { OrdersGateway } from './orders.gateway';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [OrdersGateway],
  exports: [OrdersGateway],
})
export class EventsModule {}
