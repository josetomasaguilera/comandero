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

  findAll(barId: number, categoryId?: number): Promise<Product[]> {
    return this.productsRepository.find({
      where: categoryId ? { barId, categoryId } : { barId },
      order: { name: 'ASC' },
    });
  }

  findActive(barId: number): Promise<Product[]> {
    return this.productsRepository.find({
      where: { barId, active: true },
      order: { name: 'ASC' },
    });
  }

  findActiveByCategory(barId: number, categoryId: number): Promise<Product[]> {
    return this.productsRepository.find({
      where: { barId, active: true, categoryId },
      order: { name: 'ASC' },
    });
  }

  findOne(id: number, barId: number): Promise<Product | null> {
    return this.productsRepository.findOne({ where: { id, barId } });
  }

  create(barId: number, data: Partial<Product>): Promise<Product> {
    return this.productsRepository.save(this.productsRepository.create({ ...data, barId }));
  }

  async update(id: number, barId: number, data: Partial<Product>): Promise<void> {
    await this.productsRepository.update({ id, barId }, data);
  }

  async remove(id: number, barId: number): Promise<void> {
    await this.productsRepository.delete({ id, barId });
  }
}
