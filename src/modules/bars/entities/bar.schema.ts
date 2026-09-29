import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'bars', versionKey: false })
export class Bar {
  @Prop({ required: true, unique: true }) id: number;
  @Prop({ required: true, unique: true, trim: true }) name: string;
  @Prop({ default: false }) voiceOrderingEnabled: boolean;
  @Prop({ default: 1 }) billingVersion: number;
  @Prop({ default: false }) billingExempt: boolean;
  @Prop({ default: () => new Date() }) trialStartedAt: Date;
  @Prop({ default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }) trialEndsAt: Date;
  @Prop() stripeCustomerId?: string;
  @Prop() stripeSubscriptionId?: string;
  @Prop() subscriptionStatus?: string;
  @Prop() paidUntil?: Date;
  @Prop({ default: false }) cancelAtPeriodEnd: boolean;
  @Prop() billingLockToken?: string;
  @Prop() billingLockUntil?: Date;
}

export const BarSchema = SchemaFactory.createForClass(Bar);
