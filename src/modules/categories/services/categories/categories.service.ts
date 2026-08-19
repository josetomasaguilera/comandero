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

  findAll(barId: number): Promise<Category[]> {
    return this.categoriesRepository.find({ where: { barId }, order: { order: 'ASC' } });
  }

  findOne(id: number, barId: number): Promise<Category | null> {
    return this.categoriesRepository.findOne({ where: { id, barId } });
  }

  create(barId: number, data: Partial<Category>): Promise<Category> {
    return this.categoriesRepository.save(this.categoriesRepository.create({ ...data, barId }));
  }

  async update(id: number, barId: number, data: Partial<Category>): Promise<void> {
    await this.categoriesRepository.update({ id, barId }, data);
  }

  async remove(id: number, barId: number): Promise<void> {
    await this.categoriesRepository.delete({ id, barId });
  }
}
