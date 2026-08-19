import {
  Controller,
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
import { TablesService } from '../../services/tables/tables.service';
import { OrdersGateway } from '../../../events/orders.gateway';
import { User } from '../../../users/entities/user.entity';
import { ForbiddenException } from '@nestjs/common';

@Controller('tables')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('waiter', 'admin')
export class TablesController {
  constructor(
    private readonly tablesService: TablesService,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  @Get()
  @Render('tables/index')
  async index(@Req() req: Request) {
    const barId = this.barIdFor(req.user as User);
    const zones = await this.tablesService.findAllGroupedByZone(barId);
    return {
      title: 'Mesas',
      zones: [
        { key: 'interior', label: 'Interior', tables: zones.interior },
        { key: 'terraza_a', label: 'Terraza Delante', tables: zones.terraza_a },
        { key: 'terraza_b', label: 'Terraza Juzgados', tables: zones.terraza_b },
      ],
    };
  }

  @Post(':id/reservar')
  async reserve(@Param('id', ParseIntPipe) id: number, @Res() res: Response, @Req() req: Request) {
    const barId = this.barIdFor(req.user as User);
    await this.tablesService.setStatus(id, barId, 'reservada');
    this.ordersGateway.notifyTableStatusChanged(barId);
    res.redirect('/tables');
  }

  @Post(':id/liberar')
  async free(@Param('id', ParseIntPipe) id: number, @Res() res: Response, @Req() req: Request) {
    const barId = this.barIdFor(req.user as User);
    await this.tablesService.setStatus(id, barId, 'libre');
    this.ordersGateway.notifyTableStatusChanged(barId);
    res.redirect('/tables');
  }

  private barIdFor(user: User): number {
    if (!user.barId) throw new ForbiddenException('Usuario sin bar asignado');
    return user.barId;
  }
}
