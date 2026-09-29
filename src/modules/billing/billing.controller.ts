import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, HttpException, Post, RawBodyRequest, Req, Res, UseGuards } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { BillingService } from './billing.service';
import { billingAccess } from './billing-access';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../users/entities/user.schema';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  private token(req: Request) {
    const session = req.session as typeof req.session & { billingCsrf?: string };
    return session.billingCsrf ??= randomUUID();
  }

  private verifyToken(req: Request, token: unknown) {
    if (typeof token !== 'string' || token !== this.token(req)) throw new ForbiddenException('Formulario caducado. Recarga la página.');
  }

  private async page(req: Request, res: Response, error?: string, status = 200) {
    const user = req.user as User;
    const bar = await this.billing.getBar(user.barId);
    const access = billingAccess(bar);
    res.status(status).render('billing/index', {
      title: 'Suscripción', ...access, error,
      isAdmin: user.role === 'admin', configured: this.billing.configured(),
      canSubscribe: !access.exempt && !access.trial && !access.paid,
      hasCustomer: !access.exempt && !!bar.stripeCustomerId,
      cancelAtPeriodEnd: bar.cancelAtPeriodEnd,
      trialEnd: bar.trialEndsAt?.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' }),
      paidUntil: access.paid ? bar.paidUntil?.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' }) : '',
      csrf: this.token(req),
      returned: req.query.returned === '1' && !access.paid,
      cancelled: req.query.cancelled === '1',
    });
  }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const bar = await this.billing.getBar(user.barId);
    let error: string | undefined;
    if (user.role === 'admin' && !bar.billingExempt && bar.stripeCustomerId && this.billing.configured()) {
      try { await this.billing.sync(bar.id); }
      catch { error = 'No se ha podido actualizar el estado del pago. Vuelve a consultar esta página en unos segundos.'; }
    }
    return this.page(req, res, error);
  }

  @Post('checkout')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles('admin')
  async checkout(@Body('csrf') token: unknown, @Req() req: Request, @Res() res: Response) {
    this.verifyToken(req, token);
    try { res.redirect(303, await this.billing.checkout(req.user as User)); }
    catch (error) {
      return this.page(req, res, error instanceof HttpException ? error.message : 'No se ha podido abrir el pago. Vuelve a intentarlo.', error instanceof HttpException ? error.getStatus() : 503);
    }
  }

  @Post('portal')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles('admin')
  async portal(@Body('csrf') token: unknown, @Req() req: Request, @Res() res: Response) {
    this.verifyToken(req, token);
    try { res.redirect(303, await this.billing.portal((req.user as User).barId)); }
    catch { return this.page(req, res, 'No se ha podido abrir la gestión de pagos. Vuelve a intentarlo.', 503); }
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string) {
    await this.billing.webhook(req.rawBody, signature);
    return { received: true };
  }
}
