import {
  Body,
  Controller,
  ConflictException,
  Get,
  Post,
  Render,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { AuthService } from '../../services/auth/auth.service';
import { User } from '../../../users/entities/user.entity';
import { LocalAuthGuard } from '../../guards/local-auth.guard';
import { BarsService } from '../../../bars/services/bars/bars.service';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly barsService: BarsService,
  ) {}

  @Get('/login')
  @Render('login')
  loginPage(@Req() req: Request) {
    if (req.isAuthenticated()) {
      const user = req.user as User;
      return { redirectTo: this.authService.homeRouteForRole(user.role) };
    }
    return { title: 'Iniciar sesión', error: req.query.error };
  }

  @Get('/register')
  @Render('register')
  registerPage(@Req() req: Request) {
    if (req.isAuthenticated()) {
      const user = req.user as User;
      return { redirectTo: this.authService.homeRouteForRole(user.role) };
    }
    const errors: Record<string, string> = {
      fields: 'Completa todos los campos.',
      password: 'La contraseña debe tener al menos 8 caracteres.',
      confirmation: 'Las contraseñas no coinciden.',
      exists: 'El nombre del bar o el usuario ya están en uso.',
    };
    const errorCode = typeof req.query.error === 'string' ? req.query.error : '';
    return { title: 'Crear mi bar', error: errors[errorCode] };
  }

  @Post('/register')
  async register(
    @Body()
    body: {
      barName?: string;
      username?: string;
      password?: string;
      passwordConfirmation?: string;
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const barName = body.barName?.trim();
    const username = body.username?.trim();
    if (!barName || !username || !body.password) {
      res.redirect('/register?error=fields');
      return;
    }
    if (body.password.length < 8) {
      res.redirect('/register?error=password');
      return;
    }
    if (body.password !== body.passwordConfirmation) {
      res.redirect('/register?error=confirmation');
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    let user: User;
    try {
      user = await this.barsService.createBarWithAdmin(
        barName,
        username,
        passwordHash,
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        res.redirect('/register?error=exists');
        return;
      }
      throw error;
    }
    req.logIn(user, (err) => {
      if (err) throw err;
      res.redirect('/admin');
    });
  }

  @UseGuards(LocalAuthGuard)
  @Post('/login')
  login(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    req.logIn(user, (err) => {
      if (err) {
        throw err;
      }
      res.redirect(this.authService.homeRouteForRole(user.role));
    });
  }

  @Post('/logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.logout(() => {
      res.redirect('/login');
    });
  }
}
