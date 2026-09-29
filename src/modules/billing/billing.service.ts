import { BadRequestException, Injectable, NotFoundException, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { Bar } from '../bars/entities/bar.schema';
import { User } from '../users/entities/user.schema';
import { billingAccess } from './billing-access';

@Injectable()
export class BillingService implements OnModuleInit {
  private client?: Stripe;

  constructor(@InjectModel(Bar.name) private readonly bars: Model<Bar>, private readonly config: ConfigService) {}

  async onModuleInit() {
    // Use the raw collection: Mongoose defaults must not hide legacy records.
    // Every new bar gets billingVersion=1, so restarts cannot exempt new bars.
    await this.bars.collection.updateMany(
      { billingVersion: { $exists: false } },
      { $set: { billingVersion: 1, billingExempt: true } },
    );
  }

  configured() {
    return ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID', 'STRIPE_WEBHOOK_SECRET', 'APP_URL']
      .every((key) => !!this.config.get<string>(key));
  }

  private stripe() {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key) throw new ServiceUnavailableException('Los pagos todavía no están disponibles.');
    return this.client ??= new Stripe(key, { timeout: 15000, maxNetworkRetries: 1 });
  }

  private appUrl() {
    const value = this.config.get<string>('APP_URL');
    if (!value) throw new ServiceUnavailableException('Falta configurar la dirección de la aplicación.');
    const url = new URL(value);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
      throw new ServiceUnavailableException('La dirección pública debe utilizar HTTPS.');
    }
    return url.origin;
  }

  async getBar(id: number) {
    const bar = await this.bars.findOne({ id }).lean().exec();
    if (!bar) throw new NotFoundException('Bar no encontrado');
    return bar;
  }

  async access(id: number) {
    return billingAccess(await this.getBar(id));
  }

  // Serialize checkout and reconciliation across all Cloud Run instances.
  private async locked<T>(id: number, work: (token: string) => Promise<T>): Promise<T> {
    const token = randomUUID();
    const bar = await this.bars.findOneAndUpdate(
      { id, $or: [{ billingLockUntil: { $exists: false } }, { billingLockUntil: { $lt: new Date() } }] },
      { $set: { billingLockToken: token, billingLockUntil: new Date(Date.now() + 300000) } },
      { new: true },
    ).exec();
    if (!bar) throw new ServiceUnavailableException('Se está actualizando la suscripción. Vuelve a intentarlo en unos segundos.');
    try { return await work(token); }
    finally {
      await this.bars.updateOne({ id, billingLockToken: token }, { $unset: { billingLockToken: 1, billingLockUntil: 1 } }).exec();
    }
  }

  private async save(id: number, token: string, data: Partial<Bar>) {
    const result = await this.bars.updateOne(
      { id, billingLockToken: token, billingLockUntil: { $gt: new Date() } }, { $set: data },
    ).exec();
    if (!result.matchedCount) throw new ServiceUnavailableException('La actualización ha caducado. Vuelve a intentarlo.');
  }

  private async subscriptions(customer: string) {
    return this.stripe().subscriptions.list({ customer, status: 'all', limit: 100, expand: ['data.latest_invoice'] }).autoPagingToArray({ limit: 1000 });
  }

  private async reconcile(id: number, token: string) {
    const bar = await this.getBar(id);
    if (bar.billingExempt || !bar.stripeCustomerId) return [];
    const subscriptions = await this.subscriptions(bar.stripeCustomerId);
    const ours = subscriptions.filter((sub) => sub.metadata.barId === String(id));
    const candidates = ours.filter((sub) => sub.status !== 'canceled' && sub.status !== 'incomplete_expired');
    const sub = candidates.sort((a, b) => b.created - a.created)[0] ?? ours.sort((a, b) => b.created - a.created)[0];
    const item = sub?.items.data[0];
    const invoice = sub?.latest_invoice;
    const correctPlan = sub?.items.data.length === 1 && item?.quantity === 1
      && item.price.id === this.config.get<string>('STRIPE_PRICE_ID')
      && item.price.unit_amount === 1000 && item.price.currency === 'eur'
      && item.price.recurring?.interval === 'month' && item.price.recurring.interval_count === 1;
    const paid = correctPlan && sub?.status === 'active' && !sub.pause_collection
      && invoice && typeof invoice !== 'string' && invoice.status === 'paid';
    await this.save(id, token, {
      stripeSubscriptionId: sub?.id ?? '',
      subscriptionStatus: sub?.status ?? 'none',
      paidUntil: paid ? new Date(item.current_period_end * 1000) : new Date(0),
      cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
    });
    return candidates;
  }

  async sync(id: number) {
    return this.locked(id, (token) => this.reconcile(id, token));
  }

  async checkout(user: User) {
    if (!this.configured()) throw new ServiceUnavailableException('Los pagos todavía no están disponibles.');
    return this.locked(user.barId, async (token) => {
      const bar = await this.getBar(user.barId);
      const access = billingAccess(bar);
      if (access.exempt) throw new BadRequestException('Este bar está exento de suscripción.');
      if (access.trial) throw new BadRequestException('Podrás suscribirte al terminar tus 30 días gratuitos.');
      const stripe = this.stripe();
      const priceId = this.config.getOrThrow<string>('STRIPE_PRICE_ID');
      const price = await stripe.prices.retrieve(priceId);
      if (!price.active || price.unit_amount !== 1000 || price.currency !== 'eur'
        || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1) {
        throw new ServiceUnavailableException('El plan debe estar configurado como 10 EUR al mes.');
      }
      let customer = bar.stripeCustomerId;
      if (!customer) {
        const created = await stripe.customers.create({
          name: bar.name, ...(user.email ? { email: user.email } : {}), metadata: { barId: String(bar.id) },
        }, { idempotencyKey: `bar-customer-${bar._id}` });
        customer = created.id;
        await this.save(bar.id, token, { stripeCustomerId: customer });
      }
      const existing = await this.reconcile(bar.id, token);
      // Payment retries and cancellation belong in the existing subscription.
      if (existing.length) return this.portalUrl(customer);
      const sessions = await stripe.checkout.sessions.list({ customer, limit: 100 });
      const open = sessions.data.find((session) => session.status === 'open' && session.metadata?.barId === String(bar.id));
      if (open?.url) return open.url;
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription', customer, client_reference_id: String(bar.id),
        line_items: [{ price: priceId, quantity: 1 }],
        payment_method_types: ['card'],
        metadata: { barId: String(bar.id) },
        subscription_data: { metadata: { barId: String(bar.id) } },
        success_url: `${this.appUrl()}/billing?returned=1`,
        cancel_url: `${this.appUrl()}/billing?cancelled=1`,
      }, { idempotencyKey: `checkout-${bar._id}-${token}` });
      if (!session.url) throw new ServiceUnavailableException('No se pudo abrir el pago.');
      return session.url;
    });
  }

  private async portalUrl(customer: string) {
    const session = await this.stripe().billingPortal.sessions.create({ customer, return_url: `${this.appUrl()}/billing` });
    return session.url;
  }

  async portal(id: number) {
    const bar = await this.getBar(id);
    if (bar.billingExempt || !bar.stripeCustomerId) throw new BadRequestException('No hay una suscripción que gestionar.');
    return this.portalUrl(bar.stripeCustomerId);
  }

  async webhook(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!rawBody || !signature) throw new BadRequestException('Falta la firma de Stripe.');
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new ServiceUnavailableException('Webhook sin configurar.');
    let event: Stripe.Event;
    try { event = this.stripe().webhooks.constructEvent(rawBody, signature, secret); }
    catch { throw new BadRequestException('Firma de Stripe no válida.'); }
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed',
      'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted',
      'customer.subscription.paused', 'customer.subscription.resumed', 'invoice.paid', 'invoice.payment_failed',
      'invoice.payment_action_required'].includes(event.type)) return;
    const object = event.data.object as { customer?: string | { id: string } | null };
    const customer = typeof object.customer === 'string' ? object.customer : object.customer?.id;
    if (!customer) return;
    const bar = await this.bars.findOne({ stripeCustomerId: customer }).lean().exec();
    if (!bar || bar.billingExempt) return;
    // Always read current Stripe state: retries and out-of-order events are safe.
    await this.sync(bar.id);
  }
}
