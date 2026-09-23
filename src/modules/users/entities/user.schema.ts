import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Bar } from '../../bars/entities/bar.schema';
export type UserRole = 'admin' | 'waiter' | 'kitchen';
@Schema({ collection: 'users', versionKey: false })
export class User {
  @Prop({ required: true, unique: true }) id: number;
  @Prop({ required: true, unique: true }) username: string;
  @Prop({ trim: true, lowercase: true }) email?: string;
  @Prop({ required: true }) passwordHash: string;
  @Prop({ required: true, enum: ['admin', 'waiter', 'kitchen'] }) role: UserRole;
  @Prop({ required: true, index: true }) barId: number;
  bar: Bar | null;
}
export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.virtual('bar', { ref: 'Bar', localField: 'barId', foreignField: 'id', justOne: true });
