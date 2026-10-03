import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './services/auth/auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { SessionSerializer } from './session.serializer';
import { AuthController } from './controllers/auth/auth.controller';
import { BarsModule } from '../bars/bars.module';
import { PasswordResetController } from './controllers/password-reset.controller';
import { PasswordResetService } from './services/password-reset.service';
import { PasswordResetMailService } from './services/password-reset-mail.service';

@Module({
  imports: [UsersModule, BarsModule, PassportModule.register({ session: true })],
  controllers: [AuthController, PasswordResetController],
  providers: [AuthService, LocalStrategy, SessionSerializer, PasswordResetService, PasswordResetMailService],
  exports: [AuthService],
})
export class AuthModule {}
