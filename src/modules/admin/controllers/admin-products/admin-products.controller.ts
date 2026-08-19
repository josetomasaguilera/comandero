import {
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
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
import { ProductsService } from '../../../products/services/products/products.service';
import { CategoriesService } from '../../../categories/services/categories/categories.service';
import { imageUploadOptions, uploadedImageUrl } from '../../../../common/upload.util';
import { User } from '../../../users/entities/user.entity';

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
  async index(@Query('categoryId') categoryId: string | undefined, @Req() req: Request) {
    const selectedCategoryId = categoryId ? Number(categoryId) : undefined;
    const barId = this.barIdFor(req.user as User);
    return {
      title: 'Productos',
      products: await this.productsService.findAll(barId, selectedCategoryId),
      categories: await this.categoriesService.findAll(barId),
      selectedCategoryId,
    };
  }

  @Get('new')
  @Render('admin/products/form')
  async new(@Req() req: Request) {
    return { title: 'Nuevo producto', categories: await this.categoriesService.findAll(this.barIdFor(req.user as User)) };
  }

  @Post()
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('products')))
  async create(
    @Body()
    body: { name: string; price: string; categoryId: string; active?: string },
    @UploadedFile() image: Express.Multer.File | undefined,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const barId = this.barIdFor(req.user as User);
    const category = await this.categoriesService.findOne(Number(body.categoryId), barId);
    if (!category) throw new NotFoundException('Categoría no encontrada');
    await this.productsService.create(barId, {
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
  async edit(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const barId = this.barIdFor(req.user as User);
    return {
      title: 'Editar producto',
      product: await this.productsService.findOne(id, barId),
      categories: await this.categoriesService.findAll(barId),
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
    @Req() req: Request,
  ) {
    const barId = this.barIdFor(req.user as User);
    const imageUrl = uploadedImageUrl('products', image);
    const category = await this.categoriesService.findOne(Number(body.categoryId), barId);
    if (!category) throw new NotFoundException('Categoría no encontrada');
    await this.productsService.update(id, barId, {
      name: body.name,
      price: body.price,
      categoryId: Number(body.categoryId),
      active: body.active === 'on',
      ...(imageUrl ? { imageUrl } : {}),
    });
    res.redirect('/admin/products');
  }

  @Post(':id/delete')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response, @Req() req: Request) {
    await this.productsService.remove(id, this.barIdFor(req.user as User));
    res.redirect('/admin/products');
  }

  private barIdFor(user: User): number {
    if (!user.barId) throw new ForbiddenException('Usuario sin bar asignado');
    return user.barId;
  }
}
