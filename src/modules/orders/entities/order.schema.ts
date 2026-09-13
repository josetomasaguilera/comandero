import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Table } from '../../tables/entities/table.schema';
import { OrderItem } from './order-item.schema';
export type OrderStatus = 'abierto' | 'cerrado';
@Schema({ collection: 'orders', timestamps: { createdAt: true, updatedAt: false }, versionKey: false })
export class Order {
  @Prop({ required: true, unique: true }) id: number;
  @Prop({ required: true, index: true }) tableId: number;
  table: Table;
  @Prop({ required: true }) waiterId: number;
  @Prop({ default: 'abierto', enum: ['abierto', 'cerrado'] }) status: OrderStatus;
  items: OrderItem[];
  createdAt: Date;
  @Prop({ default: null, type: Date }) closedAt: Date | null;
  @Prop({ required: true, index: true }) barId: number;
}
export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.virtual('table', { ref: 'Table', localField: 'tableId', foreignField: 'id', justOne: true });
OrderSchema.virtual('items', { ref: 'OrderItem', localField: 'id', foreignField: 'orderId' });
