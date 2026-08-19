import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoginFailedException } from '../exceptions/login-failed.exception';

@Catch(UnauthorizedException, ForbiddenException)
export class AuthRedirectFilter implements ExceptionFilter {
  catch(
    exception: UnauthorizedException | ForbiddenException,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof LoginFailedException) {
      response.redirect('/login?error=1');
      return;
    }

    if (exception instanceof UnauthorizedException) {
      response.redirect('/login');
      return;
    }

    response.status(403);
    if (request.accepts('html')) {
      response.render('error', {
        title: 'Acceso denegado',
        message: 'No tienes permiso para acceder a esta página.',
      });
      return;
    }
    response.json({ statusCode: 403, message: exception.message });
  }
}
