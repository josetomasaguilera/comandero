import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class IdGeneratorService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async next(collection: string): Promise<number> {
    const counters = this.connection.db!.collection<{ _id: string; value: number }>('counters');
    const counter = await counters.findOneAndUpdate(
      { _id: collection },
      { $inc: { value: 1 } },
      { upsert: true, returnDocument: 'after' },
    );
    return counter?.value ?? 1;
  }
}
