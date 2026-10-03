import { NextFunction, Request, Response } from 'express';
import { BillingService } from './billing.service';
import { User } from '../users/entities/user.schema';

export function subscriptionMiddleware(billing: BillingService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || ['/login', '/register', '/logout', '/forgot-password', '/reset-password', '/'].includes(req.path)
      || req.path === '/billing' || req.path.startsWith('/billing/')) return next();
    try {
      const access = await billing.access((req.user as User).barId);
      if (access.allowed) return next();
      if (req.method === 'GET' && req.accepts('html')) {
        res.redirect('/billing');
      } else if (req.is('application/x-www-form-urlencoded') && req.accepts('html')) {
        res.redirect(303, '/billing');
      } else {
        res.status(402).json({ message: 'El bar necesita una suscripción activa.', subscriptionUrl: '/billing' });
      }
    } catch (error) { next(error); }
  };
}
