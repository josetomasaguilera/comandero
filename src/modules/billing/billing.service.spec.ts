import Stripe from 'stripe';
import { BillingService } from './billing.service';

jest.mock('stripe', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({}) },
}));

describe('Stripe billing', () => {
  const setup = (overrides = {}) => {
    const bar = { id: 7, _id: 'mongo7', name: 'Bar', billingExempt: false, stripeCustomerId: 'cus_7', ...overrides };
    const query = (value: unknown) => ({ lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(value) });
    const bars = {
      collection: { updateMany: jest.fn().mockResolvedValue({}) },
      findOne: jest.fn().mockReturnValue(query(bar)),
      findOneAndUpdate: jest.fn().mockReturnValue(query(bar)),
      updateOne: jest.fn().mockReturnValue(query({ matchedCount: 1 })),
    };
    const stripe = {
      webhooks: { constructEvent: jest.fn() },
      subscriptions: { list: jest.fn() },
      prices: { retrieve: jest.fn().mockResolvedValue({ active: true, unit_amount: 1000, currency: 'eur', recurring: { interval: 'month', interval_count: 1 } }) },
      checkout: { sessions: { list: jest.fn().mockResolvedValue({ data: [] }), create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/pay' }) } },
      billingPortal: { sessions: { create: jest.fn().mockResolvedValue({ url: 'https://billing.stripe.com/portal' }) } },
    };
    stripe.subscriptions.list.mockReturnValue({ autoPagingToArray: jest.fn().mockResolvedValue([]) });
    (Stripe as unknown as jest.Mock).mockImplementation(() => stripe);
    const values = { STRIPE_SECRET_KEY: 'sk_test_mock', STRIPE_PRICE_ID: 'price_10', STRIPE_WEBHOOK_SECRET: 'whsec_mock', APP_URL: 'https://example.com' };
    const config = { get: (key: string) => values[key], getOrThrow: (key: string) => values[key] };
    return { service: new BillingService(bars as never, config as never), bars, stripe };
  };
  const subscription = (status = 'active', invoiceStatus = 'paid') => ({
    id: 'sub_7', metadata: { barId: '7' }, status, created: 1, cancel_at_period_end: false,
    latest_invoice: { status: invoiceStatus },
    items: { data: [{ quantity: 1, current_period_end: 2000000000, price: {
      id: 'price_10', unit_amount: 1000, currency: 'eur', recurring: { interval: 'month', interval_count: 1 },
    } }] },
  });
  const user = { barId: 7, email: 'admin@example.com' } as never;

  it('exempts only legacy bars without a billing version', async () => {
    const s = setup();
    await s.service.onModuleInit();
    expect(s.bars.collection.updateMany).toHaveBeenCalledWith(
      { billingVersion: { $exists: false } }, { $set: { billingVersion: 1, billingExempt: true } },
    );
  });

  it('never charges exempt bars or bars still in trial', async () => {
    for (const overrides of [{ billingExempt: true }, { trialEndsAt: new Date(Date.now() + 86400000) }]) {
      const s = setup(overrides);
      await expect(s.service.checkout(user)).rejects.toThrow();
      expect(s.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    }
  });

  it('rejects forged webhook signatures before reading or writing billing data', async () => {
    const s = setup();
    s.stripe.webhooks.constructEvent.mockImplementation(() => { throw new Error('invalid'); });
    await expect(s.service.webhook(Buffer.from('{}'), 'forged')).rejects.toThrow('Firma');
    expect(s.bars.findOne).not.toHaveBeenCalled();
    expect(s.bars.updateOne).not.toHaveBeenCalled();
  });

  it.each([['active', 'paid', true], ['active', 'open', false], ['past_due', 'paid', false], ['canceled', 'paid', false]])(
    'checks current subscription %s and invoice %s before granting access', async (status, invoice, allowed) => {
      const s = setup();
      s.stripe.subscriptions.list.mockReturnValue({ autoPagingToArray: jest.fn().mockResolvedValue([subscription(status, invoice)]) });
      await s.service.sync(7);
      const update = s.bars.updateOne.mock.calls.find(([, change]) => change.$set)?.[1].$set;
      expect(update.paidUntil.getTime()).toBe(allowed ? 2000000000000 : 0);
    },
  );

  it('reconciles repeated and out-of-order events from current Stripe state', async () => {
    const s = setup();
    s.stripe.webhooks.constructEvent.mockReturnValue({ type: 'customer.subscription.deleted', data: { object: { customer: 'cus_7' } } });
    s.stripe.subscriptions.list.mockReturnValue({ autoPagingToArray: jest.fn().mockResolvedValue([subscription()]) });
    await s.service.webhook(Buffer.from('{}'), 'signed');
    await s.service.webhook(Buffer.from('{}'), 'signed');
    expect(s.stripe.subscriptions.list).toHaveBeenCalledTimes(2);
    const updates = s.bars.updateOne.mock.calls.filter(([, change]) => change.$set);
    expect(updates.every(([, change]) => change.$set.subscriptionStatus === 'active')).toBe(true);
  });

  it('reuses an open checkout instead of creating another', async () => {
    const s = setup();
    s.stripe.checkout.sessions.list.mockResolvedValue({ data: [{ status: 'open', metadata: { barId: '7' }, url: 'https://checkout.stripe.com/existing' }] });
    expect(await s.service.checkout(user)).toBe('https://checkout.stripe.com/existing');
    expect(s.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('routes an existing subscription to the portal instead of charging twice', async () => {
    const s = setup();
    s.stripe.subscriptions.list.mockReturnValue({ autoPagingToArray: jest.fn().mockResolvedValue([subscription('past_due', 'open')]) });
    expect(await s.service.checkout(user)).toBe('https://billing.stripe.com/portal');
    expect(s.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('uses only the server-configured monthly plan at checkout', async () => {
    const s = setup();
    await s.service.checkout(user);
    expect(s.stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'subscription', customer: 'cus_7', line_items: [{ price: 'price_10', quantity: 1 }],
      success_url: 'https://example.com/billing?returned=1',
    }), expect.anything());
  });

  it('refuses parallel checkout while another instance owns the lock', async () => {
    const s = setup();
    s.bars.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as never);
    await expect(s.service.checkout(user)).rejects.toThrow('actualizando');
    expect(s.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('rejects a price that is not exactly 10 EUR monthly', async () => {
    const s = setup();
    s.stripe.prices.retrieve.mockResolvedValue({ active: true, unit_amount: 2000, currency: 'eur', recurring: { interval: 'month', interval_count: 1 } });
    await expect(s.service.checkout(user)).rejects.toThrow('10 EUR');
    expect(s.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('does not grant access for a paid subscription using another plan', async () => {
    const s = setup();
    const sub = subscription();
    sub.items.data[0].price.id = 'another_plan';
    s.stripe.subscriptions.list.mockReturnValue({ autoPagingToArray: jest.fn().mockResolvedValue([sub]) });
    await s.service.sync(7);
    const update = s.bars.updateOne.mock.calls.find(([, change]) => change.$set)?.[1].$set;
    expect(update.paidUntil.getTime()).toBe(0);
  });
});
