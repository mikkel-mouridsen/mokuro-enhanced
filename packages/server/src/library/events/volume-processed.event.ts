import { Volume } from '../entities/volume.entity';

export class VolumeProcessedEvent {
  constructor(
    public readonly volume: Volume,
    public readonly success: boolean,
    public readonly error?: string,
  ) {}
}

