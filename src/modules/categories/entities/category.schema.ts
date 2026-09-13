import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
export type CategoryDestination = 'cocina' | 'barra';
@Schema({ collection: 'categories', versionKey: false })
export class Category {
  @Prop({ required: true, unique: true }) id: number;
  @Prop({ required: true }) name: string;
  @Prop({ default: 0 }) order: number;
  @Prop({ required: true, enum: ['cocina', 'barra'] }) destination: CategoryDestination;
  @Prop({ default: null, type: String }) imageUrl: string | null;
  @Prop({ required: true, index: true }) barId: number;
}
export const CategorySchema = SchemaFactory.createForClass(Category);
