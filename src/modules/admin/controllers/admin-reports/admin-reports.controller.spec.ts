import { ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { AdminReportsController } from './admin-reports.controller';
import { AuthenticatedGuard } from '../../../auth/guards/authenticated.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ virtual: jest.fn() }) },
}));

describe('Admin reports', () => {
  it('requires an authenticated administrator', () => {
    expect(Reflect.getMetadata('__guards__', AdminReportsController)).toEqual([AuthenticatedGuard, RolesGuard]);
    expect(Reflect.getMetadata('roles', AdminReportsController)).toEqual(['admin']);
  });

  it('shows the report menu without querying sales', () => {
    const reports = { monthly: jest.fn() };
    const controller = new AdminReportsController(reports as never);
    expect(controller.index({ user: { barId: 7 } } as unknown as Request)).toEqual({ title: 'Listados de ventas' });
    expect(reports.monthly).not.toHaveBeenCalled();
  });

  it.each(['daily', 'products'] as const)('passes the session bar and selected month to %s', async (report) => {
    const reports = { monthly: jest.fn().mockResolvedValue({ totalCents: 100 }) };
    const controller = new AdminReportsController(reports as never);
    expect(await controller[report]({ user: { barId: 7 } } as unknown as Request, '2024-02')).toMatchObject({ totalCents: 100, reportPath: `/admin/reports/${report}`, daily: report === 'daily' });
    expect(reports.monthly).toHaveBeenCalledWith(7, '2024-02');
  });

  it('rejects users without a bar before querying sales', async () => {
    const reports = { monthly: jest.fn() };
    const controller = new AdminReportsController(reports as never);
    expect(() => controller.index({ user: {} } as Request)).toThrow(ForbiddenException);
    await expect(controller.daily({ user: {} } as Request)).rejects.toThrow(ForbiddenException);
    await expect(controller.products({ user: {} } as Request)).rejects.toThrow(ForbiddenException);
    expect(reports.monthly).not.toHaveBeenCalled();
  });
});
