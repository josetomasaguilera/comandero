import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}
