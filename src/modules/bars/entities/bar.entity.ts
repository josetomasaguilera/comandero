import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Bar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ default: false })
  voiceOrderingEnabled: boolean;
}
