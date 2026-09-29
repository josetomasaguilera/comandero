import { BillingController } from './billing.controller';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined, Prop: () => () => undefined, Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ virtual: jest.fn() }) },
}));

describe('Billing controller', () => {
  it('requires the admin role for both payment actions', () => {
    expect(Reflect.getMetadata(ROLES_KEY, BillingController.prototype.checkout)).toEqual(['admin']);
    expect(Reflect.getMetadata(ROLES_KEY, BillingController.prototype.portal)).toEqual(['admin']);
  });
  it('rejects payment forms without the session token', async () => {
    const service = { checkout: jest.fn(), portal: jest.fn() };
    const controller = new BillingController(service as never);
    const req = { session: { billingCsrf: 'expected' }, user: { id: 2, barId: 7, role: 'admin' } };
    await expect(controller.checkout('wrong', req as never, {} as never)).rejects.toThrow();
    await expect(controller.portal(undefined, req as never, {} as never)).rejects.toThrow();
    expect(service.checkout).not.toHaveBeenCalled();
    expect(service.portal).not.toHaveBeenCalled();
  });
  it('uses the authenticated bar rather than a submitted bar ID', async () => {
    const service = { portal: jest.fn().mockResolvedValue('https://billing.stripe.com/test') };
    const controller = new BillingController(service as never);
    const req = { session: { billingCsrf: 'expected' }, user: { id: 2, barId: 7, role: 'admin' }, body: { barId: 999 } };
    const res = { redirect: jest.fn() };
    await controller.portal('expected', req as never, res as never);
    expect(service.portal).toHaveBeenCalledWith(7);
    expect(res.redirect).toHaveBeenCalledWith(303, 'https://billing.stripe.com/test');
  });
});
