import { PasswordResetController } from './password-reset.controller';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  InjectConnection: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ virtual: jest.fn() }) },
}));

describe('Password recovery pages', () => {
  const setup = () => {
    const service = {
      request: jest.fn(),
      valid: jest.fn().mockResolvedValue(false),
      reset: jest.fn().mockResolvedValue(null),
    };
    const res = {
      set: jest.fn(),
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
      redirect: jest.fn(),
    };
    return {
      service,
      res,
      controller: new PasswordResetController(service as never),
    };
  };

  it('shows a generic response to a reset request', async () => {
    const { controller, res } = setup();
    await controller.request(
      { username: 'missing', email: 'user@example.com' },
      res as never,
    );
    expect(res.render).toHaveBeenCalledWith(
      'forgot-password',
      expect.objectContaining({ sent: true }),
    );
  });

  it('hides the form for expired or malformed tokens and prevents caching/leaking the URL', async () => {
    const { controller, res } = setup();
    await controller.pageReset('invalid', res as never);
    expect(res.set).toHaveBeenCalledWith({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });
    expect(res.render).toHaveBeenCalledWith(
      'reset-password',
      expect.objectContaining({ invalid: true, token: '' }),
    );
  });

  it('redirects to login on success and preserves a valid token on validation failure', async () => {
    const { controller, service, res } = setup();
    await controller.reset(
      {
        token: 'token',
        password: 'password123',
        passwordConfirmation: 'password123',
      },
      res as never,
    );
    expect(res.redirect).toHaveBeenCalledWith(303, '/login?reset=success');
    service.reset.mockResolvedValue('confirmation' as never);
    await controller.reset({ token: 'token' }, res as never);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(
      'reset-password',
      expect.objectContaining({
        token: 'token',
        error: 'Las contraseñas no coinciden.',
      }),
    );
  });
});
