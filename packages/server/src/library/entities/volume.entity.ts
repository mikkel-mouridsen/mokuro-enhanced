import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Manga } from './manga.entity';
import { Page } from './page.entity';

export enum VolumeStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('volumes')
export class Volume {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  mangaId: string;

  @Column()
  volumeNumber: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  coverUrl: string;

  @Column({
    type: 'enum',
    enum: VolumeStatus,
    default: VolumeStatus.UPLOADED,
  })
  status: VolumeStatus;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'float', default: 0 })
  progress: number; // 0-100

  @Column({ default: 0 })
  pageCount: number;

  @Column({ nullable: true })
  storagePath: string; // Path to the volume folder in storage

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // Store mokuro metadata

  @ManyToOne(() => Manga, (manga) => manga.volumes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'mangaId' })
  manga: Manga;

  @OneToMany(() => Page, (page) => page.volume, {
    cascade: true,
  })
  pages: Page[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

