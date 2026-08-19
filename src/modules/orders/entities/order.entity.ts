import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Table } from '../../tables/entities/table.entity';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

export type OrderStatus = 'abierto' | 'cerrado';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Table, { eager: true })
  @JoinColumn({ name: 'tableId' })
  table: Table;

  @Column()
  tableId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'waiterId' })
  waiter: User;

  @Column()
  waiterId: number;

  @Column({ type: 'varchar', default: 'abierto' })
  status: OrderStatus;

  @OneToMany(() => OrderItem, (item) => item.order, { eager: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date | null;
}
