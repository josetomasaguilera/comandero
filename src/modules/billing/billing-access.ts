export const TRIAL_DAYS = 30;

export interface BillingAccessRecord {
  billingExempt?: boolean;
  trialEndsAt?: Date | null;
  paidUntil?: Date | null;
  subscriptionStatus?: string;
}

export function billingAccess(bar: BillingAccessRecord, now = Date.now()) {
  const exempt = bar.billingExempt === true;
  const trial = !!bar.trialEndsAt && new Date(bar.trialEndsAt).getTime() > now;
  const paid = bar.subscriptionStatus === 'active' && !!bar.paidUntil && new Date(bar.paidUntil).getTime() > now;
  return {
    allowed: exempt || trial || paid,
    exempt,
    trial: !exempt && trial,
    paid: !exempt && paid,
    daysLeft: trial ? Math.ceil((new Date(bar.trialEndsAt!).getTime() - now) / 86400000) : 0,
  };
}
