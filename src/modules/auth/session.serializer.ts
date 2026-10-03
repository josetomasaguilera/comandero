import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { UsersService } from '../users/services/users/users.service';
import { User } from '../users/entities/user.schema';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  serializeUser(
    user: User,
    done: (err: Error | null, value: { id: number; version: number }) => void,
  ) {
    done(null, { id: user.id, version: user.sessionVersion ?? 0 });
  }

  async deserializeUser(
    value: number | { id: number; version: number },
    done: (err: Error | null, user: User | null) => void,
  ) {
    const id = typeof value === 'number' ? value : value.id;
    const version = typeof value === 'number' ? 0 : value.version;
    try {
      const user = await this.usersService.findById(id);
      done(null, user && (user.sessionVersion ?? 0) === version ? user : null);
    } catch (error) {
      done(error as Error, null);
    }
  }
}
