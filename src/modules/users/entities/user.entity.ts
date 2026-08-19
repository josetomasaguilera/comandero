import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Bar } from '../../bars/entities/bar.entity';

export type UserRole = 'admin' | 'waiter' | 'kitchen';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar' })
  role: UserRole;

  @ManyToOne(() => Bar, { eager: true, nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'barId' })
  bar: Bar | null;

  @Column({ nullable: true })
  barId: number | null;
}
