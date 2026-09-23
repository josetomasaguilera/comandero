import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class IdGeneratorService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async next(collection: string): Promise<number> {
    const db = this.connection.db!;
    const latest = await db.collection(collection).findOne(
      { id: { $type: 'number' } },
      { sort: { id: -1 }, projection: { id: 1 } },
    );
    const highestId = latest?.id ?? 0;
    const counters = db.collection<{ _id: string; value: number }>('counters');
    const counter = await counters.findOneAndUpdate(
      { _id: collection },
      // Reconcile imported data without moving the counter backwards. The
      // increment remains atomic when multiple instances request an ID.
      [{ $set: { value: { $add: [
        { $max: [{ $ifNull: ['$value', 0] }, highestId] },
        1,
      ] } } }],
      { upsert: true, returnDocument: 'after' },
    );
    if (!counter) throw new Error(`No se pudo generar un ID para ${collection}`);
    return counter.value;
  }
}
