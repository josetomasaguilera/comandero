import { Controller, ForbiddenException, Get, Query, Render, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedGuard } from '../../../auth/guards/authenticated.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { User } from '../../../users/entities/user.schema';
import { SalesReportsService } from '../../../orders/services/sales-reports.service';

@Controller('admin/reports')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('admin')
export class AdminReportsController {
  constructor(private readonly reports: SalesReportsService) {}

  @Get()
  @Render('admin/reports/index')
  index(@Req() req: Request) {
    this.barIdFor(req);
    return { title: 'Listados de ventas' };
  }

  @Get('daily')
  @Render('admin/reports/report')
  async daily(@Req() req: Request, @Query('month') month?: unknown) {
    return {
      ...await this.reports.monthly(this.barIdFor(req), month),
      title: 'Ventas totales diarias',
      reportPath: '/admin/reports/daily',
      daily: true,
    };
  }

  @Get('products')
  @Render('admin/reports/report')
  async products(@Req() req: Request, @Query('month') month?: unknown) {
    return {
      ...await this.reports.monthly(this.barIdFor(req), month),
      title: 'Ventas del mes por producto',
      reportPath: '/admin/reports/products',
      daily: false,
    };
  }

  private barIdFor(req: Request) {
    const barId = (req.user as User | undefined)?.barId;
    if (!barId) throw new ForbiddenException('No tienes un bar asignado');
    return barId;
  }
}
