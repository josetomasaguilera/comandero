import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
export type TableZone = 'interior' | 'terraza_a' | 'terraza_b';
export type TableStatus = 'libre' | 'reservada' | 'ocupada';
@Schema({ collection: 'tables', versionKey: false })
export class Table {
  @Prop({ required: true, unique: true }) id: number;
  @Prop({ required: true }) name: string;
  @Prop({ required: true, enum: ['interior', 'terraza_a', 'terraza_b'] }) zone: TableZone;
  @Prop({ default: 'libre', enum: ['libre', 'reservada', 'ocupada'] }) status: TableStatus;
  @Prop({ required: true, index: true }) barId: number;
}
export const TableSchema = SchemaFactory.createForClass(Table);
