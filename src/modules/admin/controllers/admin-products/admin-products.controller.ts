import {
  Body,
  BadRequestException,
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
import { User } from '../../../users/entities/user.schema';

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
  async new(@Req() req: Request, @Query('categoryId') categoryId?: string) {
    const selectedCategoryId = this.filterCategoryId(categoryId);
    return {
      title: 'Nuevo producto',
      categories: await this.categoriesService.findAll(this.barIdFor(req.user as User)),
      selectedCategoryId,
      formCategoryId: selectedCategoryId,
    };
  }

  @Post()
  @UseInterceptors(FileInterceptor('image', imageUploadOptions()))
  async create(
    @Body()
    body: { name: string; price: string; cost?: string; categoryId: string; active?: string; selectedCategoryId?: string },
    @UploadedFile() image: Express.Multer.File | undefined,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const barId = this.barIdFor(req.user as User);
    const category = await this.categoriesService.findOne(Number(body.categoryId), barId);
    if (!category) throw new NotFoundException('Categoría no encontrada');
    await this.productsService.create(barId, {
      name: body.name,
      price: this.parsePrice(body.price),
      cost: this.parseCost(body.cost),
      categoryId: Number(body.categoryId),
      active: body.active === 'on',
      imageUrl: (await uploadedImageUrl('products', image)) ?? null,
    });
    res.redirect(this.productsUrl(body.selectedCategoryId));
  }

  @Get(':id/edit')
  @Render('admin/products/form')
  async edit(@Param('id', ParseIntPipe) id: number, @Req() req: Request, @Query('categoryId') categoryId?: string) {
    const barId = this.barIdFor(req.user as User);
    const product = await this.productsService.findOne(id, barId);
    return {
      title: 'Editar producto',
      product,
      formCategoryId: product?.categoryId,
      selectedCategoryId: this.filterCategoryId(categoryId),
      categories: await this.categoriesService.findAll(barId),
    };
  }

  @Post(':id')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions()))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: { name: string; price: string; cost?: string; categoryId: string; active?: string; selectedCategoryId?: string },
    @UploadedFile() image: Express.Multer.File | undefined,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const barId = this.barIdFor(req.user as User);
    const imageUrl = await uploadedImageUrl('products', image);
    const category = await this.categoriesService.findOne(Number(body.categoryId), barId);
    if (!category) throw new NotFoundException('Categoría no encontrada');
    await this.productsService.update(id, barId, {
      name: body.name,
      price: this.parsePrice(body.price),
      cost: this.parseCost(body.cost),
      categoryId: Number(body.categoryId),
      active: body.active === 'on',
      ...(imageUrl ? { imageUrl } : {}),
    });
    res.redirect(this.productsUrl(body.selectedCategoryId));
  }

  @Post(':id/delete')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response, @Req() req: Request) {
    await this.productsService.remove(id, this.barIdFor(req.user as User));
    res.redirect('/admin/products');
  }

  private filterCategoryId(value?: string): number | undefined {
    const id = typeof value === 'string' ? Number(value) : NaN;
    return Number.isSafeInteger(id) && id > 0 ? id : undefined;
  }

  private productsUrl(categoryId?: string): string {
    const id = this.filterCategoryId(categoryId);
    return id ? `/admin/products?categoryId=${id}` : '/admin/products';
  }

  private parsePrice(value: string): number {
    const normalized = typeof value === 'string' ? value.trim().replace(',', '.') : '';
    if (!/^\d+(\.\d{1,2})?$/.test(normalized) || !Number.isSafeInteger(Math.round(Number(normalized) * 100))) {
      throw new BadRequestException('El precio debe ser un importe no negativo con un máximo de dos decimales');
    }
    return Number(normalized);
  }

  private parseCost(value?: string): number {
    const normalized = typeof value === 'string' ? value.trim().replace(',', '.') : '';
    if (value !== undefined && typeof value !== 'string') {
      throw new BadRequestException('Coste no válido');
    }
    if (!normalized) return 0;
    if (!/^\d+(\.\d{1,2})?$/.test(normalized) || !Number.isSafeInteger(Math.round(Number(normalized) * 100))) {
      throw new BadRequestException('El coste debe ser un importe no negativo con un máximo de dos decimales');
    }
    return Number(normalized);
  }

  private barIdFor(user: User): number {
    if (!user.barId) throw new ForbiddenException('Usuario sin bar asignado');
    return user.barId;
  }
}
