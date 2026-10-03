import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PasswordResetService } from './password-reset.service';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  InjectConnection: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ virtual: jest.fn() }) },
}));

describe('Password recovery', () => {
  const setup = () => {
    const users = {
      issuePasswordReset: jest
        .fn()
        .mockResolvedValue({ email: 'user@example.com' }),
      clearPasswordReset: jest.fn(),
      hasPasswordReset: jest.fn().mockResolvedValue(true),
      consumePasswordReset: jest.fn().mockResolvedValue(true),
    };
    const mail = {
      resetUrl: jest.fn(
        (token: string) => `https://example.com/reset-password?token=${token}`,
      ),
      send: jest.fn(),
    };
    return {
      users,
      mail,
      service: new PasswordResetService(users as never, mail as never),
    };
  };
  const token = 'a'.repeat(64);

  it('normalizes input, stores only a digest and emails the random token', async () => {
    const { service, users, mail } = setup();
    await service.request(' user ', ' USER@example.com ');
    const issuedToken = mail.resetUrl.mock.calls[0][0];
    expect(issuedToken).toMatch(/^[a-f0-9]{64}$/);
    expect(users.issuePasswordReset).toHaveBeenCalledWith(
      'user',
      'user@example.com',
      createHash('sha256').update(issuedToken).digest('hex'),
      expect.any(Date),
    );
    expect(mail.send).toHaveBeenCalledWith(
      'user@example.com',
      expect.stringContaining(issuedToken),
    );
  });

  it('does not disclose missing accounts or requests inside the cooldown', async () => {
    const { service, users, mail } = setup();
    users.issuePasswordReset.mockResolvedValue(null);
    await expect(
      service.request('user', 'user@example.com'),
    ).resolves.toBeUndefined();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('removes only the issued token when SMTP fails', async () => {
    const { service, users, mail } = setup();
    mail.send.mockRejectedValue(new Error('SMTP failure'));
    await expect(
      service.request('user', 'user@example.com'),
    ).resolves.toBeUndefined();
    expect(users.clearPasswordReset).toHaveBeenCalledWith(
      users.issuePasswordReset.mock.calls[0][2],
    );
  });

  it('rejects malformed input without accessing the database', async () => {
    const { service, users } = setup();
    await service.request({ $ne: null }, 'user@example.com');
    await service.request('user', 'invalid');
    expect(await service.valid(['a'])).toBe(false);
    expect(users.issuePasswordReset).not.toHaveBeenCalled();
    expect(users.hasPasswordReset).not.toHaveBeenCalled();
  });

  it('rejects expired tokens and invalid passwords', async () => {
    const { service, users } = setup();
    expect(await service.reset(token, 'short', 'short')).toBe('password');
    expect(await service.reset(token, 'é'.repeat(37), 'é'.repeat(37))).toBe(
      'password',
    );
    expect(await service.reset(token, 'password123', 'different')).toBe(
      'confirmation',
    );
    users.hasPasswordReset.mockResolvedValue(false);
    expect(await service.reset(token, 'password123', 'password123')).toBe(
      'token',
    );
    expect(users.consumePasswordReset).not.toHaveBeenCalled();
  });

  it('hashes the new password and rejects reuse or concurrent consumption', async () => {
    const { service, users } = setup();
    expect(
      await service.reset(token, 'new-password', 'new-password'),
    ).toBeNull();
    const hash = users.consumePasswordReset.mock.calls[0][1];
    expect(await bcrypt.compare('new-password', hash)).toBe(true);
    users.consumePasswordReset.mockResolvedValue(false);
    expect(await service.reset(token, 'new-password', 'new-password')).toBe(
      'token',
    );
  });
});
