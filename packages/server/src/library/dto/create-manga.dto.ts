import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import { MangaStatus } from '../entities/manga.entity';

export class CreateMangaDto {
  @ApiHideProperty() // Don't expose in API, will be set from JWT token
  userId?: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: MangaStatus, required: false })
  @IsEnum(MangaStatus)
  @IsOptional()
  status?: MangaStatus;
}

