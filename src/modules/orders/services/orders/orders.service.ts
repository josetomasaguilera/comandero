import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderItem, OrderItemStatus } from '../../entities/order-item.entity';
import { Product } from '../../../products/entities/product.entity';
import { TablesService } from '../../../tables/services/tables/tables.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly tablesService: TablesService,
  ) {}

  findOpenOrderForTable(tableId: number): Promise<Order | null> {
    return this.ordersRepository.findOne({
      where: { tableId, status: 'abierto' },
      order: { id: 'DESC' },
    });
  }

  async openOrderForTable(tableId: number, waiterId: number): Promise<Order> {
    const existing = await this.findOpenOrderForTable(tableId);
    if (existing) {
      return existing;
    }
    const order = await this.ordersRepository.save(
      this.ordersRepository.create({ tableId, waiterId, status: 'abierto' }),
    );
    await this.tablesService.setStatus(tableId, 'ocupada');
    return { ...order, items: [] };
  }

  async findOrderWithItems(orderId: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    return order;
  }

  async addItem(
    orderId: number,
    productId: number,
    quantity: number,
    notes: string | null,
  ): Promise<OrderItem> {
    const normalizedNotes = notes || null;
    const existing = await this.orderItemsRepository.findOne({
      where: {
        orderId,
        productId,
        notes: normalizedNotes ?? IsNull(),
        status: 'pendiente',
      },
    });
    if (existing) {
      existing.quantity += quantity;
      return this.orderItemsRepository.save(existing);
    }

    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return this.orderItemsRepository.save(
      this.orderItemsRepository.create({
        orderId,
        productId,
        quantity,
        notes: normalizedNotes,
        destination: product.category.destination,
        status: 'pendiente',
      }),
    );
  }

  async incrementQuantity(itemId: number): Promise<OrderItem> {
    const item = await this.orderItemsRepository.findOne({
      where: { id: itemId },
      relations: { order: true },
    });
    if (!item) {
      throw new NotFoundException('Línea de pedido no encontrada');
    }
    item.quantity += 1;
    return this.orderItemsRepository.save(item);
  }

  async decrementQuantity(itemId: number): Promise<{ item: OrderItem; deleted: boolean }> {
    const item = await this.orderItemsRepository.findOne({
      where: { id: itemId },
      relations: { order: true },
    });
    if (!item) {
      throw new NotFoundException('Línea de pedido no encontrada');
    }
    return this.applyDecrement(item);
  }

  async decrementProductInOrder(
    orderId: number,
    productId: number,
  ): Promise<{ item: OrderItem; deleted: boolean } | null> {
    const item = await this.orderItemsRepository.findOne({
      where: { orderId, productId },
      relations: { order: true },
      order: { id: 'DESC' },
    });
    if (!item) {
      return null;
    }
    return this.applyDecrement(item);
  }

  private async applyDecrement(
    item: OrderItem,
  ): Promise<{ item: OrderItem; deleted: boolean }> {
    if (item.quantity <= 1) {
      await this.orderItemsRepository.remove(item);
      return { item, deleted: true };
    }
    item.quantity -= 1;
    await this.orderItemsRepository.save(item);
    return { item, deleted: false };
  }

  async setItemStatus(itemId: number, status: OrderItemStatus): Promise<OrderItem> {
    const item = await this.orderItemsRepository.findOne({
      where: { id: itemId },
      relations: { order: true },
    });
    if (!item) {
      throw new NotFoundException('Línea de pedido no encontrada');
    }
    item.status = status;
    return this.orderItemsRepository.save(item);
  }

  async closeOrder(orderId: number): Promise<void> {
    const order = await this.findOrderWithItems(orderId);
    order.status = 'cerrado';
    order.closedAt = new Date();
    await this.ordersRepository.save(order);
    await this.tablesService.setStatus(order.tableId, 'libre');
  }

  findKitchenPendingItems(): Promise<OrderItem[]> {
    return this.orderItemsRepository.find({
      where: { destination: 'cocina', status: 'pendiente' },
      relations: { order: { table: true } },
      order: { id: 'ASC' },
    });
  }
}
