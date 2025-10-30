import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Volume } from './volume.entity';
import { User } from '../../users/entities/user.entity';

export enum MangaStatus {
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  HIATUS = 'hiatus',
  CANCELLED = 'cancelled',
}

@Entity('manga')
export class Manga {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  author: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  coverUrl: string;

  @Column({
    type: 'enum',
    enum: MangaStatus,
    default: MangaStatus.ONGOING,
  })
  status: MangaStatus;

  @Column({ default: 0 })
  volumeCount: number;

  @Column({ default: 0 })
  unreadCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRead: Date;

  @ManyToOne(() => User, (user) => user.manga, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Volume, (volume) => volume.manga, {
    cascade: true,
  })
  volumes: Volume[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

