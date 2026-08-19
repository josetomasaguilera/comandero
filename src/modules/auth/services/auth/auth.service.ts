import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../../users/services/users/users.service';
import { User } from '../../../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      return null;
    }
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    return passwordMatches ? user : null;
  }

  homeRouteForRole(role: User['role']): string {
    switch (role) {
      case 'waiter':
        return '/tables';
      case 'kitchen':
        return '/kitchen';
      case 'admin':
        return '/admin';
    }
  }
}
