import { subscriptionMiddleware } from './billing.middleware';

describe('Subscription gate', () => {
  const setup = (allowed = false) => {
    const billing = { access: jest.fn().mockResolvedValue({ allowed }) };
    const res = { redirect: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    const request = (path = '/tables', method = 'GET', html = true) => ({
      isAuthenticated: () => true, user: { barId: 7 }, path, method,
      accepts: () => html, is: () => false,
    });
    return { billing, res, next, request, middleware: subscriptionMiddleware(billing as never) };
  };
  it('redirects expired bars to billing', async () => {
    const s = setup();
    await s.middleware(s.request() as never, s.res as never, s.next);
    expect(s.billing.access).toHaveBeenCalledWith(7);
    expect(s.res.redirect).toHaveBeenCalledWith('/billing');
    expect(s.next).not.toHaveBeenCalled();
  });
  it('blocks write requests as well as pages', async () => {
    const s = setup();
    await s.middleware(s.request('/tables/1/order/items', 'POST', false) as never, s.res as never, s.next);
    expect(s.res.status).toHaveBeenCalledWith(402);
    expect(s.next).not.toHaveBeenCalled();
  });
  it('keeps billing, logout and login available', async () => {
    const s = setup();
    for (const path of ['/billing', '/billing/checkout', '/billing/webhook', '/logout', '/login']) {
      await s.middleware(s.request(path) as never, s.res as never, s.next);
    }
    expect(s.next).toHaveBeenCalledTimes(5);
    expect(s.billing.access).not.toHaveBeenCalled();
  });
  it('allows trial, paid or exempt bars', async () => {
    const s = setup(true);
    await s.middleware(s.request() as never, s.res as never, s.next);
    expect(s.next).toHaveBeenCalledWith();
  });
});
