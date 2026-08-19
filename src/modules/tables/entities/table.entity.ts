import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Bar } from '../../bars/entities/bar.entity';

export type TableZone = 'interior' | 'terraza_a' | 'terraza_b';
export type TableStatus = 'libre' | 'reservada' | 'ocupada';

@Entity()
export class Table {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'varchar' })
  zone: TableZone;

  @Column({ type: 'varchar', default: 'libre' })
  status: TableStatus;

  @ManyToOne(() => Bar, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'barId' })
  bar: Bar | null;

  @Column({ nullable: true })
  barId: number | null;
}
