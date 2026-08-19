import {
  Controller,
  Get,
  Post,
  Render,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '../../services/auth/auth.service';
import { User } from '../../../users/entities/user.entity';
import { LocalAuthGuard } from '../../guards/local-auth.guard';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('/login')
  @Render('login')
  loginPage(@Req() req: Request) {
    if (req.isAuthenticated()) {
      const user = req.user as User;
      return { redirectTo: this.authService.homeRouteForRole(user.role) };
    }
    return { title: 'Iniciar sesión', error: req.query.error };
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
