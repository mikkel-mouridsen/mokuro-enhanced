import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Volume } from './volume.entity';

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  volumeId: string;

  @Column()
  pageNumber: number; // 1-based page number

  @Column()
  imagePath: string; // Relative path to the image

  @Column({ nullable: true })
  imageUrl: string; // Full URL to access the image

  @Column({ type: 'jsonb', nullable: true })
  textBlocks: any; // OCR text blocks from mokuro

  @Column({ default: false })
  isRead: boolean;

  @ManyToOne(() => Volume, (volume) => volume.pages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'volumeId' })
  volume: Volume;

  @CreateDateColumn()
  createdAt: Date;
}

