import {
  Body,
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  ForbiddenException,
  Param,
  ParseIntPipe,
  Post,
  Render,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthenticatedGuard } from '../../../auth/guards/authenticated.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { OrdersService } from '../../services/orders/orders.service';
import { TablesService } from '../../../tables/services/tables/tables.service';
import { CategoriesService } from '../../../categories/services/categories/categories.service';
import { ProductsService } from '../../../products/services/products/products.service';
import { OrdersGateway } from '../../../events/orders.gateway';
import { User } from '../../../users/entities/user.entity';
import { VoiceOrderService } from '../../../voice-order/services/voice-order/voice-order.service';

@Controller('tables/:tableId/order')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('waiter', 'admin')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly tablesService: TablesService,
    private readonly categoriesService: CategoriesService,
    private readonly productsService: ProductsService,
    private readonly ordersGateway: OrdersGateway,
    private readonly voiceOrderService: VoiceOrderService,
  ) {}

  @Get()
  @Render('orders/show')
  async show(
    @Param('tableId', ParseIntPipe) tableId: number,
    @Req() req: Request,
  ) {
    const waiter = req.user as User;
    const barId = this.barIdFor(waiter);
    const table = await this.tablesService.findOne(tableId, barId);
    if (!table) {
      throw new NotFoundException('Mesa no encontrada');
    }
    const wasOccupied = table.status === 'ocupada';
    const order = await this.ordersService.openOrderForTable(tableId, waiter.id, barId);
    if (!wasOccupied) {
      this.ordersGateway.notifyTableStatusChanged(barId);
    }
    const categories = await this.categoriesService.findAll(barId);
    const voiceTables = await this.tablesService.findAll(barId);

    return {
      title: `Mesa ${table.name}`,
      table,
      order,
      categories,
      voiceTables,
      voiceOrderingEnabled: Boolean(waiter.bar?.voiceOrderingEnabled),
    };
  }

  @Post('voice/interpret')
  async interpretVoiceOrder(
    @Param('tableId', ParseIntPipe) tableId: number,
    @Body() body: { transcript?: string },
    @Req() req: Request,
  ) {
    const user = req.user as User;
    if (!user.bar?.voiceOrderingEnabled) {
      throw new ForbiddenException('El módulo de pedidos por voz no está activo para este bar');
    }
    const barId = this.barIdFor(user);
    const table = await this.tablesService.findOne(tableId, barId);
    if (!table) {
      throw new NotFoundException('Mesa no encontrada');
    }
    const transcript = body.transcript?.trim();
    if (!transcript || transcript.length > 500) {
      throw new BadRequestException('Comanda de voz no válida');
    }

    const [products, tables] = await Promise.all([
      this.productsService.findActive(barId),
      this.tablesService.findAll(barId),
    ]);
    const interpretation = await this.voiceOrderService.interpret(
      transcript,
      products,
      tables,
    );
    const productsById = new Map(products.map((product) => [product.id, product]));
    const items = interpretation.items.flatMap(({ productId, quantity, notes }) => {
      const product = productsById.get(productId);
      return product && Number.isInteger(quantity) && quantity > 0 && quantity <= 20 && typeof notes === 'string'
        ? [{ id: product.id, name: product.name, quantity, notes: notes.trim().slice(0, 250) }]
        : [];
    });

    const targetTable = tables.find((candidate) => candidate.id === interpretation.tableId);
    return {
      tableId: targetTable?.id ?? table.id,
      tableName: targetTable?.name ?? table.name,
      items,
      unmatched: interpretation.unmatched,
    };
  }

  @Get('categories/:categoryId')
  @Render('orders/category')
  async showCategory(
    @Param('tableId', ParseIntPipe) tableId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Req() req: Request,
  ) {
    const waiter = req.user as User;
    const barId = this.barIdFor(waiter);
    const table = await this.tablesService.findOne(tableId, barId);
    if (!table) {
      throw new NotFoundException('Mesa no encontrada');
    }
    const category = await this.categoriesService.findOne(categoryId, barId);
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    const order = await this.ordersService.openOrderForTable(tableId, waiter.id, barId);
    const products = await this.productsService.findActiveByCategory(barId, categoryId);

    return {
      title: `Mesa ${table.name} · ${category.name}`,
      table,
      order,
      category,
      products,
    };
  }

  @Post('items')
  async addItem(
    @Param('tableId', ParseIntPipe) tableId: number,
    @Body() body: { productId: string; quantity?: string; notes?: string },
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const waiter = req.user as User;
    const barId = this.barIdFor(waiter);
    const order = await this.ordersService.openOrderForTable(tableId, waiter.id, barId);
    const item = await this.ordersService.addItem(
      order.id,
      Number(body.productId),
      Number(body.quantity) || 1,
      body.notes || null,
      barId,
    );
    if (item.destination === 'cocina') {
      const table = await this.tablesService.findOne(tableId, barId);
      this.ordersGateway.notifyKitchenNewItems(barId, tableId, table?.name ?? '');
    }
    res.redirect(this.sameOriginReferer(req) ?? `/tables/${tableId}/order`);
  }

  @Post('products/:productId/decrementar')
  async decrementProduct(
    @Param('tableId', ParseIntPipe) tableId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const barId = this.barIdFor(req.user as User);
    const order = await this.ordersService.findOpenOrderForTable(tableId, barId);
    if (order) {
      const result = await this.ordersService.decrementProductInOrder(order.id, productId, barId);
      if (result?.item.destination === 'cocina') {
        const table = await this.tablesService.findOne(tableId, barId);
        this.ordersGateway.notifyKitchenItemsUpdated(barId, tableId, table?.name ?? '');
      }
    }
    res.redirect(this.sameOriginReferer(req) ?? `/tables/${tableId}/order`);
  }

  @Post('items/:itemId/incrementar')
  async incrementItem(
    @Param('tableId', ParseIntPipe) tableId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const barId = this.barIdFor(req.user as User);
    const item = await this.ordersService.incrementQuantity(itemId, barId);
    if (item.destination === 'cocina') {
      const table = await this.tablesService.findOne(tableId, barId);
      this.ordersGateway.notifyKitchenNewItems(barId, tableId, table?.name ?? '');
    }
    res.redirect(this.sameOriginReferer(req) ?? `/tables/${tableId}/order`);
  }

  @Post('items/:itemId/decrementar')
  async decrementItem(
    @Param('tableId', ParseIntPipe) tableId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const barId = this.barIdFor(req.user as User);
    const { item } = await this.ordersService.decrementQuantity(itemId, barId);
    if (item.destination === 'cocina') {
      const table = await this.tablesService.findOne(tableId, barId);
      this.ordersGateway.notifyKitchenItemsUpdated(barId, tableId, table?.name ?? '');
    }
    res.redirect(this.sameOriginReferer(req) ?? `/tables/${tableId}/order`);
  }

  @Post('items/:itemId/servido')
  async markServed(
    @Param('tableId', ParseIntPipe) tableId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    await this.ordersService.setItemStatus(itemId, this.barIdFor(req.user as User), 'servido');
    res.redirect(`/tables/${tableId}/order`);
  }

  @Post('cerrar')
  async close(
    @Param('tableId', ParseIntPipe) tableId: number,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const barId = this.barIdFor(req.user as User);
    const order = await this.ordersService.findOpenOrderForTable(tableId, barId);
    if (order) {
      await this.ordersService.closeOrder(order.id, barId);
    }
    this.ordersGateway.notifyTableStatusChanged(barId);
    res.redirect('/tables');
  }

  @Get('state')
  async state(@Param('tableId', ParseIntPipe) tableId: number, @Req() req: Request) {
    const order = await this.ordersService.findOpenOrderForTable(tableId, this.barIdFor(req.user as User));
    return { items: order?.items ?? [] };
  }

  private sameOriginReferer(req: Request): string | undefined {
    const referer = req.get('Referer');
    if (!referer) {
      return undefined;
    }
    try {
      const url = new URL(referer);
      if (url.host !== req.get('host')) {
        return undefined;
      }
      return url.pathname + url.search;
    } catch {
      return undefined;
    }
  }

  private barIdFor(user: User): number {
    if (!user.barId) {
      throw new ForbiddenException('Usuario sin bar asignado');
    }
    return user.barId;
  }
}
