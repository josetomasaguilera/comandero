import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { AdminReportsController } from './controllers/admin-reports/admin-reports.controller';
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
  imports: [CategoriesModule, ProductsModule, UsersModule, TablesModule, OrdersModule],
  controllers: [AdminController, AdminCategoriesController, AdminProductsController, AdminUsersController, AdminTablesController, AdminReportsController],
})
export class AdminModule {}
