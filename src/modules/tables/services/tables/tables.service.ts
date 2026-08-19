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

  findAll(barId: number): Promise<Table[]> {
    return this.tablesRepository.find({ where: { barId }, order: { id: 'ASC' } });
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
    return this.tablesRepository.findOne({ where: { id, barId } });
  }

  async setStatus(id: number, barId: number, status: TableStatus): Promise<void> {
    await this.tablesRepository.update({ id, barId }, { status });
  }
}
