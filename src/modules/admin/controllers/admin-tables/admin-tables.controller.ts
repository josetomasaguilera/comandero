import {
  BadRequestException, Body, Controller, ForbiddenException, Get,
  NotFoundException, Param, ParseIntPipe, Post, Render, Req, Res, UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthenticatedGuard } from '../../../auth/guards/authenticated.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { TablesService } from '../../../tables/services/tables/tables.service';
import { TableZone } from '../../../tables/entities/table.schema';
import { User } from '../../../users/entities/user.schema';

const zones: { value: TableZone; label: string }[] = [
  { value: 'interior', label: 'Interior' },
  { value: 'terraza_a', label: 'Terraza Delante' },
  { value: 'terraza_b', label: 'Terraza Juzgados' },
];

@Controller('admin/tables')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('admin')
export class AdminTablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @Render('admin/tables/index')
  async index(@Req() req: Request) {
    return this.list(this.barIdFor(req));
  }

  @Get('new')
  @Render('admin/tables/form')
  new(@Req() req: Request) {
    this.barIdFor(req);
    return { title: 'Nueva mesa', zones };
  }

  @Post()
  async create(@Body() body: { name?: unknown; zone?: unknown }, @Req() req: Request, @Res() res: Response) {
    const barId = this.barIdFor(req);
    try {
      await this.tablesService.create(barId, this.parse(body));
    } catch (error) {
      if (!(error instanceof BadRequestException)) throw error;
      return res.status(400).render('admin/tables/form', {
        title: 'Nueva mesa', zones, values: this.values(body), error: error.message,
      });
    }
    res.redirect('/admin/tables');
  }

  @Get(':id/edit')
  @Render('admin/tables/form')
  async edit(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const table = await this.tablesService.findOne(id, this.barIdFor(req));
    if (!table) throw new NotFoundException('Mesa no encontrada');
    return { title: 'Editar mesa', tableId: id, values: table, zones };
  }

  @Post(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: { name?: unknown; zone?: unknown }, @Req() req: Request, @Res() res: Response) {
    const barId = this.barIdFor(req);
    try {
      await this.tablesService.update(id, barId, this.parse(body));
    } catch (error) {
      if (!(error instanceof BadRequestException)) throw error;
      return res.status(400).render('admin/tables/form', {
        title: 'Editar mesa', tableId: id, zones, values: this.values(body), error: error.message,
      });
    }
    res.redirect('/admin/tables');
  }

  @Post(':id/delete')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request, @Res() res: Response) {
    const barId = this.barIdFor(req);
    try {
      await this.tablesService.remove(id, barId);
    } catch (error) {
      if (!(error instanceof BadRequestException)) throw error;
      return res.status(400).render('admin/tables/index', {
        ...await this.list(barId), error: error.message,
      });
    }
    res.redirect('/admin/tables');
  }

  private async list(barId: number) {
    const tables = await this.tablesService.findAll(barId);
    return {
      title: 'Mesas',
      tables: tables.map((table) => ({
        id: table.id, name: table.name, status: table.status,
        zoneLabel: zones.find((zone) => zone.value === table.zone)?.label,
      })),
    };
  }

  private values(body: { name?: unknown; zone?: unknown }) {
    return {
      name: typeof body.name === 'string' ? body.name.trim() : '',
      zone: typeof body.zone === 'string' ? body.zone : '',
    };
  }

  private parse(body: { name?: unknown; zone?: unknown }) {
    const values = this.values(body);
    if (!values.name || values.name.length > 100) {
      throw new BadRequestException('El nombre debe tener entre 1 y 100 caracteres');
    }
    const zone = zones.find((zone) => zone.value === values.zone);
    if (!zone) throw new BadRequestException('Selecciona una zona válida');
    return { name: values.name, zone: zone.value };
  }

  private barIdFor(req: Request): number {
    const user = req.user as User;
    if (!user?.barId) throw new ForbiddenException('Usuario sin bar asignado');
    return user.barId;
  }
}
