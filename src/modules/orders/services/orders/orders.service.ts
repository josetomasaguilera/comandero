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

  findOpenOrderForTable(tableId: number, barId: number): Promise<Order | null> {
    return this.ordersRepository.findOne({
      where: { tableId, barId, status: 'abierto' },
      order: { id: 'DESC' },
    });
  }

  async openOrderForTable(tableId: number, waiterId: number, barId: number): Promise<Order> {
    const table = await this.tablesService.findOne(tableId, barId);
    if (!table) {
      throw new NotFoundException('Mesa no encontrada');
    }
    const existing = await this.findOpenOrderForTable(tableId, barId);
    if (existing) {
      return existing;
    }
    const order = await this.ordersRepository.save(
      this.ordersRepository.create({ tableId, waiterId, barId, status: 'abierto' }),
    );
    await this.tablesService.setStatus(tableId, barId, 'ocupada');
    return { ...order, items: [] };
  }

  async findOrderWithItems(orderId: number, barId: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, barId },
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
    barId: number,
  ): Promise<OrderItem> {
    const normalizedNotes = notes || null;
    const existing = await this.orderItemsRepository.findOne({
      where: {
        orderId,
        productId,
        notes: normalizedNotes ?? IsNull(),
        status: 'pendiente',
        barId,
      },
    });
    if (existing) {
      existing.quantity += quantity;
      return this.orderItemsRepository.save(existing);
    }

    const product = await this.productsRepository.findOne({
      where: { id: productId, barId },
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
        barId,
      }),
    );
  }

  async incrementQuantity(itemId: number, barId: number): Promise<OrderItem> {
    const item = await this.orderItemsRepository.findOne({
      where: { id: itemId, barId },
      relations: { order: true },
    });
    if (!item) {
      throw new NotFoundException('Línea de pedido no encontrada');
    }
    item.quantity += 1;
    return this.orderItemsRepository.save(item);
  }

  async decrementQuantity(itemId: number, barId: number): Promise<{ item: OrderItem; deleted: boolean }> {
    const item = await this.orderItemsRepository.findOne({
      where: { id: itemId, barId },
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
    barId: number,
  ): Promise<{ item: OrderItem; deleted: boolean } | null> {
    const item = await this.orderItemsRepository.findOne({
      where: { orderId, productId, barId },
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

  async setItemStatus(itemId: number, barId: number, status: OrderItemStatus): Promise<OrderItem> {
    const item = await this.orderItemsRepository.findOne({
      where: { id: itemId, barId },
      relations: { order: true },
    });
    if (!item) {
      throw new NotFoundException('Línea de pedido no encontrada');
    }
    item.status = status;
    return this.orderItemsRepository.save(item);
  }

  async closeOrder(orderId: number, barId: number): Promise<void> {
    const order = await this.findOrderWithItems(orderId, barId);
    order.status = 'cerrado';
    order.closedAt = new Date();
    await this.ordersRepository.save(order);
    await this.tablesService.setStatus(order.tableId, barId, 'libre');
  }

  findKitchenPendingItems(barId: number): Promise<OrderItem[]> {
    return this.orderItemsRepository.find({
      where: { barId, destination: 'cocina', status: 'pendiente' },
      relations: { order: { table: true } },
      order: { id: 'ASC' },
    });
  }
}
