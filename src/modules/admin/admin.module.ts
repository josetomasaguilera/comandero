import { Module } from '@nestjs/common';
import { TablesModule } from '../tables/tables.module';
import { AdminTablesController } from './controllers/admin-tables/admin-tables.controller';
import { UsersModule } from '../users/users.module';
import { AdminUsersController } from './controllers/admin-users/admin-users.controller';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';
import { AdminController } from './controllers/admin/admin.controller';
import { AdminCategoriesController } from './controllers/admin-categories/admin-categories.controller';
import { AdminProductsController } from './controllers/admin-products/admin-products.controller';

@Module({
  imports: [CategoriesModule, ProductsModule, UsersModule, TablesModule],
  controllers: [AdminController, AdminCategoriesController, AdminProductsController, AdminUsersController, AdminTablesController],
})
export class AdminModule {}
