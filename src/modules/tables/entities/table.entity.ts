import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}
