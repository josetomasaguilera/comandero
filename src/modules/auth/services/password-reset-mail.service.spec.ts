import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { PasswordResetMailService } from './password-reset-mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('Recovery email', () => {
  const config = {
    APP_URL: 'https://comandero.example',
    SMTP_HOST: 'smtp.example',
    SMTP_FROM: 'Comandero <no-reply@example.com>',
    SMTP_USER: 'user',
    SMTP_PASSWORD: 'secret',
  };

  it('uses the configured origin and delivers a plain text link with STARTTLS', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    const service = new PasswordResetMailService(new ConfigService(config));
    const url = service.resetUrl('abc');
    expect(url).toBe('https://comandero.example/reset-password?token=abc');
    await service.send('recipient@example.com', url);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user: 'user', pass: 'secret' },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: { address: 'recipient@example.com', name: '' },
        text: expect.stringContaining(url),
      }),
    );
  });

  it('uses implicit TLS on port 465 and rejects non-HTTP URLs', async () => {
    (createTransport as jest.Mock).mockReturnValue({ sendMail: jest.fn() });
    await new PasswordResetMailService(
      new ConfigService({ ...config, SMTP_PORT: '465' }),
    ).send('recipient@example.com', 'https://example.com');
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 465, secure: true }),
    );
    const invalid = new PasswordResetMailService(
      new ConfigService({ ...config, APP_URL: 'javascript:alert(1)' }),
    );
    expect(() => invalid.resetUrl('abc')).toThrow('APP_URL');
  });
});
