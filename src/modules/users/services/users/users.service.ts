import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isEmail } from 'class-validator';
import * as bcrypt from 'bcrypt';
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

  listForBar(barId: number) {
    return this.usersRepository.find({ barId }).select('-passwordHash').sort({ username: 1 }).lean().exec();
  }

  async getForBar(id: number, barId: number) {
    const user = await this.usersRepository.findOne({ id, barId }).select('-passwordHash').lean().exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async saveForBar(barId: number, actorId: number, body: Record<string, unknown>, id?: number) {
    if (id !== undefined) await this.getForBar(id, barId);
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role = body.role;
    if (!username || username.length > 100) throw new BadRequestException('Introduce un usuario de hasta 100 caracteres.');
    if (email && !isEmail(email)) throw new BadRequestException('Introduce un email válido.');
    if (role !== 'admin' && role !== 'waiter' && role !== 'kitchen') throw new BadRequestException('Selecciona un rol válido.');
    if (id === actorId && role !== 'admin') throw new BadRequestException('No puedes quitarte el rol de administrador.');
    if ((id === undefined || password) && (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72)) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres y como máximo 72 bytes.');
    }
    if (password && password !== body.passwordConfirmation) throw new BadRequestException('Las contraseñas no coinciden.');
    const data: Partial<User> = { username, email, role, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) };
    try {
      if (id === undefined) {
        await this.usersRepository.create({ ...data, barId, id: await this.ids.next('users') });
      } else {
        const result = await this.usersRepository.updateOne({ id, barId }, { $set: data }, { runValidators: true }).exec();
        if (!result.matchedCount) throw new NotFoundException('Usuario no encontrado');
      }
    } catch (error) {
      if (error?.code === 11000) throw new ConflictException('Ese nombre de usuario ya está en uso.');
      throw error;
    }
  }

  async removeForBar(id: number, barId: number, actorId: number) {
    if (id === actorId) throw new BadRequestException('No puedes eliminar tu propia cuenta.');
    const result = await this.usersRepository.deleteOne({ id, barId }).exec();
    if (!result.deletedCount) throw new NotFoundException('Usuario no encontrado');
  }
}
