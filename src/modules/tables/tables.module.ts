import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Table, TableSchema } from './entities/table.schema';
import { TablesController } from './controllers/tables/tables.controller';
import { TablesService } from './services/tables/tables.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Table.name, schema: TableSchema }]), EventsModule],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
