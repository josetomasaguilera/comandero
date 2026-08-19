import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './modules/auth/services/auth/auth.service';
import { User } from './modules/users/entities/user.entity';

@Controller()
export class AppController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  root(@Req() req: Request, @Res() res: Response) {
    if (req.isAuthenticated()) {
      const user = req.user as User;
      return res.redirect(this.authService.homeRouteForRole(user.role));
    }
    return res.redirect('/login');
  }
}
