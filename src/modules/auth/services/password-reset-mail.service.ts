import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

@Injectable()
export class PasswordResetMailService {
  constructor(private readonly config: ConfigService) {}

  resetUrl(token: string) {
    const base = new URL(this.config.getOrThrow<string>('APP_URL'));
    if (
      !['http:', 'https:'].includes(base.protocol) ||
      base.username ||
      base.password
    ) {
      throw new Error('APP_URL debe ser una URL HTTP(S) sin credenciales');
    }
    const url = new URL('/reset-password', base);
    url.searchParams.set('token', token);
    // Validate required mail configuration before issuing a token.
    this.config.getOrThrow<string>('SMTP_HOST');
    this.config.getOrThrow<string>('SMTP_FROM');
    return url.toString();
  }

  async send(email: string, url: string) {
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const secure =
      this.config.get<string>('SMTP_SECURE') === 'true' || port === 465;
    const user = this.config.get<string>('SMTP_USER');
    const transport = createTransport({
      host: this.config.getOrThrow<string>('SMTP_HOST'),
      port,
      secure,
      requireTLS: !secure,
      auth: user
        ? { user, pass: this.config.getOrThrow<string>('SMTP_PASSWORD') }
        : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    await transport.sendMail({
      from: this.config.getOrThrow<string>('SMTP_FROM'),
      to: { address: email, name: '' },
      subject: 'Recuperar tu contraseña de Comandero',
      text: `Para cambiar tu contraseña, abre este enlace:\n\n${url}\n\nCaduca en 30 minutos y solo se puede usar una vez. Si no has solicitado el cambio, ignora este correo.`,
    });
  }
}
