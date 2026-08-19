import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Render,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthenticatedGuard } from '../../../auth/guards/authenticated.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CategoriesService } from '../../../categories/services/categories/categories.service';
import { CategoryDestination } from '../../../categories/entities/category.entity';
import { imageUploadOptions, uploadedImageUrl } from '../../../../common/upload.util';

@Controller('admin/categories')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('admin')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Render('admin/categories/index')
  async index() {
    return { title: 'Categorías', categories: await this.categoriesService.findAll() };
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
  ) {
    await this.categoriesService.create({
      name: body.name,
      order: Number(body.order) || 0,
      destination: body.destination,
      imageUrl: uploadedImageUrl('categories', image) ?? null,
    });
    res.redirect('/admin/categories');
  }

  @Get(':id/edit')
  @Render('admin/categories/form')
  async edit(@Param('id', ParseIntPipe) id: number) {
    return { title: 'Editar categoría', category: await this.categoriesService.findOne(id) };
  }

  @Post(':id')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('categories')))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: { name: string; order: string; destination: CategoryDestination },
    @UploadedFile() image: Express.Multer.File | undefined,
    @Res() res: Response,
  ) {
    const imageUrl = uploadedImageUrl('categories', image);
    await this.categoriesService.update(id, {
      name: body.name,
      order: Number(body.order) || 0,
      destination: body.destination,
      ...(imageUrl ? { imageUrl } : {}),
    });
    res.redirect('/admin/categories');
  }

  @Post(':id/delete')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    await this.categoriesService.remove(id);
    res.redirect('/admin/categories');
  }
}
