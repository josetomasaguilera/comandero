import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import hbs = require('hbs');
import session from 'express-session';
import passport = require('passport');
import MongoStore from 'connect-mongo';
import { Request, Response, NextFunction } from 'express';
import { AuthRedirectFilter } from './modules/auth/filters/auth-redirect.filter';
import { User } from './modules/users/entities/user.schema';
import { setSessionMiddleware } from './common/session-middleware';

hbs.registerHelper('eq', (a: unknown, b: unknown) => a === b);
hbs.registerHelper('formatPrice', (value: string | number) =>
  Number(value).toFixed(2).replace('.', ',') + ' €',
);
hbs.registerHelper('total', (items: { product?: { price?: string }; quantity: number }[]) => {
  const total = (items ?? []).reduce(
    (sum, item) => sum + Number(item.product?.price ?? 0) * item.quantity,
    0,
  );
  return total.toFixed(2).replace('.', ',') + ' €';
});

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.setBaseViewsDir(join(__dirname, 'views'));
  app.setViewEngine('hbs');
  app.useStaticAssets(join(__dirname, 'public'));

  hbs.registerPartials(join(__dirname, 'views', 'partials'));

  const sessionMiddleware = session({
    store: MongoStore.create({ mongoUrl: config.getOrThrow<string>('MONGODB_URI'), dbName: config.get<string>('MONGODB_DB') || undefined }),
    secret: config.get<string>('SESSION_SECRET') ?? 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 12 },
  });
  setSessionMiddleware(sessionMiddleware);
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.currentUser = req.user ?? null;
    res.locals.currentBar = (req.user as User | undefined)?.bar ?? null;
    next();
  });

  app.useGlobalFilters(new AuthRedirectFilter());

  await app.listen(config.get<number>('PORT') ?? 3002);
}
bootstrap();
