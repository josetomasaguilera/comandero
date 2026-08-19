import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Bar } from '../../bars/entities/bar.entity';

export type CategoryDestination = 'cocina' | 'barra';

@Entity()
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: 0 })
  order: number;

  @Column({ type: 'varchar' })
  destination: CategoryDestination;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @ManyToOne(() => Bar, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'barId' })
  bar: Bar | null;

  @Column({ nullable: true })
  barId: number | null;
}
