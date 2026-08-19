import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Render,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { AuthenticatedGuard } from '../../../auth/guards/authenticated.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CategoriesService } from '../../../categories/services/categories/categories.service';
import { CategoryDestination } from '../../../categories/entities/category.entity';
import { imageUploadOptions, uploadedImageUrl } from '../../../../common/upload.util';
import { User } from '../../../users/entities/user.entity';

@Controller('admin/categories')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('admin')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Render('admin/categories/index')
  async index(@Req() req: Request) {
    return { title: 'Categorías', categories: await this.categoriesService.findAll(this.barIdFor(req.user as User)) };
  }

  @Get('new')
  @Render('admin/categories/form')
  new() {
    return { title: 'Nueva categoría' };
  }

  @Post()
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('categories')))
  async create(
    @Body()
    body: { name: string; order: string; destination: CategoryDestination },
    @UploadedFile() image: Express.Multer.File | undefined,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    await this.categoriesService.create(this.barIdFor(req.user as User), {
      name: body.name,
      order: Number(body.order) || 0,
      destination: body.destination,
      imageUrl: uploadedImageUrl('categories', image) ?? null,
    });
    res.redirect('/admin/categories');
  }

  @Get(':id/edit')
  @Render('admin/categories/form')
  async edit(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return { title: 'Editar categoría', category: await this.categoriesService.findOne(id, this.barIdFor(req.user as User)) };
  }

  @Post(':id')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('categories')))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: { name: string; order: string; destination: CategoryDestination },
    @UploadedFile() image: Express.Multer.File | undefined,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const imageUrl = uploadedImageUrl('categories', image);
    await this.categoriesService.update(id, this.barIdFor(req.user as User), {
      name: body.name,
      order: Number(body.order) || 0,
      destination: body.destination,
      ...(imageUrl ? { imageUrl } : {}),
    });
    res.redirect('/admin/categories');
  }

  @Post(':id/delete')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response, @Req() req: Request) {
    await this.categoriesService.remove(id, this.barIdFor(req.user as User));
    res.redirect('/admin/categories');
  }

  private barIdFor(user: User): number {
    if (!user.barId) throw new ForbiddenException('Usuario sin bar asignado');
    return user.barId;
  }
}
