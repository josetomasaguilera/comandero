import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { UsersService } from '../users/services/users/users.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  serializeUser(user: User, done: (err: Error | null, id: number) => void) {
    done(null, user.id);
  }

  async deserializeUser(
    id: number,
    done: (err: Error | null, user: User | null) => void,
  ) {
    const user = await this.usersService.findById(id);
    done(null, user);
  }
}
