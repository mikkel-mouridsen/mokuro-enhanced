import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UploadVolumeDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  mangaId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  mangaTitle?: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsNumber()
  @IsOptional()
  volumeNumber?: number;
}

