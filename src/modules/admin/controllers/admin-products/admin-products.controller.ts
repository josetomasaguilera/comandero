import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
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
import { ProductsService } from '../../../products/services/products/products.service';
import { CategoriesService } from '../../../categories/services/categories/categories.service';
import { imageUploadOptions, uploadedImageUrl } from '../../../../common/upload.util';

@Controller('admin/products')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('admin')
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  @Get()
  @Render('admin/products/index')
  async index(@Query('categoryId') categoryId?: string) {
    const selectedCategoryId = categoryId ? Number(categoryId) : undefined;
    return {
      title: 'Productos',
      products: await this.productsService.findAll(selectedCategoryId),
      categories: await this.categoriesService.findAll(),
      selectedCategoryId,
    };
  }

  @Get('new')
  @Render('admin/products/form')
  async new() {
    return { title: 'Nuevo producto', categories: await this.categoriesService.findAll() };
  }

  @Post()
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('products')))
  async create(
    @Body()
    body: { name: string; price: string; categoryId: string; active?: string },
    @UploadedFile() image: Express.Multer.File | undefined,
    @Res() res: Response,
  ) {
    await this.productsService.create({
      name: body.name,
      price: body.price,
      categoryId: Number(body.categoryId),
      active: body.active === 'on',
      imageUrl: uploadedImageUrl('products', image) ?? null,
    });
    res.redirect('/admin/products');
  }

  @Get(':id/edit')
  @Render('admin/products/form')
  async edit(@Param('id', ParseIntPipe) id: number) {
    return {
      title: 'Editar producto',
      product: await this.productsService.findOne(id),
      categories: await this.categoriesService.findAll(),
    };
  }

  @Post(':id')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('products')))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: { name: string; price: string; categoryId: string; active?: string },
    @UploadedFile() image: Express.Multer.File | undefined,
    @Res() res: Response,
  ) {
    const imageUrl = uploadedImageUrl('products', image);
    await this.productsService.update(id, {
      name: body.name,
      price: body.price,
      categoryId: Number(body.categoryId),
      active: body.active === 'on',
      ...(imageUrl ? { imageUrl } : {}),
    });
    res.redirect('/admin/products');
  }

  @Post(':id/delete')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    await this.productsService.remove(id);
    res.redirect('/admin/products');
  }
}
