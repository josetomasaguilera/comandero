import { Controller, Get, Render, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from '../../../auth/guards/authenticated.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  @Get()
  @Render('admin/index')
  index() {
    return { title: 'Administración' };
  }
}
