import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PasswordResetService } from '../services/password-reset.service';

@Controller()
export class PasswordResetController {
  constructor(private readonly resetService: PasswordResetService) {}

  @Get('/forgot-password')
  page(@Res() res: Response) {
    res.set('Cache-Control', 'no-store');
    return res.render('forgot-password', { title: 'Recuperar contraseña' });
  }

  @Post('/forgot-password')
  async request(@Body() body: Record<string, unknown>, @Res() res: Response) {
    await this.resetService.request(body.username, body.email);
    res.set('Cache-Control', 'no-store');
    return res.render('forgot-password', {
      title: 'Recuperar contraseña',
      sent: true,
    });
  }

  @Get('/reset-password')
  async pageReset(@Query('token') token: unknown, @Res() res: Response) {
    const valid = await this.resetService.valid(token);
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    return res.render('reset-password', {
      title: 'Nueva contraseña',
      token: valid ? token : '',
      invalid: !valid,
    });
  }

  @Post('/reset-password')
  async reset(@Body() body: Record<string, unknown>, @Res() res: Response) {
    const error = await this.resetService.reset(
      body.token,
      body.password,
      body.passwordConfirmation,
    );
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    if (!error) return res.redirect(303, '/login?reset=success');
    return res.status(400).render('reset-password', {
      title: 'Nueva contraseña',
      invalid: error === 'token',
      token: error === 'token' ? '' : body.token,
      error:
        error === 'password'
          ? 'La contraseña debe tener al menos 8 caracteres y como máximo 72 bytes.'
          : error === 'confirmation'
            ? 'Las contraseñas no coinciden.'
            : undefined,
    });
  }
}
