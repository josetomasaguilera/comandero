import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Table, TableStatus, TableZone } from '../../entities/table.schema';

@Injectable()
export class TablesService {
  constructor(
    @InjectModel(Table.name) private readonly tablesRepository: Model<Table>,
  ) {}

  findAll(barId: number): Promise<Table[]> {
    return this.tablesRepository.find({ barId }).sort({ id: 1 }).exec();
  }

  async findAllGroupedByZone(barId: number): Promise<Record<TableZone, Table[]>> {
    const tables = await this.findAll(barId);
    return {
      interior: tables.filter((t) => t.zone === 'interior'),
      terraza_a: tables.filter((t) => t.zone === 'terraza_a'),
      terraza_b: tables.filter((t) => t.zone === 'terraza_b'),
    };
  }

  findOne(id: number, barId: number): Promise<Table | null> {
    return this.tablesRepository.findOne({ id, barId }).exec();
  }

  async setStatus(id: number, barId: number, status: TableStatus): Promise<void> {
    await this.tablesRepository.updateOne({ id, barId }, { status }).exec();
  }
}
