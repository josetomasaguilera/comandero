import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';
import { AdminController } from './controllers/admin/admin.controller';
import { AdminCategoriesController } from './controllers/admin-categories/admin-categories.controller';
import { AdminProductsController } from './controllers/admin-products/admin-products.controller';

@Module({
  imports: [CategoriesModule, ProductsModule],
  controllers: [AdminController, AdminCategoriesController, AdminProductsController],
})
export class AdminModule {}
