import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Table, TableStatus, TableZone } from '../../entities/table.schema';
import { IdGeneratorService } from '../../../database/id-generator.service';
import { Order } from '../../../orders/entities/order.schema';

@Injectable()
export class TablesService {
  constructor(
    @InjectModel(Table.name) private readonly tablesRepository: Model<Table>,
    private readonly ids: IdGeneratorService,
    @InjectModel(Order.name) private readonly ordersRepository: Model<Order>,
  ) {}

  findAll(barId: number): Promise<Table[]> {
    return this.tablesRepository.find({ barId }).sort({ id: 1 }).exec();
  }

  async findAllGroupedByZone(
    barId: number,
  ): Promise<Record<TableZone, Table[]>> {
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

  async create(
    barId: number,
    data: Pick<Table, 'name' | 'zone'>,
  ): Promise<Table> {
    return this.tablesRepository.create({
      name: data.name,
      zone: data.zone,
      id: await this.ids.next('tables'),
      barId,
      status: 'libre',
    });
  }

  async update(
    id: number,
    barId: number,
    data: Pick<Table, 'name' | 'zone'>,
  ): Promise<void> {
    const result = await this.tablesRepository
      .updateOne(
        { id, barId },
        { $set: { name: data.name, zone: data.zone } },
        { runValidators: true },
      )
      .exec();
    if (!result.matchedCount) throw new NotFoundException('Mesa no encontrada');
  }

  async remove(id: number, barId: number): Promise<void> {
    const table = await this.findOne(id, barId);
    if (!table) throw new NotFoundException('Mesa no encontrada');
    if (table.status !== 'libre') {
      throw new BadRequestException(
        'No se puede eliminar una mesa ocupada o reservada',
      );
    }
    if (await this.ordersRepository.exists({ tableId: id, barId })) {
      throw new BadRequestException(
        'No se puede eliminar una mesa con comandas. Puedes cambiar su nombre o zona',
      );
    }
    const result = await this.tablesRepository
      .deleteOne({ id, barId, status: 'libre' })
      .exec();
    if (!result.deletedCount)
      throw new BadRequestException(
        'La mesa ya no está disponible para eliminar',
      );
  }

  async setStatus(
    id: number,
    barId: number,
    status: TableStatus,
    session?: ClientSession,
  ): Promise<void> {
    const query = this.tablesRepository.updateOne({ id, barId }, { status });
    if (session) query.session(session);
    await query.exec();
  }
}
