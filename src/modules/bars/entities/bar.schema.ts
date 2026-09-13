import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'bars', versionKey: false })
export class Bar {
  @Prop({ required: true, unique: true }) id: number;
  @Prop({ required: true, unique: true, trim: true }) name: string;
  @Prop({ default: false }) voiceOrderingEnabled: boolean;
}

export const BarSchema = SchemaFactory.createForClass(Bar);
