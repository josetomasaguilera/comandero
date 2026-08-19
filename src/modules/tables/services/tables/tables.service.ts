import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table, TableStatus, TableZone } from '../../entities/table.entity';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private readonly tablesRepository: Repository<Table>,
  ) {}

  findAll(): Promise<Table[]> {
    return this.tablesRepository.find({ order: { id: 'ASC' } });
  }

  async findAllGroupedByZone(): Promise<Record<TableZone, Table[]>> {
    const tables = await this.findAll();
    return {
      interior: tables.filter((t) => t.zone === 'interior'),
      terraza_a: tables.filter((t) => t.zone === 'terraza_a'),
      terraza_b: tables.filter((t) => t.zone === 'terraza_b'),
    };
  }

  findOne(id: number): Promise<Table | null> {
    return this.tablesRepository.findOne({ where: { id } });
  }

  async setStatus(id: number, status: TableStatus): Promise<void> {
    await this.tablesRepository.update({ id }, { status });
  }
}
