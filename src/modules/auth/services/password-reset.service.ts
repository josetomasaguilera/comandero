import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { isEmail } from 'class-validator';
import { UsersService } from '../../users/services/users/users.service';
import { PasswordResetMailService } from './password-reset-mail.service';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  constructor(
    private readonly users: UsersService,
    private readonly mail: PasswordResetMailService,
  ) {}

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async request(username: unknown, email: unknown) {
    if (typeof username !== 'string' || typeof email !== 'string') return;
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (
      !normalizedUsername ||
      normalizedUsername.length > 100 ||
      !isEmail(normalizedEmail)
    )
      return;
    const token = randomBytes(32).toString('hex');
    const hash = this.hash(token);
    try {
      const url = this.mail.resetUrl(token);
      const user = await this.users.issuePasswordReset(
        normalizedUsername,
        normalizedEmail,
        hash,
        new Date(),
      );
      if (!user) return;
      try {
        await this.mail.send(user.email!, url);
      } catch {
        await this.users.clearPasswordReset(hash);
        this.logger.error(
          'No se ha podido enviar el correo de recuperación. Revisa la configuración SMTP.',
        );
      }
    } catch {
      // Do not disclose accounts, reset tokens or SMTP credentials in responses/logs.
      this.logger.error(
        'No se ha podido procesar la recuperación de contraseña. Revisa APP_URL, SMTP y la base de datos.',
      );
    }
  }

  async valid(token: unknown): Promise<boolean> {
    return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
      ? this.users.hasPasswordReset(this.hash(token))
      : false;
  }

  async reset(token: unknown, password: unknown, confirmation: unknown) {
    if (!(await this.valid(token))) return 'token';
    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72
    )
      return 'password';
    if (password !== confirmation) return 'confirmation';
    const passwordHash = await bcrypt.hash(password, 10);
    return (await this.users.consumePasswordReset(
      this.hash(token as string),
      passwordHash,
    ))
      ? null
      : 'token';
  }
}
