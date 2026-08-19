import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Render,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthenticatedGuard } from '../../../auth/guards/authenticated.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { TablesService } from '../../services/tables/tables.service';
import { OrdersGateway } from '../../../events/orders.gateway';

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
  async index() {
    const zones = await this.tablesService.findAllGroupedByZone();
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
  async reserve(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    await this.tablesService.setStatus(id, 'reservada');
    this.ordersGateway.notifyTableStatusChanged();
    res.redirect('/tables');
  }

  @Post(':id/liberar')
  async free(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    await this.tablesService.setStatus(id, 'libre');
    this.ordersGateway.notifyTableStatusChanged();
    res.redirect('/tables');
  }
}
