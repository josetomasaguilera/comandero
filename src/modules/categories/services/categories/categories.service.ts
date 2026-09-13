import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from '../../entities/category.schema';
import { IdGeneratorService } from '../../../database/id-generator.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categoriesRepository: Model<Category>,
    private readonly ids: IdGeneratorService,
  ) {}

  findAll(barId: number): Promise<Category[]> {
    return this.categoriesRepository.find({ barId }).sort({ order: 1 }).exec();
  }

  findOne(id: number, barId: number): Promise<Category | null> {
    return this.categoriesRepository.findOne({ id, barId }).exec();
  }

  async create(barId: number, data: Partial<Category>): Promise<Category> {
    return this.categoriesRepository.create({ ...data, id: await this.ids.next('categories'), barId });
  }

  async update(id: number, barId: number, data: Partial<Category>): Promise<void> {
    await this.categoriesRepository.updateOne({ id, barId }, data).exec();
  }

  async remove(id: number, barId: number): Promise<void> {
    await this.categoriesRepository.deleteOne({ id, barId }).exec();
  }
}
