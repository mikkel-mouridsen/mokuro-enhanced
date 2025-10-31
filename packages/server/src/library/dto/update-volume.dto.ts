import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVolumeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  volumeNumber?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coverUrl?: string;
}

export class MoveVolumeDto {
  @ApiProperty({ description: 'Target manga ID to move volume to' })
  @IsString()
  targetMangaId: string;

  @ApiProperty({ required: false, description: 'New volume number in target manga' })
  @IsOptional()
  @IsNumber()
  newVolumeNumber?: number;
}

