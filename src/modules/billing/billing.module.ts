import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Bar, BarSchema } from '../bars/entities/bar.schema';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Bar.name, schema: BarSchema }])],
  providers: [BillingService],
  controllers: [BillingController],
  exports: [BillingService],
})
export class BillingModule {}
