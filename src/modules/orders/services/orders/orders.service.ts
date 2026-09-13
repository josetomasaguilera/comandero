import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '../../entities/order.schema';
import { OrderItem, OrderItemStatus } from '../../entities/order-item.schema';
import { Product } from '../../../products/entities/product.schema';
import { IdGeneratorService } from '../../../database/id-generator.service';
import { TablesService } from '../../../tables/services/tables/tables.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(OrderItem.name) private readonly items: Model<OrderItem>,
    @InjectModel(Product.name) private readonly products: Model<Product>,
    private readonly ids: IdGeneratorService,
    private readonly tables: TablesService,
  ) {}

  findOpenOrderForTable(tableId: number, barId: number): Promise<Order | null> {
    return this.orders
      .findOne({ tableId, barId, status: 'abierto' })
      .sort({ id: -1 })
      .populate({ path: 'items', populate: { path: 'product' } })
      .populate('table')
      .exec();
  }
  async openOrderForTable(tableId: number, waiterId: number, barId: number): Promise<Order> {
    if (!(await this.tables.findOne(tableId, barId))) throw new NotFoundException('Mesa no encontrada');
    const existing = await this.findOpenOrderForTable(tableId, barId);
    if (existing) return existing;
    const order = await this.orders.create({ id: await this.ids.next('orders'), tableId, waiterId, barId, status: 'abierto' });
    await this.tables.setStatus(tableId, barId, 'ocupada');
    return Object.assign(order, { items: [] });
  }
  async findOrderWithItems(orderId: number, barId: number): Promise<Order> {
    const order = await this.orders
      .findOne({ id: orderId, barId })
      .populate({ path: 'items', populate: { path: 'product' } })
      .populate('table')
      .exec();
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }
  async addItem(orderId: number, productId: number, quantity: number, notes: string | null, barId: number): Promise<OrderItem> {
    const normalizedNotes = notes || null;
    const existing = await this.items.findOne({ orderId, productId, notes: normalizedNotes, status: 'pendiente', barId }).exec();
    if (existing) { existing.quantity += quantity; return existing.save(); }
    const product = await this.products.findOne({ id: productId, barId }).populate('category').exec();
    if (!product?.category) throw new NotFoundException('Producto no encontrado');
    return this.items.create({ id: await this.ids.next('orderItems'), orderId, productId, quantity, notes: normalizedNotes, destination: product.category.destination, status: 'pendiente', barId });
  }
  async incrementQuantity(itemId: number, barId: number): Promise<OrderItem> {
    const item = await this.item(itemId, barId); item.quantity += 1; return item.save();
  }
  async decrementQuantity(itemId: number, barId: number) { return this.decrement(await this.item(itemId, barId)); }
  async decrementProductInOrder(orderId: number, productId: number, barId: number) {
    const item = await this.items.findOne({ orderId, productId, barId }).sort({ id: -1 }).exec();
    return item ? this.decrement(item) : null;
  }
  private async item(id: number, barId: number) {
    const item = await this.items.findOne({ id, barId }).populate('order').exec();
    if (!item) throw new NotFoundException('Línea de pedido no encontrada');
    return item;
  }
  private async decrement(item: any) {
    if (item.quantity <= 1) { await this.items.deleteOne({ id: item.id }).exec(); return { item, deleted: true }; }
    item.quantity -= 1; await item.save(); return { item, deleted: false };
  }
  async setItemStatus(itemId: number, barId: number, status: OrderItemStatus): Promise<OrderItem> {
    const item = await this.item(itemId, barId); item.status = status; return item.save();
  }
  async closeOrder(orderId: number, barId: number): Promise<void> {
    const order = await this.findOrderWithItems(orderId, barId); order.status = 'cerrado'; order.closedAt = new Date(); await (order as any).save(); await this.tables.setStatus(order.tableId, barId, 'libre');
  }
  findKitchenPendingItems(barId: number): Promise<OrderItem[]> {
    return this.items
      .find({ barId, destination: 'cocina', status: 'pendiente' })
      .sort({ id: 1 })
      .populate('product')
      .populate({ path: 'order', populate: { path: 'table' } })
      .exec();
  }
}
