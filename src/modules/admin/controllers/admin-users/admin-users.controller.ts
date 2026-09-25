import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Param, ParseIntPipe, Post, Render, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthenticatedGuard } from '../../../auth/guards/authenticated.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UsersService } from '../../../users/services/users/users.service';
import { User } from '../../../users/entities/user.schema';

@Controller('admin/users')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('admin')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  private actor(req: Request): User {
    const actor = req.user as User;
    if (!actor?.barId) throw new ForbiddenException('Usuario sin bar asignado');
    return actor;
  }

  @Get()
  @Render('admin/users/index')
  async index(@Req() req: Request) {
    return { title: 'Usuarios', users: await this.users.listForBar(this.actor(req).barId) };
  }

  @Get('new')
  @Render('admin/users/form')
  new(@Req() req: Request) {
    this.actor(req);
    return { title: 'Nuevo usuario', account: { role: 'waiter' } };
  }

  @Get(':id/edit')
  @Render('admin/users/form')
  async edit(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const actor = this.actor(req);
    return { title: 'Editar usuario', editing: true, isSelf: actor.id === id, account: await this.users.getForBar(id, actor.barId) };
  }

  @Post()
  create(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return this.save(body, req, res);
  }

  @Post(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return this.save(body, req, res, id);
  }

  private async save(body: Record<string, unknown>, req: Request, res: Response, id?: number) {
    const actor = this.actor(req);
    try {
      await this.users.saveForBar(actor.barId, actor.id, body, id);
      res.redirect('/admin/users');
    } catch (error) {
      if (!(error instanceof BadRequestException || error instanceof ConflictException)) throw error;
      const field = (key: string) => typeof body[key] === 'string' ? body[key] : '';
      res.status(error.getStatus()).render('admin/users/form', {
        title: id === undefined ? 'Nuevo usuario' : 'Editar usuario', editing: id !== undefined,
        isSelf: id === actor.id, error: error.message,
        account: { id, username: field('username'), email: field('email'), role: field('role') },
      });
    }
  }

  @Post(':id/delete')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request, @Res() res: Response) {
    const actor = this.actor(req);
    try {
      await this.users.removeForBar(id, actor.barId, actor.id);
      res.redirect('/admin/users');
    } catch (error) {
      if (!(error instanceof BadRequestException)) throw error;
      res.status(400).render('admin/users/index', { title: 'Usuarios', error: error.message, users: await this.users.listForBar(actor.barId) });
    }
  }
}
