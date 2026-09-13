import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CategoryDestination } from '../../categories/entities/category.schema';
import { Product } from '../../products/entities/product.schema';
import { Order } from './order.schema';
export type OrderItemStatus = 'pendiente' | 'listo' | 'servido';
@Schema({ collection: 'orderItems', versionKey: false })
export class OrderItem {
  @Prop({ required: true, unique: true }) id: number;
  @Prop({ required: true, index: true }) orderId: number;
  order: Order;
  @Prop({ required: true }) productId: number;
  product: Product;
  @Prop({ default: 1 }) quantity: number;
  @Prop({ default: null, type: String }) notes: string | null;
  @Prop({ required: true, enum: ['cocina', 'barra'] }) destination: CategoryDestination;
  @Prop({ default: 'pendiente', enum: ['pendiente', 'listo', 'servido'] }) status: OrderItemStatus;
  @Prop({ required: true, index: true }) barId: number;
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
OrderItemSchema.virtual('order', { ref: 'Order', localField: 'orderId', foreignField: 'id', justOne: true });
OrderItemSchema.virtual('product', { ref: 'Product', localField: 'productId', foreignField: 'id', justOne: true });
