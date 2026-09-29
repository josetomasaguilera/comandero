import { billingAccess } from './billing-access';

describe('Subscription access', () => {
  const now = Date.UTC(2026, 8, 25);
  it('keeps exempt bars accessible indefinitely', () => {
    expect(billingAccess({ billingExempt: true }, now).allowed).toBe(true);
  });
  it('ends the free trial exactly at its deadline', () => {
    const bar = { trialEndsAt: new Date(now) };
    expect(billingAccess(bar, now - 1).allowed).toBe(true);
    expect(billingAccess(bar, now).allowed).toBe(false);
  });
  it('requires both an active subscription and unexpired paid access', () => {
    expect(billingAccess({ subscriptionStatus: 'active', paidUntil: new Date(now + 1000) }, now).allowed).toBe(true);
    expect(billingAccess({ subscriptionStatus: 'active', paidUntil: new Date(now) }, now).allowed).toBe(false);
    for (const status of ['past_due', 'canceled', 'unpaid', 'incomplete', 'paused']) {
      expect(billingAccess({ subscriptionStatus: status, paidUntil: new Date(now + 1000) }, now).allowed).toBe(false);
    }
  });
  it('does not grant access to missing or invalid dates', () => {
    expect(billingAccess({}, now).allowed).toBe(false);
    expect(billingAccess({ trialEndsAt: new Date(NaN) }, now).allowed).toBe(false);
  });
});
