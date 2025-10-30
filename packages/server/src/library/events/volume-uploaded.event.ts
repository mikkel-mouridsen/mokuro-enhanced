import { Volume } from '../entities/volume.entity';

export class VolumeUploadedEvent {
  constructor(
    public readonly volume: Volume,
    public readonly filePath: string,
  ) {}
}

