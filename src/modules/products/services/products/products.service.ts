import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  findAll(categoryId?: number): Promise<Product[]> {
    return this.productsRepository.find({
      where: categoryId ? { categoryId } : {},
      order: { name: 'ASC' },
    });
  }

  findActive(): Promise<Product[]> {
    return this.productsRepository.find({
      where: { active: true },
      order: { name: 'ASC' },
    });
  }

  findActiveByCategory(categoryId: number): Promise<Product[]> {
    return this.productsRepository.find({
      where: { active: true, categoryId },
      order: { name: 'ASC' },
    });
  }

  findOne(id: number): Promise<Product | null> {
    return this.productsRepository.findOne({ where: { id } });
  }

  create(data: Partial<Product>): Promise<Product> {
    return this.productsRepository.save(this.productsRepository.create(data));
  }

  async update(id: number, data: Partial<Product>): Promise<void> {
    await this.productsRepository.update({ id }, data);
  }

  async remove(id: number): Promise<void> {
    await this.productsRepository.delete({ id });
  }
}
