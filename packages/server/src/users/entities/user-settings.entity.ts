import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum DeviceProfile {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
}

export interface ReaderSettingsData {
  // Display settings
  darkMode: boolean;
  pageLayout: 'single' | 'double';
  readingDirection: 'ltr' | 'rtl';
  backgroundColor: string;
  zoom: number;
  autoFullscreen: boolean;
  
  // OCR settings
  displayOCR: boolean;
  textBoxBorders: boolean;
  editableText: boolean;
  toggleOCRTextBoxes: boolean;
  fontSize: string | number;
  
  // Reading settings
  hasCover: boolean;
  defaultZoomMode: 'fit-to-screen' | 'fit-to-width' | 'original' | 'keep-level';
  eInkMode: boolean;
  ctrlToPan: boolean;
}

@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: DeviceProfile,
  })
  profile: DeviceProfile;

  @Column({ type: 'jsonb' })
  settings: ReaderSettingsData;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

