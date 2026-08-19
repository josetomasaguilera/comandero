import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({ order: { order: 'ASC' } });
  }

  findOne(id: number): Promise<Category | null> {
    return this.categoriesRepository.findOne({ where: { id } });
  }

  create(data: Partial<Category>): Promise<Category> {
    return this.categoriesRepository.save(this.categoriesRepository.create(data));
  }

  async update(id: number, data: Partial<Category>): Promise<void> {
    await this.categoriesRepository.update({ id }, data);
  }

  async remove(id: number): Promise<void> {
    await this.categoriesRepository.delete({ id });
  }
}
