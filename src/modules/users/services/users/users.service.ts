import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../entities/user.schema';
import { IdGeneratorService } from '../../../database/id-generator.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly usersRepository: Model<User>,
    private readonly ids: IdGeneratorService,
  ) {}

  findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ username }).populate('bar').exec();
  }

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ id }).populate('bar').exec();
  }

  async create(user: Partial<User>): Promise<User> {
    return this.usersRepository.create({ ...user, id: await this.ids.next('users') });
  }
}
