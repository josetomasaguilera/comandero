import { Controller, ForbiddenException, Get, Param, ParseIntPipe, Render, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedGuard } from '../../../auth/guards/authenticated.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { User } from '../../../users/entities/user.schema';
import { OrdersService } from '../../services/orders/orders.service';

@Controller('orders/closed')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('waiter', 'admin')
export class ClosedOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @Render('orders/closed')
  async index(@Req() req: Request) {
    return { title: 'Órdenes cerradas', orders: await this.orders.findRecentClosed(this.barId(req)) };
  }

  @Get(':id')
  @Render('orders/closed-detail')
  async detail(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return { title: `Orden cerrada #${id}`, order: await this.orders.findClosed(id, this.barId(req)) };
  }

  private barId(req: Request): number {
    const user = req.user as User;
    if (!user.barId) throw new ForbiddenException('Usuario sin bar asignado');
    return user.barId;
  }
}
