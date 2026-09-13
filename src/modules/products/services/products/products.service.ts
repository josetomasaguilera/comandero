import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from '../../entities/product.schema';
import { IdGeneratorService } from '../../../database/id-generator.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productsRepository: Model<Product>,
    private readonly ids: IdGeneratorService,
  ) {}

  findAll(barId: number, categoryId?: number): Promise<Product[]> {
    return this.productsRepository.find(categoryId ? { barId, categoryId } : { barId }).sort({ name: 1 }).populate('category').exec();
  }

  findActive(barId: number): Promise<Product[]> {
    return this.productsRepository.find({ barId, active: true }).sort({ name: 1 }).populate('category').exec();
  }

  findActiveByCategory(barId: number, categoryId: number): Promise<Product[]> {
    return this.productsRepository.find({ barId, active: true, categoryId }).sort({ name: 1 }).populate('category').exec();
  }

  findOne(id: number, barId: number): Promise<Product | null> {
    return this.productsRepository.findOne({ id, barId }).populate('category').exec();
  }

  async create(barId: number, data: Partial<Product>): Promise<Product> {
    return this.productsRepository.create({ ...data, id: await this.ids.next('products'), barId });
  }

  async update(id: number, barId: number, data: Partial<Product>): Promise<void> {
    await this.productsRepository.updateOne({ id, barId }, data).exec();
  }

  async remove(id: number, barId: number): Promise<void> {
    await this.productsRepository.deleteOne({ id, barId }).exec();
  }
}
