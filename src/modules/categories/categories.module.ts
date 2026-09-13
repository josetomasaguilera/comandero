import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './entities/category.schema';
import { CategoriesService } from './services/categories/categories.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Category.name, schema: CategorySchema }])],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
