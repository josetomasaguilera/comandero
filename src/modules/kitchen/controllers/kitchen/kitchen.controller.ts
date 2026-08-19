import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Render,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthenticatedGuard } from '../../../auth/guards/authenticated.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { OrdersService } from '../../../orders/services/orders/orders.service';
import { OrdersGateway } from '../../../events/orders.gateway';
import { User } from '../../../users/entities/user.entity';

@Controller('kitchen')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('kitchen', 'admin')
export class KitchenController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  @Get()
  @Render('kitchen/index')
  async index(@Req() req: Request) {
    const barId = this.barIdFor(req.user as User);
    const items = await this.ordersService.findKitchenPendingItems(barId);
    const byTable = new Map<
      number,
      { tableName: string; items: typeof items }
    >();
    for (const item of items) {
      const tableId = item.order.tableId;
      if (!byTable.has(tableId)) {
        byTable.set(tableId, { tableName: item.order.table.name, items: [] });
      }
      byTable.get(tableId)!.items.push(item);
    }
    return {
      title: 'Cocina',
      tables: Array.from(byTable.values()),
    };
  }

  @Post('items/:itemId/listo')
  async markReady(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const barId = this.barIdFor(req.user as User);
    const item = await this.ordersService.setItemStatus(itemId, barId, 'listo');
    this.ordersGateway.notifyWaiterItemReady(barId, item.order.tableId);
    res.redirect('/kitchen');
  }

  private barIdFor(user: User): number {
    if (!user.barId) throw new ForbiddenException('Usuario sin bar asignado');
    return user.barId;
  }
}
