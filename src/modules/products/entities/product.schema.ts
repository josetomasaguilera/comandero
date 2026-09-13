import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Category } from '../../categories/entities/category.schema';
@Schema({ collection: 'products', versionKey: false })
export class Product {
  @Prop({ required: true, unique: true }) id: number;
  @Prop({ required: true }) name: string;
  @Prop({ required: true, type: Number }) price: number;
  @Prop({ default: true }) active: boolean;
  @Prop({ required: true, index: true }) categoryId: number;
  category: Category;
  @Prop({ type: String, default: null }) imageUrl: string | null;
  @Prop({ required: true, index: true }) barId: number;
}
export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.virtual('category', { ref: 'Category', localField: 'categoryId', foreignField: 'id', justOne: true });
